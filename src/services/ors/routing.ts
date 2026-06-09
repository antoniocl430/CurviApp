import { orsPost, orsGet } from './client'
import type { LatLng, RouteOptions, ElevationPoint, Route } from '../../types'
import { nanoid } from '../../utils/nanoid'

interface OrsRouteResponse {
  features: Array<{
    geometry: { coordinates: [number, number, number?][] }
    properties: {
      summary: { distance: number; duration: number }
      segments: Array<{ steps: unknown[] }>
      extras?: {
        elevation?: { values: [number, number, number][] }
        waytype?: {
          values: [number, number, number][]
          summary: Array<{ value: number; distance: number; amount: number }>
        }
      }
    }
  }>
}

// ─── Geo helpers ────────────────────────────────────────────────────────────

function getBearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const x = Math.sin(dLng) * Math.cos(lat2)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360
}

function destinationPoint(start: LatLng, distanceKm: number, bearingDeg: number): LatLng {
  const R = 6371
  const d = distanceKm / R
  const lat1 = (start.lat * Math.PI) / 180
  const lon1 = (start.lng * Math.PI) / 180
  const brng = (bearingDeg * Math.PI) / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  )
  const lon2 =
    lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lon2 * 180) / Math.PI + 540) % 360) - 180,
  }
}

/**
 * Returns a point offset perpendicularly from the midpoint of [from → to].
 * side = 1 → right of route, side = -1 → left of route.
 * fraction controls offset as % of direct distance, clamped to 5–60 km.
 */
function perpendicularOffset(from: LatLng, to: LatLng, side: 1 | -1, fraction = 0.3): LatLng {
  const mid: LatLng = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 }
  const dLat = (to.lat - from.lat) * 111
  const dLng = (to.lng - from.lng) * 111 * Math.cos((from.lat * Math.PI) / 180)
  const directKm = Math.sqrt(dLat * dLat + dLng * dLng)
  const offsetKm = Math.min(60, Math.max(5, fraction * directKm))
  const forwardBearing = getBearing(from, to)
  const perpBearing = (forwardBearing + side * 90 + 360) % 360
  return destinationPoint(mid, offsetKm, perpBearing)
}

/**
 * Measures actual curvature: average angle change per geometry point (degrees/point).
 * Higher = more curvy.
 */
function curvatureScore(geometry: LatLng[]): number {
  if (geometry.length < 3) return 0
  let total = 0
  for (let i = 1; i < geometry.length - 1; i++) {
    const b1 = getBearing(geometry[i - 1], geometry[i])
    const b2 = getBearing(geometry[i], geometry[i + 1])
    total += Math.abs(((b2 - b1 + 540) % 360) - 180)
  }
  return total / (geometry.length - 2)
}

/**
 * Returns the % of the route that runs on state roads (ORS waytype=1).
 * ORS maps waytype 1 → motorway + trunk in OSM, covering autovías and autopistas
 * that avoid_features:"highways" misses when tagged as trunk instead of motorway.
 */
function stateRoadPercent(feature: OrsRouteResponse['features'][0]): number {
  const summary = feature.properties.extras?.waytype?.summary
  if (!summary) return 0
  return summary.find(e => e.value === 1)?.amount ?? 0
}

// ─── ORS request helpers ─────────────────────────────────────────────────────

function buildAvoidOptions(opts: RouteOptions) {
  const avoid: string[] = []
  if (opts.avoidHighways) avoid.push('highways')
  if (opts.avoidTolls)    avoid.push('tollways')
  return avoid.length ? { avoid_features: avoid } : {}
}

function curvinessToWeighting(curviness: number, avoidHighways = false) {
  // ORS green_factor range: -0.5 (avoid scenic) to 1.0 (strongly prefer scenic).
  // Highways are classified as non-green, so a positive value naturally
  // penalises them — reinforcing avoid_features: ["highways"].
  let greenFactor = -0.5 + curviness * 1.5  // full range: -0.5 → 1.0
  if (avoidHighways) {
    // A negative green factor actively prefers highway-like roads; when
    // the user wants to avoid highways, guarantee a positive bias.
    greenFactor = Math.max(0.8, greenFactor)
  }
  return { green: parseFloat(greenFactor.toFixed(2)) }
}


