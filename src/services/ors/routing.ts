import { orsPost } from './client'
import type { LatLng, RouteOptions, ElevationPoint, Route } from '../../types'
import { nanoid } from '../../utils/nanoid'

interface OrsRouteResponse {
  features: Array<{
    geometry: { coordinates: [number, number, number?][] }
    properties: {
      summary: { distance: number; duration: number }
      segments: Array<{ steps: unknown[] }>
      extras?: { elevation?: { values: [number, number, number][] } }
    }
  }>
}

function buildAvoidOptions(opts: RouteOptions) {
  const avoid: string[] = []
  if (opts.avoidHighways) avoid.push('highways')
  if (opts.avoidTolls) avoid.push('tollways')
  return avoid.length ? { avoid_features: avoid } : {}
}

function curvinessToOptions(curviness: number) {
  // ORS green_factor real range: -0.5 (avoid scenic) to 1.0 (prefer scenic)
  const greenFactor = -0.5 + curviness * 1.5
  return { green: parseFloat(greenFactor.toFixed(2)) }
}

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

export async function calculateRoute(
  waypoints: LatLng[],
  opts: RouteOptions,
  name = 'Nueva ruta'
): Promise<Route> {
  const coordinates = waypoints.map((w) => [w.lng, w.lat])

  const body = {
    coordinates,
    profile: 'driving-car',
    format: 'geojson',
    elevation: true,
    options: {
      ...buildAvoidOptions(opts),
      profile_params: { weightings: curvinessToOptions(opts.curviness) },
    },
    extra_info: ['waytype', 'surface'],
  }

  const data = await orsPost<OrsRouteResponse>('/v2/directions/driving-car/geojson', body)
  const feature = data.features[0]
  const coords = feature.geometry.coordinates
  const summary = feature.properties.summary

  const distanceKm = summary.distance / 1000
  const durationMin = summary.duration / 60
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
