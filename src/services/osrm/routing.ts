import type { LatLng, RouteOptions, Route, ElevationPoint } from '../../types'
import { nanoid } from '../../utils/nanoid'

const OSRM_BASE = 'https://router.project-osrm.org'
const VALHALLA_BASE = 'https://valhalla1.openstreetmap.de'

// ─── Polyline decoder (Valhalla uses precision=6) ────────────────────────────

function decodePolyline(encoded: string, precision = 6): LatLng[] {
  const factor = Math.pow(10, precision)
  const result: LatLng[] = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let shift = 0, val = 0, byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      val |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += val & 1 ? ~(val >> 1) : val >> 1

    shift = 0; val = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      val |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += val & 1 ? ~(val >> 1) : val >> 1

    result.push({ lat: lat / factor, lng: lng / factor })
  }
  return result
}

// ─── Valhalla routing (better highway avoidance) ─────────────────────────────

interface ValhallaTripResponse {
  trip: {
    legs: Array<{
      shape: string
      summary: { length: number; time: number }
    }>
    summary: { length: number; time: number }
  }
}

async function routeValhalla(
  waypoints: LatLng[],
  avoidHighways: boolean,
  avoidTolls: boolean
): Promise<{ geometry: LatLng[]; distanceKm: number; durationMin: number }> {
  const locations = waypoints.map((w) => ({ lon: w.lng, lat: w.lat, type: 'break' }))

  const body = {
    locations,
    costing: 'motorcycle',
    costing_options: {
      motorcycle: {
        use_highways: avoidHighways ? 0.0 : 0.8,
        use_tolls: avoidTolls ? 0.0 : 0.5,
        use_trails: 0.3,
      },
    },
    directions_options: { units: 'kilometers' },
  }

  const res = await fetch(`${VALHALLA_BASE}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err?.error ?? `Valhalla error ${res.status}`)
  }
  const data: ValhallaTripResponse = await res.json()
  const trip = data.trip

  // Concatenate all leg shapes
  const geometry: LatLng[] = trip.legs.flatMap((leg) => decodePolyline(leg.shape))
  const distanceKm = trip.summary.length
  const durationMin = trip.summary.time / 60

  return { geometry, distanceKm, durationMin }
}

// ─── OSRM fallback ───────────────────────────────────────────────────────────

interface OsrmResponse {
  code: string
  routes: Array<{
    geometry: { coordinates: [number, number][] }
    distance: number
    duration: number
  }>
}

async function routeOsrm(
  waypoints: LatLng[],
  avoidHighways: boolean
): Promise<{ geometry: LatLng[]; distanceKm: number; durationMin: number }> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';')
  const exclude = avoidHighways ? '&exclude=motorway' : ''
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson${exclude}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM error ${res.status}`)
  const data: OsrmResponse = await res.json()

  if (data.code !== 'Ok' || !data.routes.length) {
    throw new Error('No se encontró ruta entre estos puntos')
  }
  const route = data.routes[0]
  return {
    geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  }
}

// ─── Shared route builder ────────────────────────────────────────────────────

async function buildRoute(
  waypoints: LatLng[],
  opts: RouteOptions,
  name: string
): Promise<Route> {
  let result: { geometry: LatLng[]; distanceKm: number; durationMin: number }

  try {
    // Valhalla: proper motorcycle profile + highway cost model
    result = await routeValhalla(waypoints, opts.avoidHighways, opts.avoidTolls)
  } catch {
    // Fallback to OSRM if Valhalla is unavailable
    result = await routeOsrm(waypoints, opts.avoidHighways)
  }

  const elevationProfile: ElevationPoint[] = []
  return {
    id: nanoid(),
    name,
    waypoints: waypoints.map((pos, i) => ({ id: nanoid(), position: pos, label: `P${i + 1}` })),
    geometry: result.geometry,
    distanceKm: parseFloat(result.distanceKm.toFixed(1)),
    durationMin: parseFloat(result.durationMin.toFixed(0)),
    elevationProfile,
    elevationGainM: 0,
    options: opts,
    createdAt: new Date().toISOString(),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function calculateRouteOsrm(
  waypoints: LatLng[],
  opts: RouteOptions,
  name = 'Nueva ruta'
): Promise<Route> {
  return buildRoute(waypoints, opts, name)
}

export async function calculateRoundtripOsrm(
  origin: LatLng,
  opts: RouteOptions,
  name = 'Ruta circular'
): Promise<Route> {
  const distanceKm = opts.roundtrip?.distance ?? 100
  const direction = opts.roundtrip?.direction ?? 0

  const R = 6371
  const d = (distanceKm / 2) / R
  const lat1 = (origin.lat * Math.PI) / 180
  const lon1 = (origin.lng * Math.PI) / 180
  const brng = (direction * Math.PI) / 180

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng))
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  )
  const via: LatLng = {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lon2 * 180) / Math.PI + 540) % 360) - 180,
  }

  return buildRoute([origin, via, origin], opts, name)
}
