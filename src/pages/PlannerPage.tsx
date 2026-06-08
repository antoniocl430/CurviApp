import { MapView } from '../components/map/MapView'
import { RoutePlanner } from '../components/route/RoutePlanner'
import { Sidebar } from '../components/layout/Sidebar'
import { BottomSheet } from '../components/layout/BottomSheet'
import { POIControls } from '../components/map/POIControls'
import { LocateButton } from '../components/map/LocateButton'

export function PlannerPage() {
  return (
    <div className="flex h-full">
      {/* Desktop: sidebar panel */}
      <Sidebar>
        <RoutePlanner />
      </Sidebar>

      {/* Map — fills remaining space on desktop, full width on mobile */}
      <main className="flex-1 relative">
        <MapView />
        <POIControls />
        <div className="absolute top-4 left-4 z-10">
          <LocateButton />
        </div>

        {/* Mobile: bottom sheet with route planner */}
        <div className="md:hidden">
          <BottomSheet>
            <RoutePlanner />
          </BottomSheet>
        </div>
      </main>
    </div>
  )
}
