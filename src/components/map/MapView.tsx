import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { useAppStore } from '../../store/useAppStore'
import { nanoid } from '../../utils/nanoid'
import { POILayer } from './POILayer'
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'

function createWaypointIcon(index: number, total: number): L.DivIcon {
  const isStart = index === 0
  const isEnd = total > 1 && index === total - 1
  const bg = isStart ? '#22c55e' : isEnd ? '#ef4444' : '#f97316'
  const label = index + 1

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
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  })
}

const userLocationIcon = L.divIcon({
  html: `<div style="
    width:16px;height:16px;
    background:#3b82f6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 5px rgba(59,130,246,0.25);
  "></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
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

function ZoomTracker() {
  const setMapZoom = useAppStore((s) => s.setMapZoom)
  useMapEvents({
    zoomend(e) { setMapZoom(e.target.getZoom()) },
  })
  return null
}

function FlyToController() {
  const map = useMap()
  const flyTo = useAppStore((s) => s.flyTo)
  const clearFlyTo = useAppStore((s) => s.clearFlyTo)

  useEffect(() => {
    if (!flyTo) return
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { animate: true, duration: 1.2 })
    clearFlyTo()
  }, [flyTo, map, clearFlyTo])

  return null
}

export function MapView() {
  const waypoints = useAppStore((s) => s.waypoints)
  const currentRoute = useAppStore((s) => s.currentRoute)
  const userLocation = useAppStore((s) => s.userLocation)

  const center: [number, number] = waypoints[0]
    ? [waypoints[0].position.lat, waypoints[0].position.lng]
    : [40.416, -3.703]

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
      <FlyToController />
      <ZoomTracker />
      <POILayer />

      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userLocationIcon}
          zIndexOffset={500}
        >
          <Popup>Tu posición actual</Popup>
        </Marker>
      )}

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
