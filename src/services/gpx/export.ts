import type { Route } from '../../types'

export function routeToGpx(route: Route): string {
  const points = route.geometry
    .map((p) => `    <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CurviApp" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <time>${route.createdAt}</time>
  </metadata>
  <trk>
    <name>${escapeXml(route.name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`
}

export function downloadGpx(route: Route): void {
  const xml = routeToGpx(route)
  const blob = new Blob([xml], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${route.name.replace(/\s+/g, '_')}.gpx`
  a.click()
  URL.revokeObjectURL(url)
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c))
}
