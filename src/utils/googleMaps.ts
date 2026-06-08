import type { Route, LatLng } from '../types'

// One anchor point every ~30 km keeps Google Maps on track without over-specifying.
// Below 30 km: no intermediate points needed (direct is fine).
// Above 240 km: capped at 8 (Google Maps URL API hard limit).
//
// Examples:
//   15 km  → 0 waypoints   (origin + destination only)
//   60 km  → 2 waypoints
//  150 km  → 5 waypoints
//  300 km  → 8 waypoints  (capped)
function waypointCount(distanceKm: number): number {
  return Math.min(8, Math.max(0, Math.floor(distanceKm / 30)))
}

function sampleIntermediatePoints(geometry: LatLng[], count: number): LatLng[] {
  if (count === 0) return []
  const interior = geometry.slice(1, -1)
  if (interior.length === 0) return []
  if (interior.length <= count) return interior
  if (count === 1) return [interior[Math.floor(interior.length / 2)]]

  const step = (interior.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => interior[Math.round(i * step)])
}

export function buildGoogleMapsUrl(route: Route): string {
  const { geometry, distanceKm } = route
  if (geometry.length < 2) throw new Error('La ruta no tiene suficientes puntos')

  const origin = geometry[0]
  const destination = geometry[geometry.length - 1]
  const count = waypointCount(distanceKm)
  const waypoints = sampleIntermediatePoints(geometry, count)

  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`,
    destination: `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`,
    travelmode: 'driving',
  })

  if (waypoints.length > 0) {
    params.set(
      'waypoints',
      waypoints.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join('|')
    )
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function openInGoogleMaps(route: Route): void {
  window.open(buildGoogleMapsUrl(route), '_blank', 'noopener,noreferrer')
}
