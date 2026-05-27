export async function apiGet<T = unknown>(path: string): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const response = await fetch(path, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
    const data = await parseJson<T>(response)
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error instanceof Error ? error.message : 'Request failed' }
  }
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    const data = await parseJson<T>(response)
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error instanceof Error ? error.message : 'Request failed' }
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return { raw: text } as T
  }
}

export function unwrapData<T = unknown>(payload: any): T | null {
  if (!payload) return null
  if (payload.data !== undefined) return payload.data as T
  return payload as T
}
