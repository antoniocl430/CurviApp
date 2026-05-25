interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

export interface GeocodingResult {
  label: string       // full display name shown in dropdown
  shortLabel: string  // first segment (city name) used as waypoint label
  lat: number
  lng: number
}

export async function searchPlace(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '0',
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      'Accept-Language': 'es',
      'User-Agent': 'CurviApp/0.1 (personal motorcycle route planner)',
    },
  })

  if (!res.ok) throw new Error(`Geocoding error ${res.status}`)

  const data: NominatimResult[] = await res.json()

  return data.map((r) => ({
    label: r.display_name,
    shortLabel: r.display_name.split(',')[0].trim(),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }))
}