function pickByCurvature(
  features: OrsRouteResponse['features'],
  curviness: number,
  avoidHighways = false
): OrsRouteResponse['features'][0] {
  if (features.length === 1) return features[0]
  const scored = features.map((f) => {
    const geom = f.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    return { feature: f, curvature: curvatureScore(geom), highwayPct: stateRoadPercent(f) }
  })

  if (avoidHighways) {
    // Primary criterion: fewest state-road (motorway+trunk) kilometres.
    // When the difference is negligible (<5 %), fall back to curviness preference.
    scored.sort((a, b) => {
      const diff = a.highwayPct - b.highwayPct
      if (Math.abs(diff) > 5) return diff
      return curviness === 0 ? a.curvature - b.curvature : b.curvature - a.curvature
    })
    return scored[0].feature
  }

  scored.sort((a, b) => a.curvature - b.curvature)
  if (curviness === 0) return scored[0].feature
  if (curviness === 1) return scored[scored.length - 1].feature
  return scored[Math.floor((scored.length - 1) / 2)].feature
}

// ─── Route building ──────────────────────────────────────────────────────────

function decodeElevation(
  coordinates: [number, number, number?][],
  totalDistance: number
): ElevationPoint[] {
  if (!coordinates[0]?.[2]) return []
  const step = totalDistance / (coordinates.length - 1)
  return coordinates.map(([, , ele], i) => ({
    distance: parseFloat((i * step).toFixed(2)),
    elevation: ele ?? 0,
  }))
}

function calcElevationGain(points: ElevationPoint[]): number {
  return points.reduce((gain, p, i) => {
    if (i === 0) return gain
    const diff = p.elevation - points[i - 1].elevation
    return gain + (diff > 0 ? diff : 0)
  }, 0)
}

function featureToRoute(
  feature: OrsRouteResponse['features'][0],
  waypoints: LatLng[],
  opts: RouteOptions,
  name: string
): Route {
  const coords = feature.geometry.coordinates
  const { distance, duration } = feature.properties.summary
  const distanceKm = distance / 1000
  const durationMin = duration / 60
  const geometry: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }))
  const elevationProfile = decodeElevation(coords, distanceKm)
  return {
    id: nanoid(),
    name,
    waypoints: waypoints.map((pos, i) => ({ id: nanoid(), position: pos, label: `P${i + 1}` })),
    geometry,
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    durationMin: parseFloat(durationMin.toFixed(0)),
    elevationProfile,
    elevationGainM: Math.round(calcElevationGain(elevationProfile)),
    options: opts,
    createdAt: new Date().toISOString(),
  }
}

// Simple GET request — works on ORS free tier (same as API Playground)
async function orsRequestGet(start: LatLng, end: LatLng): Promise<OrsRouteResponse> {
  return orsGet<OrsRouteResponse>('/v2/directions/driving-car', {
    start: `${start.lng},${start.lat}`,
    end: `${end.lng},${end.lat}`,
  })
}

