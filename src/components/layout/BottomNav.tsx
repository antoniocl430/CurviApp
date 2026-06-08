import { Map, BookOpen, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { useAppStore } from '../../store/useAppStore'
import type { AppView } from '../../types'

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Map }[] = [
  { view: 'planner', label: 'Planificador', icon: Map },
  { view: 'library', label: 'Mis rutas', icon: BookOpen },
  { view: 'settings', label: 'Ajustes', icon: Settings },
]

export function BottomNav() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <nav className="flex shrink-0 border-t border-white/10 bg-[#16213e] md:hidden">
      {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          onClick={() => setActiveView(view)}
          className={clsx(
            'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
            activeView === view
              ? 'text-orange-400'
              : 'text-white/40 hover:text-white/70'
          )}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  )
}
