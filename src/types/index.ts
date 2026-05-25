export interface LatLng {
  lat: number
  lng: number
}

export interface Waypoint {
  id: string
  position: LatLng
  label?: string
}

export interface RouteOptions {
  curviness: number        // 0-1: 0 = fastest, 1 = most curvy
  avoidHighways: boolean
  avoidTolls: boolean
  roundtrip?: {
    enabled: boolean
    distance: number       // km
    direction: number      // degrees 0-360
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

export interface POI {
  id: string
  type: 'gas' | 'viewpoint' | 'restaurant' | 'parking' | 'mechanic'
  position: LatLng
  name: string
  description?: string
}

export type AppView = 'planner' | 'library' | 'settings'
