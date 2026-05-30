import { resolveAuthApiPath } from '@/lib/auth/api-base'
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
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (record.detail === 'csrf_failed' && typeof record.message === 'string') {
      return { code: 'csrf_failed', message: record.message }
    }
    if ('detail' in record) {
      const detail = record.detail
      if (detail && typeof detail === 'object') {
        const structured = detail as AuthErrorDetail
        if (structured.code === 'csrf_invalid') {
          return {
            code: 'csrf_invalid',
            message: structured.message || STANDALONE_ORB_CSRF_REFRESH_MESSAGE
          }
        }
        return structured
      }
      if (typeof detail === 'string') return detail
    }
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

export const ORB_AUTH_SIGN_IN_MESSAGE = 'Please sign in to use ORB Residential.'

export function isOrbAuthRequiredStatus(status: number, code?: string) {
  if (status === 401) return true
  if (status !== 403) return false
  const normalized = (code || '').toLowerCase()
  if (!normalized) return false
  if (normalized === 'csrf_failed' || normalized === 'csrf_invalid') return false
  if (normalized.includes('safety_acceptance')) return false
  if (normalized.includes('premium') || normalized.includes('subscription') || normalized.includes('access')) return false
  return normalized.includes('auth') || normalized.includes('session') || normalized.includes('sign_in') || normalized.includes('login')
}

const CSRF_COOKIE_PATTERN = /(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]*)/

export const STANDALONE_ORB_CSRF_REFRESH_MESSAGE =
  'Your session security check failed. Please refresh and try again.'

export function getCsrfToken() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(CSRF_COOKIE_PATTERN)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export function applyCsrfHeaders(headers: Headers, method: string) {
  const normalized = method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized)) return
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }
}

export function isAuthFailureStatus(status: number) {
  return status === 401 || status === 403
}

export function isAuthFailureError(error: unknown) {
  return error instanceof AuthApiError && isAuthFailureStatus(error.status)
}

export function isTemporaryUnavailableStatus(status: number) {
  return status === 503 || status === 502 || status === 504
}

export function isTemporaryUnavailableError(error: unknown) {
  return error instanceof AuthApiError && isTemporaryUnavailableStatus(error.status)
}

export async function authFetchResponse(path: string, init: RequestInit = {}): Promise<Response> {
  assertRelativeApiPath(path)
  const resolvedPath = resolveAuthApiPath(path)
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  applyCsrfHeaders(headers, method)

  return fetch(resolvedPath, {
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
