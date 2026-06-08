import type { POI, POIType } from '../../types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const MAX_RESULTS = 200

const OSM_FILTERS: Record<POIType, string> = {
  gas:        '["amenity"="fuel"]',
  viewpoint:  '["tourism"="viewpoint"]',
  restaurant: '["amenity"="restaurant"]',
  parking:    '["amenity"="parking"]',
  mechanic:   '["shop"="motorcycle"]',
}

const TYPE_LABELS: Record<POIType, string> = {
  gas:        'Gasolinera',
  viewpoint:  'Mirador',
  restaurant: 'Restaurante',
  parking:    'Aparcamiento',
  mechanic:   'Taller moto',
}

interface OverpassElement {
  id: number
  type: string
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

export async function fetchPOIs(
  bounds: { north: number; south: number; east: number; west: number },
  types: POIType[]
): Promise<POI[]> {
  if (types.length === 0) return []

  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const nodeQueries = types.map((t) => `node${OSM_FILTERS[t]}(${bbox});`).join('\n')
  const query = `[out:json][timeout:15];\n(\n${nodeQueries}\n);\nout body ${MAX_RESULTS};`

  const res = await fetch(OVERPASS_URL, { method: 'POST', body: query })
  if (!res.ok) throw new Error(`Overpass ${res.status}`)

  const data: { elements: OverpassElement[] } = await res.json()

  return data.elements
    .filter((el) => el.lat != null && el.lon != null)
    .map((el): POI => {
      const tags = el.tags ?? {}
      const type = resolveType(tags, types)
      return {
        id: `osm-${el.id}`,
        type,
        position: { lat: el.lat!, lng: el.lon! },
        name: tags.name ?? tags['name:es'] ?? TYPE_LABELS[type],
      }
    })
}

function resolveType(tags: Record<string, string>, types: POIType[]): POIType {
  if (tags.amenity === 'fuel'       && types.includes('gas'))        return 'gas'
  if (tags.tourism === 'viewpoint'  && types.includes('viewpoint'))  return 'viewpoint'
  if (tags.amenity === 'restaurant' && types.includes('restaurant')) return 'restaurant'
  if (tags.amenity === 'parking'    && types.includes('parking'))    return 'parking'
  if (tags.shop   === 'motorcycle'  && types.includes('mechanic'))   return 'mechanic'
  return types[0]
}
