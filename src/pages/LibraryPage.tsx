import { Download, Trash2, Navigation } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { downloadGpx } from '../services/gpx/export'
import { Sidebar } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import { formatDistance, formatDuration } from '../utils/format'

export function LibraryPage() {
  const savedRoutes = useAppStore((s) => s.savedRoutes)
  const deleteRoute = useAppStore((s) => s.deleteRoute)
  const setCurrentRoute = useAppStore((s) => s.setCurrentRoute)
  const setActiveView = useAppStore((s) => s.setActiveView)

  function loadRoute(routeId: string) {
    const route = savedRoutes.find((r) => r.id === routeId)
    if (!route) return
    setCurrentRoute(route)
    setActiveView('planner')
  }

  return (
    <div className="flex h-full">
      <Sidebar>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
            Rutas guardadas ({savedRoutes.length})
          </h3>

          {savedRoutes.length === 0 ? (
            <p className="text-xs text-white/40 italic">
              Aún no has guardado ninguna ruta. Planifica una y pulsa "Guardar ruta".
            </p>
          ) : (
            savedRoutes.map((route) => (
              <div key={route.id} className="bg-white/5 rounded-xl p-3 flex flex-col gap-2">
                <p className="text-sm font-semibold text-white truncate">{route.name}</p>
                <p className="text-xs text-white/50">
                  {formatDistance(route.distanceKm)} · {formatDuration(route.durationMin)}
                </p>
                <div className="flex gap-1.5 mt-1">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => loadRoute(route.id)}>
                    <Navigation size={12} /> Ver
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadGpx(route)}>
                    <Download size={12} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteRoute(route.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Sidebar>

      <main className="flex-1 flex items-center justify-center bg-[#0f3460]/30">
        <p className="text-white/20 text-sm">Selecciona una ruta para verla en el mapa</p>
      </main>
    </div>
  )
}
