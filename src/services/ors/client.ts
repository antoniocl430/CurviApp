const ORS_BASE = 'https://api.openrouteservice.org'

export function getOrsApiKey(): string {
  const envKey = import.meta.env.VITE_ORS_API_KEY as string | undefined
  if (envKey) return envKey

  try {
    const stored = localStorage.getItem('curviapp-storage')
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { orsApiKey?: string } }
      const key = parsed?.state?.orsApiKey
      if (key) return key
    }
  } catch {
    // ignore
  }

  throw new Error('No hay clave de API configurada. Ve a Ajustes e introduce tu clave de OpenRouteService.')
}

export async function orsGet<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const key = getOrsApiKey()
  const qs = new URLSearchParams({ api_key: key, ...params }).toString()
  const res = await fetch(`${ORS_BASE}${endpoint}?${qs}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`[${res.status}] ${err?.error?.message ?? 'ORS error'}`)
  }
  return res.json() as Promise<T>
}

export async function orsPost<T>(endpoint: string, body: object): Promise<T> {
  const key = getOrsApiKey()
  const url = `${ORS_BASE}${endpoint}?api_key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string; code?: number } }
    throw new Error(`[${res.status}] ${err?.error?.message ?? 'ORS error'}`)
  }
  return res.json() as Promise<T>
}
