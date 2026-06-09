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
  // Real JWTs have three dot-separated parts (header.payload.signature).
  // ORS base64 keys also start with "ey" but have no dots — send them as-is.
  const isJwt = key.startsWith('ey') && (key.match(/\./g) ?? []).length >= 2
  return isJwt ? `Bearer ${key}` : key
}

export async function orsPost<T>(endpoint: string, body: object): Promise<T> {
  const key = getOrsApiKey()
  const res = await fetch(`${ORS_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(key),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string; code?: number } }
    const msg = err?.error?.message ?? `ORS error ${res.status}`
    throw new Error(`[${res.status}] ${msg}`)
  }
  return res.json() as Promise<T>
}
