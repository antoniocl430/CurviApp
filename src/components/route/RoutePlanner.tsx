import { MapPin, Trash2, Navigation, RotateCcw, Download } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { calculateRoute } from '../../services/ors/routing'
import { downloadGpx } from '../../services/gpx/export'
import { Button } from '../ui/Button'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { ElevationChart } from './ElevationChart'
import { WaypointSearch } from './WaypointSearch'
import { formatDistance, formatDuration, formatElevation } from '../../utils/format'

export function RoutePlanner() {
  const waypoints = useAppStore((s) => s.waypoints)
  const removeWaypoint = useAppStore((s) => s.removeWaypoint)
  const clearWaypoints = useAppStore((s) => s.clearWaypoints)
  const routeOptions = useAppStore((s) => s.routeOptions)
  const setRouteOptions = useAppStore((s) => s.setRouteOptions)
  const currentRoute = useAppStore((s) => s.currentRoute)
  const setCurrentRoute = useAppStore((s) => s.setCurrentRoute)
  const isCalculating = useAppStore((s) => s.isCalculating)
  const setIsCalculating = useAppStore((s) => s.setIsCalculating)
  const saveRoute = useAppStore((s) => s.saveRoute)

  async function handleCalculate() {
    if (waypoints.length < 2) return
    setIsCalculating(true)
    try {
      const route = await calculateRoute(
        waypoints.map((w) => w.position),
        routeOptions
      )
      setCurrentRoute(route)
    } catch (err) {
      alert(`Error al calcular ruta: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto px-1">
      {/* Waypoints */}
      <section>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          Puntos de ruta
        </h3>
        <WaypointSearch />
        {waypoints.length === 0 ? (
          <p className="text-xs text-white/40 italic mt-2">Busca un lugar arriba o haz clic en el mapa</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {waypoints.map((wp, i) => (
              <li key={wp.id} className="flex items-center gap-2 text-sm text-white/80">
                <MapPin size={14} className="text-orange-400 shrink-0" />
                <span className="flex-1 truncate">
                  {wp.label ?? `Punto ${i + 1}`} — {wp.position.lat.toFixed(4)}, {wp.position.lng.toFixed(4)}
                </span>
                <button onClick={() => removeWaypoint(wp.id)} className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Options */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Opciones</h3>
        <Slider
          label="Curvosidad"
          value={routeOptions.curviness}
          leftLabel="Rápida"
          rightLabel="Curvas"
          onChange={(v) => setRouteOptions({ curviness: v })}
        />
        <Toggle
          label="Evitar autopistas"
          checked={routeOptions.avoidHighways}
          onChange={(v) => setRouteOptions({ avoidHighways: v })}
        />
        <Toggle
          label="Evitar peajes"
          checked={routeOptions.avoidTolls}
          onChange={(v) => setRouteOptions({ avoidTolls: v })}
        />
      </section>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={waypoints.length < 2 || isCalculating}
          onClick={handleCalculate}
        >
          <Navigation size={16} />
          {isCalculating ? 'Calculando…' : 'Calcular ruta'}
        </Button>
        <Button variant="ghost" size="md" onClick={clearWaypoints} title="Limpiar todo">
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Route summary */}
      {currentRoute && (
        <section className="flex flex-col gap-3">
          <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-sm font-semibold text-white">{currentRoute.name}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatBadge label="Distancia" value={formatDistance(currentRoute.distanceKm)} />
              <StatBadge label="Duración" value={formatDuration(currentRoute.durationMin)} />
              <StatBadge label="Desnivel" value={formatElevation(currentRoute.elevationGainM)} />
            </div>
          </div>

          <ElevationChart points={currentRoute.elevationProfile} />

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => saveRoute(currentRoute)}>
              Guardar ruta
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadGpx(currentRoute)}>
              <Download size={14} /> GPX
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-white/40 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-bold text-orange-400">{value}</span>
    </div>
  )
}