async function orsRequest(
  waypoints: LatLng[],
  opts: RouteOptions
): Promise<OrsRouteResponse> {
  // For simple 2-point routes, use GET (confirmed working in ORS Playground)
  if (waypoints.length === 2) {
    return orsRequestGet(waypoints[0], waypoints[1])
  }

  // For 3+ waypoints, use POST
  const coordinates = waypoints.map((w) => [w.lng, w.lat])
  const avoidOpts = buildAvoidOptions(opts)
  const body: Record<string, unknown> = {
    coordinates,
    elevation: true,
    ...(Object.keys(avoidOpts).length ? { options: avoidOpts } : {}),
  }
  return orsPost<OrsRouteResponse>('/v2/directions/driving-car/geojson', body)
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function calculateRoute(
  waypoints: LatLng[],
  opts: RouteOptions,
  name = 'Nueva ruta'
): Promise<Route> {
  // Circuit mode: close the loop by appending the origin at the end
  const routingWps = opts.mode === 'circuit' ? [...waypoints, waypoints[0]] : waypoints

  // When avoiding highways, use the enhanced strategy that tries perpendicular
  // via-points if the direct route still uses too many state roads.
  if (opts.avoidHighways) {
    return calculateHighwayAvoiding(routingWps, waypoints, opts, name)
  }

  // Enhanced curvy strategy only for simple A→B (non-circuit, exactly 2 points)
  if (opts.curviness === 1 && routingWps.length === 2) {
    return calculateCurvyEnhanced(routingWps[0], routingWps[1], opts, name)
  }
  const data = await orsRequest(routingWps, opts)
  const feature = pickByCurvature(data.features, opts.curviness, false)
  return featureToRoute(feature, waypoints, opts, name)
}

/**
 * Highway-avoiding strategy: fires the direct route first, then if state-road
 * usage exceeds 25 % it retries with perpendicular via-points on both sides of
 * each segment to steer the route off main road corridors.
 * Works for any number of waypoints including circuit (closed loop).
 */
async function calculateHighwayAvoiding(
  routingWps: LatLng[],
  originalWps: LatLng[],
  opts: RouteOptions,
  name: string
): Promise<Route> {
  const directData = await orsRequest(routingWps, opts)
  const directFeature = pickByCurvature(directData.features, opts.curviness, true)

  // Already acceptably non-highway — return as-is
  if (stateRoadPercent(directFeature) < STATE_ROAD_MAX_PCT) {
    return featureToRoute(directFeature, originalWps, opts, name)
  }

  // Insert one perpendicular mid-point on each segment, try both lateral sides
  // at two different offset fractions (smaller = more likely to hit a routable road).
  // Via-point requests use soft opts (no hard avoid_features) so ORS can still
  // reach the via-points even when some access roads are highway-adjacent.
  // A positive green factor still discourages motorway usage.
  const softOpts: RouteOptions = { ...opts, avoidHighways: false, curviness: Math.max(opts.curviness, 0.5) }

  const buildViaWps = (side: 1 | -1, fraction: number): LatLng[] => {
    const wps: LatLng[] = [routingWps[0]]
    for (let i = 0; i < routingWps.length - 1; i++) {
      wps.push(perpendicularOffset(routingWps[i], routingWps[i + 1], side, fraction))
      wps.push(routingWps[i + 1])
    }
    return wps
  }

  const [r15, r25, l15, l25] = await Promise.allSettled([
    orsRequest(buildViaWps(1,  0.15), softOpts),
    orsRequest(buildViaWps(1,  0.25), softOpts),
    orsRequest(buildViaWps(-1, 0.15), softOpts),
    orsRequest(buildViaWps(-1, 0.25), softOpts),
  ])

  const candidates: OrsRouteResponse['features'][0][] = [directFeature]
  for (const result of [r15, r25, l15, l25]) {
    if (result.status === 'fulfilled') candidates.push(result.value.features[0])
  }

  const best = pickBestByHighwayThenCurvature(candidates)

  return featureToRoute(best, originalWps, opts, name)
}

/**
 * For "Muchas curvas" with 2 waypoints:
 * Fires 3 ORS requests in parallel — direct route + two perpendicular via-point offsets.
 * Picks the result with the highest actual curvature score (degrees/point).
 * Falls back gracefully if some requests fail.
 */
async function calculateCurvyEnhanced(
  start: LatLng,
  end: LatLng,
  opts: RouteOptions,
  name: string
): Promise<Route> {
  const viaRight = perpendicularOffset(start, end, 1)
  const viaLeft  = perpendicularOffset(start, end, -1)

  const [direct, right, left] = await Promise.allSettled([
    orsRequest([start, end], opts),
    orsRequest([start, viaRight, end], opts),
    orsRequest([start, viaLeft,  end], opts),
  ])

  // Collect all valid candidates with their curvature score
  const candidates: { feature: OrsRouteResponse['features'][0]; wps: LatLng[] }[] = []

  if (direct.status === 'fulfilled') {
    for (const f of direct.value.features) candidates.push({ feature: f, wps: [start, end] })
  }
  if (right.status === 'fulfilled') {
    candidates.push({ feature: right.value.features[0], wps: [start, viaRight, end] })
  }
  if (left.status === 'fulfilled') {
    candidates.push({ feature: left.value.features[0], wps: [start, viaLeft, end] })
  }

  if (candidates.length === 0) throw new Error('No se pudo calcular ninguna ruta')

  // Choose the best candidate: fewest highway km first (when avoidHighways),
  // then highest curvature (curviness=1 always reaches this function).
  const best = candidates.reduce((top, c) => {
    if (opts.avoidHighways) {
      const diff = stateRoadPercent(c.feature) - stateRoadPercent(top.feature)
      if (Math.abs(diff) > 5) return diff < 0 ? c : top
    }
    const geom = c.feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    const topGeom = top.feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    return curvatureScore(geom) > curvatureScore(topGeom) ? c : top
  })

  return featureToRoute(best.feature, best.wps, opts, name)
}

// ─── Roundtrip ───────────────────────────────────────────────────────────────

const SEED_BEARINGS = [360, 45, 90, 135, 180, 225, 270, 315]

// Maximum acceptable percentage of state roads (waytype=1 → motorway + trunk).
// ORS avoid_features:"highways" only blocks motorway; Spanish autovías tagged as
// trunk (A-92, A-4 …) slip through, so we filter results post-hoc against this
// threshold. 8 % ≈ ≤8 km of trunk in a 100 km roundtrip — short connectors only.
const STATE_ROAD_MAX_PCT = 8

/**
 * Attempts one via-point round-trip request. Returns the underlying feature so
 * the caller can score state-road usage before committing to a route.
 */
async function tryViaFeature(
  start: LatLng,
  via: LatLng,
  opts: RouteOptions
): Promise<OrsRouteResponse['features'][0] | null> {
  try {
    const data = await orsRequest([start, via, start], opts)
    return data.features[0]
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('routable point')) return null
    throw err
  }
}


