import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Waypoint, Route, RouteOptions, AppView, POIType } from '../types'

interface AppState {
  // Navigation
  activeView: AppView
  setActiveView: (view: AppView) => void

  // API Key
  orsApiKey: string
  setOrsApiKey: (key: string) => void

  // Route planning
  waypoints: Waypoint[]
  addWaypoint: (wp: Waypoint) => void
  removeWaypoint: (id: string) => void
  setWaypoints: (wps: Waypoint[]) => void
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

  // POI layer
  activePOITypes: POIType[]
  togglePOIType: (type: POIType) => void

  // Current map zoom level (updated by ZoomTracker inside MapView)
  mapZoom: number
  setMapZoom: (zoom: number) => void

  // Map fly-to (used by LocateButton and other external triggers)
  flyTo: { lat: number; lng: number; zoom: number } | null
  requestFlyTo: (lat: number, lng: number, zoom: number) => void
  clearFlyTo: () => void

  // User GPS location marker
  userLocation: { lat: number; lng: number } | null
  setUserLocation: (pos: { lat: number; lng: number } | null) => void
}

const WAYPOINT_LIMITS: Record<string, number> = {
  normal: Infinity,
  circuit: Infinity,
  circular: 1,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: 'planner',
      setActiveView: (view) => set({ activeView: view }),

      orsApiKey: '',
      setOrsApiKey: (key) => set({ orsApiKey: key }),

      waypoints: [],
      addWaypoint: (wp) =>
        set((s) => {
          const mode = s.routeOptions.mode ?? 'normal'
          const limit = WAYPOINT_LIMITS[mode] ?? Infinity
          if (s.waypoints.length >= limit) return s
          return { waypoints: [...s.waypoints, wp] }
        }),
      removeWaypoint: (id) =>
        set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id), currentRoute: null })),
      setWaypoints: (wps) => set({ waypoints: wps }),
      clearWaypoints: () => set({ waypoints: [], currentRoute: null }),

      routeOptions: {
        mode: 'normal',
        curviness: 0.5,
        avoidHighways: true,
        avoidTolls: false,
        roundtrip: { distance: 100, direction: 0 },
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

      activePOITypes: [],
      togglePOIType: (type) =>
        set((s) => ({
          activePOITypes: s.activePOITypes.includes(type)
            ? s.activePOITypes.filter((t) => t !== type)
            : [...s.activePOITypes, type],
        })),

      mapZoom: 7,
      setMapZoom: (zoom) => set({ mapZoom: zoom }),

      flyTo: null,
      requestFlyTo: (lat, lng, zoom) => set({ flyTo: { lat, lng, zoom } }),
      clearFlyTo: () => set({ flyTo: null }),

      userLocation: null,
      setUserLocation: (pos) => set({ userLocation: pos }),
    }),
    {
      name: 'curviapp-storage',
      partialize: (s) => ({ savedRoutes: s.savedRoutes, routeOptions: s.routeOptions, orsApiKey: s.orsApiKey }),
    }
  )
)
