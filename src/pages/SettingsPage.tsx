import { Check, Zap } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'

function SettingsContent() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ajustes</h3>

      <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-orange-400 shrink-0" />
          <p className="text-sm font-medium text-white">Motor de rutas</p>
        </div>
        <p className="text-xs text-white/50">
          CurviApp calcula rutas usando <span className="text-white/80">Valhalla</span> y{' '}
          <span className="text-white/80">OSRM</span> — motores de código abierto basados en
          OpenStreetMap. No necesitas ninguna clave de API.
        </p>
        <p className="text-xs text-green-400/80 flex items-center gap-1.5">
          <Check size={12} /> Listo para calcular rutas sin configuración
        </p>
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <p className="text-sm font-medium text-white mb-1">Acerca de CurviApp</p>
        <p className="text-xs text-white/50">Versión 0.1.0 · Hecho con ❤️ para motociclistas</p>
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="flex h-full">
      <Sidebar>
        <SettingsContent />
      </Sidebar>

      <main className="hidden md:flex flex-1 items-center justify-center bg-[#0f3460]/30">
        <p className="text-white/20 text-sm">Próximamente más opciones de configuración</p>
      </main>

      <div className="md:hidden flex-1 overflow-y-auto p-4">
        <SettingsContent />
      </div>
    </div>
  )
}
