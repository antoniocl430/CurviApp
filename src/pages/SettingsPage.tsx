import { useState } from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/ui/Button'

function SettingsContent() {
  const orsApiKey = useAppStore((s) => s.orsApiKey)
  const setOrsApiKey = useAppStore((s) => s.setOrsApiKey)

  const [input, setInput] = useState(orsApiKey)
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setOrsApiKey(input.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ajustes</h3>

      <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-white mb-1">API Key de OpenRouteService</p>
          <p className="text-xs text-white/50 mb-3">
            Obtén una clave gratuita en{' '}
            <a
              href="https://openrouteservice.org/dev/#/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 underline"
            >
              openrouteservice.org
            </a>{' '}
            (hasta 500 rutas/día gratis). La clave se guarda sólo en tu navegador.
          </p>
        </div>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={input}
            onChange={(e) => { setInput(e.target.value); setSaved(false) }}
            placeholder="Pega aquí tu API key..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-400/60"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <Button
          onClick={handleSave}
          disabled={!input.trim() || input.trim() === orsApiKey}
          className="flex items-center gap-2 justify-center"
        >
          {saved ? <><Check size={14} /> Guardado</> : 'Guardar clave'}
        </Button>

        {orsApiKey && (
          <p className="text-xs text-green-400/80 flex items-center gap-1">
            <Check size={12} /> Clave configurada — puedes calcular rutas
          </p>
        )}
        {!orsApiKey && (
          <p className="text-xs text-orange-400/80">
            Sin clave no se pueden calcular rutas.
          </p>
        )}
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