/**
 * Executes an ORS native round_trip request for the given seed.
 * Always requests waytype extra_info so stateRoadPercent can evaluate the result.
 */
function nativeRoundtripBody(start: LatLng, opts: RouteOptions, seed: number) {
  const { distance } = opts.roundtrip
  return {
    coordinates: [[start.lng, start.lat]],
    profile: 'driving-car',
    format: 'geojson',
    elevation: true,
    extra_info: ['waytype', 'surface'],
    options: {
      ...buildAvoidOptions(opts),
      profile_params: { weightings: curvinessToWeighting(opts.curviness, opts.avoidHighways) },
      round_trip: { length: distance * 1000, points: 3, seed },
    },
  }
}

/**
 * Picks the candidate with the lowest state-road percentage; tiebreaks (within
 * 3 % of the leader) by highest curvature score.
 */
function pickBestByHighwayThenCurvature(
  features: OrsRouteResponse['features'][0][]
): OrsRouteResponse['features'][0] {
  return features.reduce((top, c) => {
    const diff = stateRoadPercent(c) - stateRoadPercent(top)
    if (Math.abs(diff) > 3) return diff < 0 ? c : top
    const geom    = c.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    const topGeom = top.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    return curvatureScore(geom) > curvatureScore(topGeom) ? c : top
  })
}

/**
 * Native round_trip exploration: fires the requested seed first, then if state
 * roads exceed STATE_ROAD_MAX_PCT, probes 11 more seeds in parallel and returns
 * the best candidate (or null if none satisfies the threshold).
 */
async function bestNativeRoundtripFeature(
  start: LatLng,
  opts: RouteOptions,
  seed: number
): Promise<{ feature: OrsRouteResponse['features'][0]; clean: boolean }> {
  const firstData = await orsPost<OrsRouteResponse>(
    '/v2/directions/driving-car/geojson',
    nativeRoundtripBody(start, opts, seed)
  )
  const firstFeature = firstData.features[0]

  if (!opts.avoidHighways || stateRoadPercent(firstFeature) < STATE_ROAD_MAX_PCT) {
    return { feature: firstFeature, clean: true }
  }

  // Probe many more seeds in parallel — ORS round_trip is deterministic per seed,
  // so we need broad exploration to escape the trunk-road corridor.
  const altSeeds = [seed + 1, seed + 2, seed + 3, seed + 4, seed + 5, seed + 6,
                    seed + 7, seed + 8, seed + 9, seed + 10, seed + 11]
  const altResults = await Promise.allSettled(
    altSeeds.map((s) =>
      orsPost<OrsRouteResponse>('/v2/directions/driving-car/geojson', nativeRoundtripBody(start, opts, s))
    )
  )
  const candidates = [
    firstFeature,
    ...altResults
      .filter((r): r is PromiseFulfilledResult<OrsRouteResponse> => r.status === 'fulfilled')
      .map((r) => r.value.features[0]),
  ]

  const best = pickBestByHighwayThenCurvature(candidates)
  return { feature: best, clean: stateRoadPercent(best) < STATE_ROAD_MAX_PCT }
}

