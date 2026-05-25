import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { useAppStore } from '../../store/useAppStore'
import { nanoid } from '../../utils/nanoid'
import type { LatLng } from '../../types'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon broken by Vite's asset handling
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function ClickHandler() {
  const addWaypoint = useAppStore((s) => s.addWaypoint)
  useMapEvents({
    click(e) {
      addWaypoint({ id: nanoid(), position: { lat: e.latlng.lat, lng: e.latlng.lng } })
    },
  })
  return null
}

// Pans to the last added waypoint so the user sees it on the map immediately
function AutoPan() {
  const map = useMap()
  const waypoints = useAppStore((s) => s.waypoints)

  useEffect(() => {
    if (waypoints.length === 0) return
    const last = waypoints[waypoints.length - 1]
    map.setView([last.position.lat, last.position.lng], Math.max(map.getZoom(), 10), { animate: true })
  }, [waypoints, map])

  return null
}

export function MapView() {
  const waypoints = useAppStore((s) => s.waypoints)
  const currentRoute = useAppStore((s) => s.currentRoute)

  const center: [number, number] = waypoints[0]
    ? [waypoints[0].position.lat, waypoints[0].position.lng]
    : [40.416, -3.703] // Madrid por defecto

  return (
    <MapContainer
      center={center}
      zoom={7}
      className="h-full w-full z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler />
      <AutoPan />

      {waypoints.map((wp, i) => (
        <Marker key={wp.id} position={[wp.position.lat, wp.position.lng]}>
          <Popup>{wp.label ?? `Punto ${i + 1}`}</Popup>
        </Marker>
      ))}

      {currentRoute && (
        <Polyline
          positions={currentRoute.geometry.map((p): [number, number] => [p.lat, p.lng])}
          color="#f97316"
          weight={4}
          opacity={0.85}
        />
      )}
    </MapContainer>
  )
}
