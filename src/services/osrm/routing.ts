import type { LatLng, RouteOptions, Route, ElevationPoint } from '../../types'
import { nanoid } from '../../utils/nanoid'

const OSRM_BASE = 'https://router.project-osrm.org'
const VALHALLA_BASE = 'https://valhalla1.openstreetmap.de'

// ─── Geo helpers ──────────────────────────────────────────────────────────────

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function bearing(a: LatLng, b: LatLng): number {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dL = ((b.lng - a.lng) * Math.PI) / 180
  return (
    (Math.atan2(
      Math.sin(dL) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dL),
    ) *
      180) /
    Math.PI +
    360
  ) % 360
}

function destination(from: LatLng, distKm: number, bearingDeg: number): LatLng {
  const R = 6371
  const d = distKm / R
  const lat1 = (from.lat * Math.PI) / 180
  const lon1 = (from.lng * Math.PI) / 180
  const b = (bearingDeg * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lon2 =
    lon1 +
    Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: (lat2 * 180) / Math.PI, lng: (((lon2 * 180) / Math.PI + 540) % 360) - 180 }
}

// ─── Highway detection ────────────────────────────────────────────────────────
//
// A segment is "highway-like" if the heading changes less than CURVE_THRESHOLD
// degrees per km over a WINDOW_KM stretch. Real secondary roads are curvier.

const CURVE_THRESHOLD = 4   // deg/km — below this = likely highway
const WINDOW_KM       = 8   // minimum straight run that triggers injection
const OFFSET_KM       = 7   // how far perpendicular to push the detour waypoint
const MAX_ITER        = 3   // maximum injection iterations

function detectHighwayMidpoints(geometry: LatLng[]): LatLng[] {
  const midpoints: LatLng[] = []
  const n = geometry.length
  if (n < 15) return midpoints

  // Slide a window through the geometry at ~2% steps
  const step = Math.max(1, Math.floor(n / 60))

  for (let i = 0; i + 10 < n; i += step) {
    const j = Math.min(i + 10, n - 1)
    const start = geometry[i]
    const end   = geometry[j]
    const mid   = geometry[Math.floor((i + j) / 2)]

    const distKm = haversineKm(start, end)
    if (distKm < WINDOW_KM) continue

    const b1 = bearing(start, mid)
    const b2 = bearing(mid, end)
    const delta = Math.abs(((b2 - b1 + 540) % 360) - 180)
    const curvePerKm = delta / distKm

    if (curvePerKm < CURVE_THRESHOLD) {
      // Straight enough to be a highway — record midpoint
      midpoints.push(mid)
    }
  }

  // Deduplicate: keep only midpoints > 10 km apart
  const filtered: LatLng[] = []
  for (const mp of midpoints) {
    if (filtered.every((p) => haversineKm(p, mp) > 10)) {
      filtered.push(mp)
    }
  }
  return filtered
}

// For each highway midpoint, build a perpendicular waypoint offset to the right
// (tries both sides; returns both so the caller can interleave them)
function perpendicularWaypoints(geometry: LatLng[], highwayMids: LatLng[]): LatLng[] {
  const result: LatLng[] = []
  for (const mid of highwayMids) {
    // Find nearest geometry index to get direction
    let nearest = 0
    let minDist = Infinity
    for (let i = 0; i < geometry.length; i++) {
      const d = haversineKm(mid, geometry[i])
      if (d < minDist) { minDist = d; nearest = i }
    }
    const before = geometry[Math.max(0, nearest - 5)]
    const after  = geometry[Math.min(geometry.length - 1, nearest + 5)]
    const dir    = bearing(before, after)

    // Try right side first, fall back to left
    result.push(destination(mid, OFFSET_KM, (dir + 90) % 360))
  }
  return result
}

// Insert perpendicular waypoints at the right positions between original waypoints
function buildWaypointList(
  original: LatLng[],
  geometry: LatLng[],
  extras: LatLng[],
): LatLng[] {
  if (extras.length === 0) return original

  // For each extra point, find which consecutive pair of original waypoints it
  // falls between (by closest geometry index).
  const geomIdxOf = (p: LatLng) => {
    let best = 0, bestD = Infinity
    for (let i = 0; i < geometry.length; i++) {
      const d = haversineKm(p, geometry[i])
      if (d < bestD) { bestD = d; best = i }
    }
    return best
  }

  const originalIdx = original.map((wp) => geomIdxOf(wp))
  const extraWithIdx = extras.map((wp) => ({ wp, idx: geomIdxOf(wp) }))

  // Build insertion map: for each gap between original[i] and original[i+1]
  const result: LatLng[] = [original[0]]
  for (let i = 0; i < original.length - 1; i++) {
    const lo = originalIdx[i]
    const hi = originalIdx[i + 1]
    const inRange = extraWithIdx
      .filter((e) => e.idx > lo && e.idx < hi)
      .sort((a, b) => a.idx - b.idx)
    for (const e of inRange) result.push(e.wp)
    result.push(original[i + 1])
  }
  return result
}

