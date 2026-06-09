import type { LatLng, RouteOptions, Route, ElevationPoint } from '../../types'
import { nanoid } from '../../utils/nanoid'

const OSRM_BASE = 'https://router.project-osrm.org'

interface OsrmResponse {
  code: string
  routes: Array<{
    geometry: { coordinates: [number, number][] }
    legs: Array<{ distance: number; duration: number }>
    distance: number
    duration: number
  }>
}

export async function calculateRouteOsrm(
  waypoints: LatLng[],
  opts: RouteOptions,
  name = 'Nueva ruta'
): Promise<Route> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';')
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM error ${res.status}`)
  const data: OsrmResponse = await res.json()

  if (data.code !== 'Ok' || !data.routes.length) {
    throw new Error('No se encontró ruta entre estos puntos')
  }

  const route = data.routes[0]
  const geometry: LatLng[] = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
  const distanceKm = route.distance / 1000
  const durationMin = route.duration / 60
  const elevationProfile: ElevationPoint[] = []

  return {
    id: nanoid(),
    name,
    waypoints: waypoints.map((pos, i) => ({ id: nanoid(), position: pos, label: `P${i + 1}` })),
    geometry,
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    durationMin: parseFloat(durationMin.toFixed(0)),
    elevationProfile,
    elevationGainM: 0,
    options: opts,
    createdAt: new Date().toISOString(),
  }
}

export async function calculateRoundtripOsrm(
  origin: LatLng,
  opts: RouteOptions,
  name = 'Ruta circular'
): Promise<Route> {
  const distanceKm = opts.roundtrip?.distance ?? 100
  const direction = opts.roundtrip?.direction ?? 0

  // Generate a via-point in the desired direction at ~half the target distance
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

  return calculateRouteOsrm([origin, via, origin], opts, name)
}
