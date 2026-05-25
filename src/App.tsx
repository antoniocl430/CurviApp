import { useAppStore } from './store/useAppStore'
import { PlannerPage } from './pages/PlannerPage'
import { LibraryPage } from './pages/LibraryPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  const activeView = useAppStore((s) => s.activeView)

  return (
    <div className="h-screen bg-[#1a1a2e] text-white overflow-hidden">
      {activeView === 'planner' && <PlannerPage />}
      {activeView === 'library' && <LibraryPage />}
      {activeView === 'settings' && <SettingsPage />}
    </div>
  )
}