// ─── Polyline decoder (Valhalla precision=6) ──────────────────────────────────

function decodePolyline(encoded: string): LatLng[] {
  const factor = 1e6
  const out: LatLng[] = []
  let i = 0, lat = 0, lng = 0
  while (i < encoded.length) {
    let shift = 0, val = 0, byte: number
    do { byte = encoded.charCodeAt(i++) - 63; val |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    lat += val & 1 ? ~(val >> 1) : val >> 1
    shift = 0; val = 0
    do { byte = encoded.charCodeAt(i++) - 63; val |= (byte & 0x1f) << shift; shift += 5 } while (byte >= 0x20)
    lng += val & 1 ? ~(val >> 1) : val >> 1
    out.push({ lat: lat / factor, lng: lng / factor })
  }
  return out
}

// ─── Routing engines ──────────────────────────────────────────────────────────

interface RawRoute { geometry: LatLng[]; distanceKm: number; durationMin: number }

async function callValhalla(waypoints: LatLng[], avoidHighways: boolean, avoidTolls: boolean): Promise<RawRoute> {
  const locations = waypoints.map((w, i) => ({
    lon: w.lng, lat: w.lat,
    type: i === 0 || i === waypoints.length - 1 ? 'break' : 'through',
  }))
  const body = {
    locations,
    costing: 'motorcycle',
    costing_options: {
      motorcycle: {
        use_highways: avoidHighways ? 0.0 : 0.8,
        use_tolls:    avoidTolls   ? 0.0 : 0.5,
        use_trails: 0.2,
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
    throw new Error(err?.error ?? `Valhalla ${res.status}`)
  }
  const data = await res.json() as { trip: { legs: Array<{ shape: string }>; summary: { length: number; time: number } } }
  const geometry = data.trip.legs.flatMap((l) => decodePolyline(l.shape))
  return {
    geometry,
    distanceKm: data.trip.summary.length,
    durationMin: data.trip.summary.time / 60,
  }
}

async function callOsrm(waypoints: LatLng[], avoidHighways: boolean): Promise<RawRoute> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';')
  const exclude = avoidHighways ? '&exclude=motorway' : ''
  const res = await fetch(`${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson${exclude}`)
  if (!res.ok) throw new Error(`OSRM ${res.status}`)
  const data = await res.json() as { code: string; routes: Array<{ geometry: { coordinates: [number, number][] }; distance: number; duration: number }> }
  if (data.code !== 'Ok' || !data.routes.length) throw new Error('Sin ruta disponible')
  const r = data.routes[0]
  return {
    geometry: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
  }
}

async function routeOnce(waypoints: LatLng[], opts: RouteOptions): Promise<RawRoute> {
  try {
    return await callValhalla(waypoints, opts.avoidHighways, opts.avoidTolls)
  } catch {
    return callOsrm(waypoints, opts.avoidHighways)
  }
}

// ─── Iterative highway-free routing ──────────────────────────────────────────

async function routeAvoidingHighways(originalWps: LatLng[], opts: RouteOptions): Promise<RawRoute> {
  let wps = originalWps
  let best = await routeOnce(wps, opts)

  if (!opts.avoidHighways) return best

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const highwayMids = detectHighwayMidpoints(best.geometry)
    if (highwayMids.length === 0) break  // route is already highway-free

    const extras = perpendicularWaypoints(best.geometry, highwayMids)
    const newWps  = buildWaypointList(wps, best.geometry, extras)

    try {
      const candidate = await routeOnce(newWps, opts)
      // Accept the new route only if it didn't get absurdly long (3x original)
      if (candidate.distanceKm < best.distanceKm * 3) {
        best = candidate
        wps  = newWps
      } else {
        break
      }
    } catch {
      break
    }
  }
  return best
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function buildRoute(waypoints: LatLng[], opts: RouteOptions, name: string): Promise<Route> {
  const { geometry, distanceKm, durationMin } = await routeAvoidingHighways(waypoints, opts)
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

export async function calculateRouteOsrm(
  waypoints: LatLng[],
  opts: RouteOptions,
  name = 'Nueva ruta',
): Promise<Route> {
  return buildRoute(waypoints, opts, name)
}

export async function calculateRoundtripOsrm(
  origin: LatLng,
  opts: RouteOptions,
  name = 'Ruta circular',
): Promise<Route> {
  const distanceKm = opts.roundtrip?.distance ?? 100
  const dir = opts.roundtrip?.direction ?? 0
  const R = 6371
  const d = distanceKm / 2 / R
  const lat1 = (origin.lat * Math.PI) / 180
  const lon1 = (origin.lng * Math.PI) / 180
  const b = (dir * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  const via: LatLng = {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lon2 * 180) / Math.PI + 540) % 360) - 180,
  }
  return buildRoute([origin, via, origin], opts, name)
}
