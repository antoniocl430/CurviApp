import type { Route, LatLng } from '../types'

// Samples up to `max` evenly spaced points from the middle of the geometry
// (excluding origin and destination, which go as separate params).
// Google Maps URL API allows max 9 intermediate waypoints.
function sampleIntermediatePoints(geometry: LatLng[], max = 8): LatLng[] {
  const interior = geometry.slice(1, -1)
  if (interior.length === 0) return []
  if (interior.length <= max) return interior

  const step = (interior.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => interior[Math.round(i * step)])
}

export function buildGoogleMapsUrl(route: Route): string {
  const { geometry } = route
  if (geometry.length < 2) throw new Error('La ruta no tiene suficientes puntos')

  const origin = geometry[0]
  const destination = geometry[geometry.length - 1]
  const waypoints = sampleIntermediatePoints(geometry)

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