/**
 * Via-point fallback: forces the route off the highway corridor by routing
 * start → perpendicular via-point → start. Tries 8 bearings around baseBearing
 * at distance/3, then distance/4 if the first batch is all dirty/unroutable.
 * Returns the best feature found, even if it still exceeds the threshold.
 */
async function viaPointRoundtripFallback(
  start: LatLng,
  opts: RouteOptions,
  baseBearing: number
): Promise<OrsRouteResponse['features'][0] | null> {
  const { distance } = opts.roundtrip
  const offsets = [0, 45, -45, 90, -90, 135, -135, 180]
  const fractions = [1 / 3, 1 / 4]

  for (const fraction of fractions) {
    const results = await Promise.allSettled(
      offsets.map((o) => {
        const bearing = (baseBearing + o + 360) % 360
        return tryViaFeature(start, destinationPoint(start, distance * fraction, bearing), opts)
      })
    )
    const candidates = results
      .filter((r): r is PromiseFulfilledResult<OrsRouteResponse['features'][0] | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((f): f is OrsRouteResponse['features'][0] => f !== null)

    if (candidates.length > 0) return pickBestByHighwayThenCurvature(candidates)
  }
  return null
}

export async function calculateRoundtrip(
  start: LatLng,
  opts: RouteOptions,
  seed = 0
): Promise<Route> {
  const { distance, direction } = opts.roundtrip
  const name = `Circular · ${distance} km`

  // ORS native round_trip is limited to 100 km
  const useViaPoint = direction !== 0 || distance > 100
  const baseBearing = direction !== 0 ? direction : SEED_BEARINGS[seed % SEED_BEARINGS.length]

  if (useViaPoint) {
    // Try several bearing rotations and distance fractions until one lands on a road.
    const offsets = [0, 30, -30, 70, -70, 110, -110, 150]
    const fractions = [1 / 3, 1 / 4]

    for (const fraction of fractions) {
      // Run all 8 offsets in parallel and pick the candidate with the lowest
      // state-road percentage, so we don't accept the first highway-heavy hit.
      const results = await Promise.allSettled(
        offsets.map((o) => {
          const bearing = (baseBearing + o + 360) % 360
          return tryViaFeature(start, destinationPoint(start, distance * fraction, bearing), opts)
        })
      )
      const candidates = results
        .filter((r): r is PromiseFulfilledResult<OrsRouteResponse['features'][0] | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((f): f is OrsRouteResponse['features'][0] => f !== null)

      if (candidates.length > 0) {
        const best = pickBestByHighwayThenCurvature(candidates)
        return featureToRoute(best, [start], opts, name)
      }
    }

    // Last resort for short distances: ORS native round_trip ignores direction
    if (distance <= 100) {
      const { feature } = await bestNativeRoundtripFeature(start, opts, seed)
      return featureToRoute(feature, [start], opts, name)
    }

    throw new Error('No se encontró ruta circular viable. Prueba con un punto de partida diferente o cambia la dirección.')
  }

  // Auto + distance ≤ 100 km: native round_trip first, then via-point fallback
  // if state-road percentage is still over the threshold.
  const native = await bestNativeRoundtripFeature(start, opts, seed)
  if (!opts.avoidHighways || native.clean) {
    return featureToRoute(native.feature, [start], opts, name)
  }

  const viaFeature = await viaPointRoundtripFallback(start, opts, baseBearing)
  if (viaFeature) {
    // Pick whichever of (native best, via-point best) has less state road.
    const winner = pickBestByHighwayThenCurvature([native.feature, viaFeature])
    return featureToRoute(winner, [start], opts, name)
  }

  return featureToRoute(native.feature, [start], opts, name)
}
