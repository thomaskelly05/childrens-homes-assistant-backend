/**
 * Clear stale ORB browser state when auth/access returns 401.
 */

import { resetOrbAccessLoadingDeadline } from '@/lib/orb/orb-access-loading-deadline'
import { recordOrbAuthDebugEvent } from '@/lib/orb/orb-auth-debug-events'
import { resetOrbAuthLoadingDeadline } from '@/lib/orb/orb-auth-loading-deadline'
import { clearOrbRouteLoopGuard } from '@/lib/orb/orb-route-loop-guard'
import { resetOrbSessionGate } from '@/lib/orb/orb-session-gate'
import { clearSensitiveBrowserState } from '@/lib/security/privacy'

const AUTH_CACHE_KEY = 'indicare.auth.identity.v1'
const ORB_ACCESS_CACHE_PREFIX = 'orb-access-cache'
const ORB_WRITE_HANDOFF_PREFIX = 'orb-write-handoff'
const RETURN_URL_LOOP_KEYS = ['orb-return-url', 'orb-pending-return']

function removeKeysMatching(storage: Storage, patterns: RegExp[]) {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && patterns.some((p) => p.test(key))) keys.push(key)
  }
  for (const key of keys) storage.removeItem(key)
}

function clearReturnUrlLoops() {
  if (typeof window === 'undefined') return
  for (const storage of [window.localStorage, window.sessionStorage]) {
    removeKeysMatching(storage, [
      /^orb-return/i,
      /^returnUrl/i,
      /return-url/i,
      /^indicare\.orb\.redirect/i
    ])
    for (const key of RETURN_URL_LOOP_KEYS) {
      storage.removeItem(key)
    }
  }
}

export function clearStaleOrbSessionState(reason: 'auth_401' | 'access_401' = 'access_401'): void {
  if (typeof window === 'undefined') return

  recordOrbAuthDebugEvent('stale_session_clear', { reason })

  try {
    window.sessionStorage.removeItem(AUTH_CACHE_KEY)
    window.localStorage.removeItem(AUTH_CACHE_KEY)
  } catch {
    // ignore
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    removeKeysMatching(storage, [
      new RegExp(`^${ORB_ACCESS_CACHE_PREFIX}`),
      /^orb\.session-gate/i,
      /^orb-session-gate/i,
      /^orb:access/i,
      /^indicare\.orb\.access/i
    ])
  }

  if (reason === 'access_401' || reason === 'auth_401') {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      removeKeysMatching(storage, [new RegExp(`^${ORB_WRITE_HANDOFF_PREFIX}`)])
    }
  }

  clearReturnUrlLoops()
  clearSensitiveBrowserState()
  resetOrbAuthLoadingDeadline()
  resetOrbAccessLoadingDeadline()
  resetOrbSessionGate()
  clearOrbRouteLoopGuard()
}
