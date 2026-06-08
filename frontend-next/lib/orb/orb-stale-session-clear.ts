/**
 * Clear stale ORB browser state when auth/access returns 401.
 */

import { resetOrbAccessLoadingDeadline } from '@/lib/orb/orb-access-loading-deadline'
import { resetOrbAuthLoadingDeadline } from '@/lib/orb/orb-auth-loading-deadline'
import {
  recordOrbAuthRecoveryEvent,
  sessionAuthCookiePresent,
  type OrbAuthRecoveryReason,
  type OrbAuthRecoverySnapshot
} from '@/lib/orb/orb-auth-recovery-diagnostics'
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

export function clearStaleOrbSessionState(
  reason: OrbAuthRecoveryReason = 'access_401',
  overrides: Partial<OrbAuthRecoverySnapshot> = {}
): void {
  if (typeof window === 'undefined') return

  recordOrbAuthRecoveryEvent({
    auth_state: 'stale',
    verdict_status: null,
    cookie_present: sessionAuthCookiePresent(),
    frontend_state_cleared: true,
    session_refresh_attempted: false,
    reason,
    ...overrides
  })

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

  if (reason === 'access_401' || reason === 'auth_me_401' || reason === 'verdict_401') {
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
