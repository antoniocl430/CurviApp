import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { useAppStore } from '../../store/useAppStore'
import { nanoid } from '../../utils/nanoid'
import type { LatLng } from '../../types'
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'

function createWaypointIcon(index: number, total: number): L.DivIcon {
  const isStart = index === 0
  const isEnd = total > 1 && index === total - 1
  const bg = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#f97316'
  const label = index + 1

  // Classic teardrop pin: rotated square with rounded top-left/right/bottom-right,
  // pointy bottom-left corner, counter-rotated label inside.
  const html = `
    <div style="
      position:relative;width:30px;height:30px;
      background:${bg};
      border:2.5px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 3px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="
        transform:rotate(45deg);
        color:white;font-size:11px;font-weight:700;
        font-family:system-ui,sans-serif;line-height:1;
        text-shadow:0 1px 2px rgba(0,0,0,0.4);
      ">${label}</span>
    </div>`

  return L.divIcon({
    html,
    className: '',          // removes leaflet's default white square background
    iconSize: [30, 30],
    iconAnchor: [15, 30],   // tip of the pin at the coordinate
    popupAnchor: [0, -32],
  })
}

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
        <Marker
          key={wp.id}
          position={[wp.position.lat, wp.position.lng]}
          icon={createWaypointIcon(i, waypoints.length)}
        >
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
