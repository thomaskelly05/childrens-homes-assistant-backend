/**
 * ORB auth/access/gate transition diagnostics.
 * Enable with ?debugAuth=1 — never records secrets or sensitive values.
 */

export type OrbAuthDebugEventKind =
  | 'auth_transition'
  | 'access_transition'
  | 'gate_decision'
  | 'redirect_attempt'
  | 'loop_guard'
  | 'stale_session_clear'

export type OrbAuthDebugEvent = {
  at: string
  ms: number
  kind: OrbAuthDebugEventKind
  detail: Record<string, unknown>
}

const STORAGE_KEY = 'orb-auth-debug-events'
const MAX_EVENTS = 120
const REDIRECT_WINDOW_MS = 10_000

let memoryEvents: OrbAuthDebugEvent[] = []
let redirectTimestamps: number[] = []
let lastRedirectReason: string | null = null

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('debugAuth') === '1' || window.sessionStorage.getItem('orb-debug-auth') === '1'
}

function safeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(detail)) {
    const lower = key.toLowerCase()
    if (
      lower.includes('token') ||
      lower.includes('cookie') ||
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('authorization')
    ) {
      out[key] = '[hidden]'
      continue
    }
    if (lower.includes('email') && typeof value === 'string') {
      out[key] = value.includes('@') ? '[redacted]' : value
      continue
    }
    if (typeof value === 'string' && value.length > 200) {
      out[key] = `${value.slice(0, 197)}…`
      continue
    }
    out[key] = value
  }
  return out
}

export function recordOrbAuthDebugEvent(
  kind: OrbAuthDebugEventKind,
  detail: Record<string, unknown> = {}
): void {
  const entry: OrbAuthDebugEvent = {
    at: new Date().toISOString(),
    ms: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0,
    kind,
    detail: safeDetail(detail)
  }
  memoryEvents = [...memoryEvents, entry].slice(-MAX_EVENTS)

  if (typeof window !== 'undefined' && isDebugEnabled()) {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]') as OrbAuthDebugEvent[]
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...stored, entry].slice(-MAX_EVENTS)))
      window.dispatchEvent(new CustomEvent('orb-auth-debug', { detail: entry }))
      // eslint-disable-next-line no-console
      console.info('[ORB_AUTH_DEBUG]', entry)
    } catch {
      // ignore diagnostics failures
    }
  }
}

export function recordOrbRedirectAttempt(target: string, reason: string): void {
  const now = Date.now()
  redirectTimestamps = [...redirectTimestamps.filter((t) => now - t < REDIRECT_WINDOW_MS), now]
  lastRedirectReason = reason
  recordOrbAuthDebugEvent('redirect_attempt', {
    target,
    reason,
    redirectCountLast10s: redirectTimestamps.length
  })
}

export function getOrbRedirectCountLast10s(now: number = Date.now()): number {
  return redirectTimestamps.filter((t) => now - t < REDIRECT_WINDOW_MS).length
}

export function getOrbLastRedirectReason(): string | null {
  return lastRedirectReason
}

export function clearOrbRedirectTracking(): void {
  redirectTimestamps = []
  lastRedirectReason = null
}

export function getOrbAuthDebugEvents(): OrbAuthDebugEvent[] {
  if (typeof window === 'undefined') return [...memoryEvents]
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]') as OrbAuthDebugEvent[]
    return stored.length ? stored : [...memoryEvents]
  } catch {
    return [...memoryEvents]
  }
}

export function clearOrbAuthDebugEvents(): void {
  memoryEvents = []
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(STORAGE_KEY)
  }
}

export function cookiesAppearAvailable(): boolean {
  if (typeof navigator === 'undefined') return false
  try {
    return navigator.cookieEnabled
  } catch {
    return false
  }
}

export function hasAuthHandoffInStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.sessionStorage.getItem('indicare.auth.identity.v1') !== null ||
      window.localStorage.getItem('indicare.auth.identity.v1') !== null
    )
  } catch {
    return false
  }
}

export function isOrbAuthDebugEnabled(): boolean {
  return isDebugEnabled()
}

export function getOrbBuildTimestamp(): string | null {
  return process.env.NEXT_PUBLIC_BUILD_TIMESTAMP ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null
}

export type OrbAuthDebugSnapshot = {
  pathname: string
  authStatus: string
  authUserPresent: boolean
  accessStatus: string
  accessLoading: boolean
  accessError: string | null
  accessHttpStatus: number | null
  gateDecision: string
  lastRedirectReason: string | null
  redirectCountLast10s: number
  authHandoffPresent: boolean
  cookiesAvailable: boolean
  buildTimestamp: string | null
}

export function buildOrbAuthDebugSnapshot(input: {
  pathname: string
  authStatus: string
  authUserPresent: boolean
  accessStatus: string
  accessLoading: boolean
  accessError: string | null
  accessHttpStatus: number | null
  gateDecision: string
}): OrbAuthDebugSnapshot {
  return {
    ...input,
    lastRedirectReason: getOrbLastRedirectReason(),
    redirectCountLast10s: getOrbRedirectCountLast10s(),
    authHandoffPresent: hasAuthHandoffInStorage(),
    cookiesAvailable: cookiesAppearAvailable(),
    buildTimestamp: getOrbBuildTimestamp()
  }
}
