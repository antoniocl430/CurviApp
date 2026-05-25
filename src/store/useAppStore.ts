import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Waypoint, Route, RouteOptions, AppView } from '../types'

interface AppState {
  // Navigation
  activeView: AppView
  setActiveView: (view: AppView) => void

  // Route planning
  waypoints: Waypoint[]
  addWaypoint: (wp: Waypoint) => void
  removeWaypoint: (id: string) => void
  clearWaypoints: () => void

  // Route options
  routeOptions: RouteOptions
  setRouteOptions: (opts: Partial<RouteOptions>) => void

  // Computed route
  currentRoute: Route | null
  setCurrentRoute: (route: Route | null) => void
  isCalculating: boolean
  setIsCalculating: (v: boolean) => void

  // Saved routes library
  savedRoutes: Route[]
  saveRoute: (route: Route) => void
  deleteRoute: (id: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: 'planner',
      setActiveView: (view) => set({ activeView: view }),

      waypoints: [],
      addWaypoint: (wp) => set((s) => ({ waypoints: [...s.waypoints, wp] })),
      removeWaypoint: (id) =>
        set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id) })),
      clearWaypoints: () => set({ waypoints: [], currentRoute: null }),

      routeOptions: {
        curviness: 0.7,
        avoidHighways: true,
        avoidTolls: false,
        roundtrip: { enabled: false, distance: 100, direction: 0 },
      },
      setRouteOptions: (opts) =>
        set((s) => ({ routeOptions: { ...s.routeOptions, ...opts } })),

      currentRoute: null,
      setCurrentRoute: (route) => set({ currentRoute: route }),
      isCalculating: false,
      setIsCalculating: (v) => set({ isCalculating: v }),

      savedRoutes: [],
      saveRoute: (route) =>
        set((s) => ({
          savedRoutes: [route, ...s.savedRoutes.filter((r) => r.id !== route.id)],
        })),
      deleteRoute: (id) =>
        set((s) => ({ savedRoutes: s.savedRoutes.filter((r) => r.id !== id) })),
    }),
    {
      name: 'curviapp-storage',
      partialize: (s) => ({ savedRoutes: s.savedRoutes, routeOptions: s.routeOptions }),
    }
  )
)
