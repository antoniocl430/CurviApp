import { useAppStore } from './store/useAppStore'
import { PlannerPage } from './pages/PlannerPage'
import { LibraryPage } from './pages/LibraryPage'
import { SettingsPage } from './pages/SettingsPage'
import { BottomNav } from './components/layout/BottomNav'

export default function App() {
  const activeView = useAppStore((s) => s.activeView)

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e] text-white overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {activeView === 'planner' && <PlannerPage />}
        {activeView === 'library' && <LibraryPage />}
        {activeView === 'settings' && <SettingsPage />}
      </div>
      <BottomNav />
    </div>
  )
}
