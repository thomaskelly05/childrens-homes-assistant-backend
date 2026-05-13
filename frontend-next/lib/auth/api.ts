import type { AuthErrorDetail } from './types'

export class AuthApiError extends Error {
  status: number
  code?: string

  constructor(status: number, detail: AuthErrorDetail | string) {
    const message = typeof detail === 'string' ? detail : detail.message || 'Authentication request failed'
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = typeof detail === 'string' ? undefined : detail.code
  }
}

function detailFromPayload(payload: unknown): AuthErrorDetail | string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail
    if (detail && typeof detail === 'object') return detail as AuthErrorDetail
    if (typeof detail === 'string') return detail
  }
  return 'Authentication request failed'
}

export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers
    }
  })

  const payload = await response.json().catch(() => undefined)

  if (!response.ok) {
    throw new AuthApiError(response.status, detailFromPayload(payload))
  }

  return payload as T
}
