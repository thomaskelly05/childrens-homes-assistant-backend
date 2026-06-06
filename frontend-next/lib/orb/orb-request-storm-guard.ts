import { isOrbAuthDebugEnabled } from '@/lib/orb/orb-auth-debug-events'

type OrbTrackedRoute =
  | 'verdict'
  | 'auth_me'
  | 'access'
  | 'projects'
  | 'config'
  | 'voice_status'
  | 'outputs_summary'
  | 'passkey_status'
  | 'conversation_stream'

const BOOTSTRAP_WINDOW_MS = 5_000
const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
const counts = new Map<OrbTrackedRoute, number>()
const duplicateWarnings = new Set<string>()

export function resetOrbRequestStormGuard(): void {
  counts.clear()
  duplicateWarnings.clear()
}

function withinBootstrapWindow(): boolean {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return now - startedAt <= BOOTSTRAP_WINDOW_MS
}

export function recordOrbBootstrapRequest(route: OrbTrackedRoute): void {
  const next = (counts.get(route) || 0) + 1
  counts.set(route, next)
  if (!isOrbAuthDebugEnabled() || !withinBootstrapWindow() || next <= 1) {
    return
  }
  const key = `${route}:${next}`
  if (duplicateWarnings.has(key)) {
    return
  }
  duplicateWarnings.add(key)
  console.warn(`[orb-debug] duplicate bootstrap request during first 5s: ${route} (#${next})`)
}

export function getOrbBootstrapRequestCounts(): Record<OrbTrackedRoute, number> {
  return {
    verdict: counts.get('verdict') || 0,
    auth_me: counts.get('auth_me') || 0,
    access: counts.get('access') || 0,
    projects: counts.get('projects') || 0,
    config: counts.get('config') || 0,
    voice_status: counts.get('voice_status') || 0,
    outputs_summary: counts.get('outputs_summary') || 0,
    passkey_status: counts.get('passkey_status') || 0,
    conversation_stream: counts.get('conversation_stream') || 0
  }
}

let userInitiatedConversationStream = false

export function markOrbUserInitiatedConversationStream(): void {
  userInitiatedConversationStream = true
}

export function resetOrbUserInitiatedConversationStream(): void {
  userInitiatedConversationStream = false
}

export function isOrbUserInitiatedConversationStream(): boolean {
  return userInitiatedConversationStream
}
