import type { LatLng } from '../../types'

export function parseGpxToLatLngs(gpxText: string): LatLng[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxText, 'application/xml')

  const points: LatLng[] = []

  // Try track points first, then route points, then waypoints
  const selectors = ['trkpt', 'rtept', 'wpt']
  for (const sel of selectors) {
    const nodes = doc.querySelectorAll(sel)
    if (nodes.length > 0) {
      nodes.forEach((node) => {
        const lat = parseFloat(node.getAttribute('lat') ?? '')
        const lng = parseFloat(node.getAttribute('lon') ?? '')
        if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng })
      })
      break
    }
  }

  return points
}
