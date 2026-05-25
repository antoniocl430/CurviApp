import { MapView } from '../components/map/MapView'
import { RoutePlanner } from '../components/route/RoutePlanner'
import { Sidebar } from '../components/layout/Sidebar'

export function PlannerPage() {
  return (
    <div className="flex h-full">
      <Sidebar>
        <RoutePlanner />
      </Sidebar>
      <main className="flex-1 relative">
        <MapView />
      </main>
    </div>
  )
}
