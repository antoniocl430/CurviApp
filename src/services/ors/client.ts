const ORS_BASE = 'https://api.openrouteservice.org'

export function getOrsApiKey(): string {
  // Priority: build-time env var → user-saved key in localStorage
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

function authHeader(key: string): string {
  // ORS JWT tokens (start with "ey") require "Bearer " prefix; legacy keys do not
  return key.startsWith('ey') ? `Bearer ${key}` : key
}

export async function orsPost<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${ORS_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(getOrsApiKey()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `ORS error ${res.status}`)
  }
  return res.json() as Promise<T>
}
