const ORS_BASE = 'https://api.openrouteservice.org'

export function getOrsApiKey(): string {
  const key = import.meta.env.VITE_ORS_API_KEY
  if (!key) throw new Error('VITE_ORS_API_KEY is not set in .env')
  return key
}

export async function orsPost<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${ORS_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: getOrsApiKey(),
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
