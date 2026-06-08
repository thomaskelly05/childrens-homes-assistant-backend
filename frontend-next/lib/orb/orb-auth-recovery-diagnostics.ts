/**
 * Safe ORB auth recovery diagnostics — no secrets, tokens, or raw cookie values.
 * Enable with ?debugAuth=1 (same gate as orb-auth-debug-events).
 */

import { isOrbAuthDebugEnabled } from '@/lib/orb/orb-auth-debug-events'

export type OrbAuthRecoveryReason =
  | 'access_401'
  | 'auth_me_401'
  | 'verdict_401'
  | 'oauth_error'
  | 'failed_login'
  | 'logout'

export type OrbAuthRecoverySnapshot = {
  auth_state: 'stale' | 'unauthenticated' | string
  verdict_status: number | null
  cookie_present: boolean
  frontend_state_cleared: boolean
  session_refresh_attempted: boolean
  reason: OrbAuthRecoveryReason
}

export type OrbAuthRecoveryEvent = OrbAuthRecoverySnapshot & {
  at: string
  ms: number
}

const STORAGE_KEY = 'orb-auth-recovery-events'
const MAX_EVENTS = 80

const SESSION_COOKIE_HINTS = ['indicare_session=', '__Host-indicare_session=']
const CSRF_COOKIE_HINTS = ['indicare_csrf=', '__Host-indicare_csrf=']

let memoryEvents: OrbAuthRecoveryEvent[] = []

/** Whether readable browser cookies suggest an auth session (never reads values). */
export function sessionAuthCookiePresent(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const raw = document.cookie
    if (SESSION_COOKIE_HINTS.some((hint) => raw.includes(hint))) return true
    if (CSRF_COOKIE_HINTS.some((hint) => raw.includes(hint))) return true
    return false
  } catch {
    return false
  }
}

export function recordOrbAuthRecoveryEvent(snapshot: OrbAuthRecoverySnapshot): void {
  const entry: OrbAuthRecoveryEvent = {
    ...snapshot,
    at: new Date().toISOString(),
    ms: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0
  }
  memoryEvents = [...memoryEvents, entry].slice(-MAX_EVENTS)

  if (typeof window !== 'undefined' && isOrbAuthDebugEnabled()) {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]') as OrbAuthRecoveryEvent[]
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, entry].slice(-MAX_EVENTS)))
      window.dispatchEvent(new CustomEvent('orb-auth-recovery', { detail: entry }))
      // eslint-disable-next-line no-console
      console.info('[ORB_AUTH_RECOVERY]', entry)
    } catch {
      // ignore diagnostics failures
    }
  }
}

export function getOrbAuthRecoveryEvents(): OrbAuthRecoveryEvent[] {
  if (typeof window === 'undefined') return [...memoryEvents]
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]') as OrbAuthRecoveryEvent[]
    return stored.length ? stored : [...memoryEvents]
  } catch {
    return [...memoryEvents]
  }
}

export function clearOrbAuthRecoveryEvents(): void {
  memoryEvents = []
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(STORAGE_KEY)
  }
}
