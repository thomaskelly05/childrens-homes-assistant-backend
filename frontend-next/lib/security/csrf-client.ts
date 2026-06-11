/**
 * Browser CSRF helpers for same-origin API clients.
 * Reads the indicare_csrf / __Host-indicare_csrf cookie set by the backend on login.
 */

import { applyCsrfHeaders, getCsrfToken, STANDALONE_ORB_CSRF_REFRESH_MESSAGE } from '@/lib/auth/api'

export { applyCsrfHeaders, getCsrfToken, STANDALONE_ORB_CSRF_REFRESH_MESSAGE }

export const EVALUATION_CSRF_REFRESH_MESSAGE =
  'Session security check failed. Please refresh, sign in again, and retry. If this continues, the evaluation CSRF token is not being forwarded correctly.'

/** Build headers for an unsafe same-origin evaluation API request. */
export function buildUnsafeMethodHeaders(
  method: string,
  extra?: Record<string, string>
): Record<string, string> {
  const headers = new Headers(extra)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  applyCsrfHeaders(headers, method)
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

export function isCsrfFailedPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as Record<string, unknown>
  if (record.detail === 'csrf_failed') return true
  if (record.code === 'csrf_failed') return true
  if (typeof record.error === 'string') {
    try {
      const parsed = JSON.parse(record.error) as Record<string, unknown>
      return parsed.detail === 'csrf_failed'
    } catch {
      return record.error.includes('csrf_failed')
    }
  }
  return false
}

export function csrfFailureMessage(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message
    }
    if (typeof record.error === 'string') {
      try {
        const parsed = JSON.parse(record.error) as Record<string, unknown>
        if (typeof parsed.message === 'string' && parsed.message.trim()) {
          return parsed.message
        }
      } catch {
        // fall through
      }
    }
  }
  return EVALUATION_CSRF_REFRESH_MESSAGE
}
