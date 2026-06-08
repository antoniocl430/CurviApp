export interface LatLng {
  lat: number
  lng: number
}

export interface Waypoint {
  id: string
  position: LatLng
  label?: string
}

export type RouteMode = 'normal' | 'circuit' | 'circular'

export interface RouteOptions {
  mode: RouteMode
  curviness: number        // 0-1: 0 = fastest, 1 = most curvy
  avoidHighways: boolean
  avoidTolls: boolean
  roundtrip: {
    distance: number       // km — used only in circular mode
    direction: number      // degrees 0-360 — used only in circular mode
  }
}

export interface ElevationPoint {
  distance: number         // km from start
  elevation: number        // meters above sea level
}

export interface Route {
  id: string
  name: string
  waypoints: Waypoint[]
  geometry: LatLng[]
  distanceKm: number
  durationMin: number
  elevationProfile: ElevationPoint[]
  elevationGainM: number
  options: RouteOptions
  createdAt: string
}

export type POIType = 'gas' | 'viewpoint' | 'restaurant' | 'parking' | 'mechanic'

export interface POI {
  id: string
  type: POIType
  position: LatLng
  name: string
  description?: string
}

export type AppView = 'planner' | 'library' | 'settings'
