import { Map, BookOpen, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../store/useAppStore'
import type { AppView } from '../../types'

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Map }[] = [
  { view: 'planner', label: 'Planificador', icon: Map },
  { view: 'library', label: 'Mis rutas', icon: BookOpen },
  { view: 'settings', label: 'Ajustes', icon: Settings },
]

export function Sidebar({ children }: { children: React.ReactNode }) {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <aside className="flex flex-col w-80 shrink-0 bg-[#16213e] border-r border-white/10 h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <span className="text-2xl">🏍️</span>
        <div>
          <p className="text-base font-bold text-white leading-none">CurviApp</p>
          <p className="text-[10px] text-white/40">Rutas para motociclistas</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex border-b border-white/10">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
              activeView === view
                ? 'text-orange-400 border-b-2 border-orange-500'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  )
}
