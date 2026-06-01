import { AuthApiError, isAuthFailureStatus } from '@/lib/auth/api'

export type OrbBackendSyncState = 'unknown' | 'ready' | 'degraded' | 'offline'

type GateSnapshot = {
  backendSyncState: OrbBackendSyncState
  lastAuthFailureAt: number | null
  lastServerFailureAt: number | null
  suppressUntil: number
}

const SUPPRESS_MS_AFTER_AUTH_FAILURE = 45_000
const SUPPRESS_MS_AFTER_SERVER_FAILURE = 20_000

let snapshot: GateSnapshot = {
  backendSyncState: 'unknown',
  lastAuthFailureAt: null,
  lastServerFailureAt: null,
  suppressUntil: 0
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function getOrbSessionGateSnapshot(): Readonly<GateSnapshot> {
  return snapshot
}

export function subscribeOrbSessionGate(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetOrbSessionGate(): void {
  snapshot = {
    backendSyncState: 'unknown',
    lastAuthFailureAt: null,
    lastServerFailureAt: null,
    suppressUntil: 0
  }
  emit()
}

export function markOrbBackendReady(): void {
  snapshot = {
    ...snapshot,
    backendSyncState: 'ready',
    lastAuthFailureAt: null,
    lastServerFailureAt: null,
    suppressUntil: 0
  }
  emit()
}

export function markOrbBackendDegraded(reason: 'auth' | 'server'): void {
  const now = Date.now()
  const suppressMs =
    reason === 'auth' ? SUPPRESS_MS_AFTER_AUTH_FAILURE : SUPPRESS_MS_AFTER_SERVER_FAILURE
  snapshot = {
    backendSyncState: reason === 'auth' ? 'offline' : 'degraded',
    lastAuthFailureAt: reason === 'auth' ? now : snapshot.lastAuthFailureAt,
    lastServerFailureAt: reason === 'server' ? now : snapshot.lastServerFailureAt,
    suppressUntil: Math.max(snapshot.suppressUntil, now + suppressMs)
  }
  emit()
}

export function shouldSkipAuthenticatedOrbFetch(): boolean {
  if (snapshot.backendSyncState === 'ready') return false
  return Date.now() < snapshot.suppressUntil
}

export function classifyOrbFetchError(error: unknown): 'auth' | 'server' | 'other' {
  if (error instanceof AuthApiError) {
    if (isAuthFailureStatus(error.status)) return 'auth'
    if (error.status >= 500) return 'server'
  }
  if (error instanceof Error && /401|403|unauthorized|session/i.test(error.message)) return 'auth'
  if (error instanceof Error && /500|503|server|unavailable/i.test(error.message)) return 'server'
  return 'other'
}

export function recordOrbFetchOutcome(error: unknown | null): void {
  if (!error) {
    markOrbBackendReady()
    return
  }
  const kind = classifyOrbFetchError(error)
  if (kind === 'auth') markOrbBackendDegraded('auth')
  else if (kind === 'server') markOrbBackendDegraded('server')
}
