export function formatDistance(km: number): string {
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`
}
