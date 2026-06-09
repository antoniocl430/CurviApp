import { useState } from 'react'
import { MapPin, Trash2, Navigation, RotateCcw, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../store/useAppStore'
import { calculateRoute, calculateRoundtrip } from '../../services/ors/routing'
import { downloadGpx } from '../../services/gpx/export'
import { openInGoogleMaps } from '../../utils/googleMaps'
import { Button } from '../ui/Button'
import { Toggle } from '../ui/Toggle'
import { ElevationChart } from './ElevationChart'
import { WaypointSearch } from './WaypointSearch'
import { formatDistance, formatDuration, formatElevation } from '../../utils/format'
import type { RouteMode } from '../../types'

const ROUTE_MODES: { mode: RouteMode; label: string; description: string }[] = [
  { mode: 'normal',   label: 'Normal',    description: 'Ruta entre varios puntos' },
  { mode: 'circuit',  label: 'Circuito',  description: 'Vuelta automática al origen' },
  { mode: 'circular', label: 'Circular',  description: 'Vuelta desde el mismo origen' },
]

const CURVINESS_LEVELS = [
  { label: 'Sin curvas', value: 0 },
  { label: 'Medias',     value: 0.5 },
  { label: 'Muchas',     value: 1 },
] as const

const ROUNDTRIP_DIRECTIONS = [
  { label: 'Auto', value: 0 },
  { label: 'N',    value: 360 },
  { label: 'E',    value: 90 },
  { label: 'S',    value: 180 },
  { label: 'O',    value: 270 },
] as const

// Labels for waypoints per mode
function waypointLabel(mode: RouteMode, index: number, _total: number, fallback?: string): string {
  if (mode === 'circular') return 'Origen'
  if (index === 0) return 'Origen'
  return fallback ?? `Punto ${index + 1}`
}

function waypointColor(mode: RouteMode, index: number, total: number): string {
  const isStart = index === 0
  const isEnd = total > 1 && index === total - 1
  if (isStart) return 'text-green-400'
  if (isEnd && mode !== 'circuit') return 'text-red-400'
  if (isEnd && mode === 'circuit') return 'text-orange-400'
  return 'text-orange-400'
}

function emptyHint(mode: RouteMode): string {
  if (mode === 'circular') return 'Añade tu punto de partida buscando un lugar o haciendo clic en el mapa'
  if (mode === 'circuit') return 'Añade el origen del circuito buscando un lugar o haciendo clic en el mapa'
  return 'Busca un lugar arriba o haz clic en el mapa'
}

function partialHint(mode: RouteMode): string | null {
  if (mode === 'circuit') return 'Añade los puntos de paso del circuito'
  return null
}

export function RoutePlanner() {
  const waypoints     = useAppStore((s) => s.waypoints)
  const removeWaypoint = useAppStore((s) => s.removeWaypoint)
  const setWaypoints  = useAppStore((s) => s.setWaypoints)
  const clearWaypoints = useAppStore((s) => s.clearWaypoints)
  const routeOptions  = useAppStore((s) => s.routeOptions)
  const setRouteOptions = useAppStore((s) => s.setRouteOptions)
  const currentRoute  = useAppStore((s) => s.currentRoute)
  const setCurrentRoute = useAppStore((s) => s.setCurrentRoute)
  const isCalculating = useAppStore((s) => s.isCalculating)
  const setIsCalculating = useAppStore((s) => s.setIsCalculating)
  const saveRoute     = useAppStore((s) => s.saveRoute)

  const [seed, setSeed] = useState(0)

  const mode     = routeOptions.mode ?? 'normal'
  const roundtrip = routeOptions.roundtrip

  const canCalculate =
    mode === 'circular' ? waypoints.length >= 1 : waypoints.length >= 2

  // Show search only when the mode's waypoint limit isn't reached
  const waypointLimit = mode === 'circular' ? 1 : Infinity
  const canAddWaypoint = waypoints.length < waypointLimit

  function switchMode(newMode: RouteMode) {
    const limit = newMode === 'circular' ? 1 : Infinity
    if (waypoints.length > limit) setWaypoints(waypoints.slice(0, limit))
    setRouteOptions({ mode: newMode })
    setSeed(0)
  }

  function setRoundtrip(partial: Partial<typeof roundtrip>) {
    setRouteOptions({ roundtrip: { ...roundtrip, ...partial } })
  }

  async function runCalculate(overrideSeed?: number) {
    if (!canCalculate) return
    setIsCalculating(true)
    try {
      const route =
        mode === 'circular'
          ? await calculateRoundtrip(waypoints[0].position, routeOptions, overrideSeed ?? seed)
          : await calculateRoute(waypoints.map((w) => w.position), routeOptions)
      setCurrentRoute(route)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isNoKey = msg.includes('No hay clave') || msg.includes('VITE_ORS_API_KEY')
      if (isNoKey) {
        useAppStore.getState().setActiveView('settings')
      } else {
        alert(`Error al calcular ruta: ${msg}`)
      }
    } finally {
      setIsCalculating(false)
    }
  }

  async function handleNextVariant() {
    const newSeed = (seed + 1) % 10
    setSeed(newSeed)
    await runCalculate(newSeed)
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto px-1">

      {/* ── Waypoints ─────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
          {mode === 'circular' ? 'Punto de partida' : mode === 'circuit' ? 'Puntos del circuito' : 'Puntos de ruta'}
        </h3>

        {canAddWaypoint && <WaypointSearch />}

        {waypoints.length === 0 ? (
          <p className="text-xs text-white/40 italic mt-2">{emptyHint(mode)}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-1 mt-2">
              {waypoints.map((wp, i) => (
                <li key={wp.id} className="flex items-center gap-2 text-sm text-white/80">
                  <MapPin size={14} className={clsx(waypointColor(mode, i, waypoints.length), 'shrink-0')} />
                  <span className="flex-1 truncate">
                    <span className="text-[10px] text-white/40 mr-1">
                      {waypointLabel(mode, i, waypoints.length)}
                    </span>
                    {wp.label ?? `${wp.position.lat.toFixed(4)}, ${wp.position.lng.toFixed(4)}`}
                  </span>
                  <button
                    onClick={() => removeWaypoint(wp.id)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            {mode === 'circuit' && waypoints.length >= 1 && (
              <div className="flex items-center gap-2 mt-1 text-xs text-white/30 italic pl-0.5">
                <MapPin size={12} className="text-green-400/50 shrink-0" />
                <span>↩ Vuelta a {waypoints[0].label ?? 'Origen'}</span>
              </div>
            )}
            {partialHint(mode) && waypoints.length === 1 && (
              <p className="text-xs text-orange-400/70 italic mt-1.5">{partialHint(mode)}</p>
            )}
          </>
        )}
      </section>

      {/* ── Options ───────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Opciones</h3>

        {/* Route mode */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-white/70">Modo de ruta</span>
          <div className="grid grid-cols-3 gap-1">
            {ROUTE_MODES.map(({ mode: m, label }) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={clsx(
                  'text-xs py-2 rounded-lg font-medium transition-all text-center',
                  mode === m
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Circular-only options */}
        {mode === 'circular' && (
          <>
            {/* Distance */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-white/70">Distancia objetivo</span>
                <span className="text-xs font-bold text-orange-400">{roundtrip.distance} km</span>
              </div>
              <input
                type="range" min={50} max={500} step={25}
                value={roundtrip.distance}
                onChange={(e) => setRoundtrip({ distance: Number(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/30">
                <span>50 km</span><span>500 km</span>
              </div>
            </div>

            {/* Direction */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-white/70">Dirección de salida</span>
              <div className="grid grid-cols-5 gap-1">
                {ROUNDTRIP_DIRECTIONS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => { setRoundtrip({ direction: value }); setSeed(0) }}
                    className={clsx(
                      'text-xs py-1.5 rounded-lg font-medium transition-all',
                      roundtrip.direction === value
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {roundtrip.direction === 0 && (
              <button
                onClick={handleNextVariant}
                disabled={waypoints.length === 0 || isCalculating}
                className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1.5 self-start transition-colors disabled:opacity-30"
              >
                <RefreshCw size={11} />
                Probar otra variante (#{seed + 1})
              </button>
            )}
          </>
        )}

        {/* Curviness */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-white/70">Curvosidad</span>
          <div className="grid grid-cols-3 gap-1">
            {CURVINESS_LEVELS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setRouteOptions({ curviness: value })}
                className={clsx(
                  'text-xs py-2 px-1 rounded-lg font-medium transition-all text-center',
                  routeOptions.curviness === value
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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

      {/* ── Actions ───────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={!canCalculate || isCalculating}
          onClick={() => runCalculate()}
        >
          <Navigation size={16} />
          {isCalculating
            ? 'Calculando…'
            : mode === 'circular'
              ? 'Calcular circular'
              : mode === 'circuit'
                ? 'Calcular circuito'
                : 'Calcular ruta'}
        </Button>
        <Button variant="ghost" size="md" onClick={clearWaypoints} title="Limpiar todo">
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* ── Route summary ─────────────────────────── */}
      {currentRoute && (
        <section className="flex flex-col gap-3">
          <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-sm font-semibold text-white">{currentRoute.name}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatBadge label="Distancia" value={formatDistance(currentRoute.distanceKm)} />
              <StatBadge label="Duración"  value={formatDuration(currentRoute.durationMin)} />
              <StatBadge label="Desnivel"  value={formatElevation(currentRoute.elevationGainM)} />
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
            <Button variant="secondary" size="sm" onClick={() => openInGoogleMaps(currentRoute)} title="Abrir en Google Maps">
              <ExternalLink size={14} />
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
