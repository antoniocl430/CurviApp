import { Sidebar } from '../components/layout/Sidebar'

export function SettingsPage() {
  return (
    <div className="flex h-full">
      <Sidebar>
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ajustes</h3>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-1">API Key de OpenRouteService</p>
            <p className="text-xs text-white/50 mb-3">
              Necesitas una clave gratuita de{' '}
              <span className="text-orange-400">openrouteservice.org</span> para calcular rutas.
              Añádela en el archivo <code className="bg-white/10 px-1 rounded">.env</code> como{' '}
              <code className="bg-white/10 px-1 rounded">VITE_ORS_API_KEY=tu_clave</code>.
            </p>
            <p className="text-xs text-white/30 italic">
              La clave nunca se sube al servidor. Sólo se usa desde tu navegador.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-1">Acerca de CurviApp</p>
            <p className="text-xs text-white/50">
              Versión 0.1.0 · Hecho con ❤️ para motociclistas
            </p>
          </div>
        </div>
      </Sidebar>

      <main className="flex-1 flex items-center justify-center bg-[#0f3460]/30">
        <p className="text-white/20 text-sm">Próximamente más opciones de configuración</p>
      </main>
    </div>
  )
}
