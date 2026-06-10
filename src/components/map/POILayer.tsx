import { useCallback, useEffect, useRef, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useAppStore } from '../../store/useAppStore'
import { fetchPOIs } from '../../services/overpass/pois'
import type { POI, POIType } from '../../types'

export const MIN_ZOOM = 11
const DEBOUNCE_MS = 800

export const POI_META: Record<POIType, { emoji: string; color: string; label: string }> = {
  gas:        { emoji: '⛽', color: '#22c55e', label: 'Gasolinera' },
  viewpoint:  { emoji: '🔭', color: '#3b82f6', label: 'Mirador' },
  restaurant: { emoji: '🍽️', color: '#f59e0b', label: 'Restaurante' },
  parking:    { emoji: '🅿️', color: '#8b5cf6', label: 'Aparcamiento' },
  mechanic:   { emoji: '🔧', color: '#ef4444', label: 'Taller moto' },
}

function createPOIIcon(type: POIType): L.DivIcon {
  const { emoji, color } = POI_META[type]
  return L.divIcon({
    html: `<div style="
      background:${color};border:2px solid white;border-radius:50%;
      width:30px;height:30px;display:flex;align-items:center;justify-content:center;
      font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.35);
    ">${emoji}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  })
}

export function POILayer() {
  const activePOITypes = useAppStore((s) => s.activePOITypes)
  const [pois, setPois] = useState<POI[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const map = useMap()

  const loadPOIs = useCallback(async () => {
    if (activePOITypes.length === 0 || map.getZoom() < MIN_ZOOM) {
      setPois([])
      return
    }
    const b = map.getBounds()
    try {
      const results = await fetchPOIs(
        { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
        activePOITypes
      )
      setPois(results)
    } catch {
      // POIs are non-critical — fail silently
    }
  }, [activePOITypes, map])

  const scheduleLoad = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(loadPOIs, DEBOUNCE_MS)
  }, [loadPOIs])

  useMapEvents({ moveend: scheduleLoad, zoomend: scheduleLoad })

  useEffect(() => {
    scheduleLoad()
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [scheduleLoad])

  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.position.lat, poi.position.lng]}
          icon={createPOIIcon(poi.type)}
        >
          <Popup>
            <div style={{ minWidth: 130 }}>
              <p style={{ fontWeight: 700, margin: 0, fontSize: 13 }}>{poi.name}</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#888' }}>
                {POI_META[poi.type].label}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
