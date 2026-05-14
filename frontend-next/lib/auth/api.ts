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
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { code?: string; message?: string } }).error
    if (error?.message) return { code: error.code || 'api_error', message: error.message }
  }
  return 'Authentication request failed'
}

function assertRelativeApiPath(path: string) {
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(path)
  if (!path.startsWith('/') || path.startsWith('//') || hasScheme) {
    throw new AuthApiError(0, {
      code: 'invalid_api_path',
      message: 'Authenticated API requests must use same-origin relative URLs.'
    })
  }
}

export function getCsrfToken() {
  if (typeof document === 'undefined') return ''
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('indicare_csrf=') || part.startsWith('__Host-indicare_csrf='))
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
}

export function isAuthFailureStatus(status: number) {
  return status === 401 || status === 403
}

export function isAuthFailureError(error: unknown) {
  return error instanceof AuthApiError && isAuthFailureStatus(error.status)
}

export async function authFetchResponse(path: string, init: RequestInit = {}): Promise<Response> {
  assertRelativeApiPath(path)
  const method = (init.method || 'GET').toUpperCase()
  const csrfToken = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? getCsrfToken() : ''
  const headers = new Headers(init.headers)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  return fetch(path, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers
  })
}

export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authFetchResponse(path, init)

  const payload = await response.json().catch(() => undefined)

  if (!response.ok) {
    throw new AuthApiError(response.status, detailFromPayload(payload))
  }

  return payload as T
}
