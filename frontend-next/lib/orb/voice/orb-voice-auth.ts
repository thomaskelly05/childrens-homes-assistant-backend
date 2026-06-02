/**
 * ORB Voice auth probe — avoids spamming voice status when signed out.
 */

import { authFetchResponse } from '@/lib/auth/api'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'

import type { OrbVoiceAuthStatus } from './orb-voice-ui-state'
import { setOrbVoiceDiagAuthStatus } from './orb-voice-diag'

let cachedAuthStatus: OrbVoiceAuthStatus = 'unknown'
let authProbePromise: Promise<OrbVoiceAuthStatus> | null = null

export function getOrbVoiceCachedAuthStatus(): OrbVoiceAuthStatus {
  return cachedAuthStatus
}

export function resetOrbVoiceAuthCache(): void {
  cachedAuthStatus = 'unknown'
  authProbePromise = null
}

/** Probe GET /auth/me — returns authenticated or unauthenticated without throwing. */
export async function probeOrbVoiceAuth(force = false): Promise<OrbVoiceAuthStatus> {
  if (!force && cachedAuthStatus !== 'unknown') return cachedAuthStatus
  if (!force && authProbePromise) return authProbePromise

  emitOrbClientDebug({ area: 'voice', event: 'voice_auth_check_requested', detail: {} })

  authProbePromise = (async () => {
    try {
      const response = await authFetchResponse('/auth/me', { method: 'GET' })
      if (response.status === 401 || response.status === 403) {
        cachedAuthStatus = 'unauthenticated'
        setOrbVoiceDiagAuthStatus('unauthenticated', 401)
        emitOrbClientDebug({ area: 'voice', event: 'voice_auth_check_unauthenticated', detail: { status: response.status } })
        emitOrbClientDebug({ area: 'voice', event: 'voice_status_skipped_unauthenticated', detail: {} })
        return 'unauthenticated' as const
      }
      if (!response.ok) {
        cachedAuthStatus = 'unknown'
        setOrbVoiceDiagAuthStatus('unknown', response.status)
        return 'unknown' as const
      }
      cachedAuthStatus = 'authenticated'
      setOrbVoiceDiagAuthStatus('authenticated', 200)
      emitOrbClientDebug({ area: 'voice', event: 'voice_auth_check_authenticated', detail: {} })
      return 'authenticated' as const
    } catch {
      cachedAuthStatus = 'unknown'
      setOrbVoiceDiagAuthStatus('unknown', null)
      return 'unknown' as const
    } finally {
      authProbePromise = null
    }
  })()

  return authProbePromise
}

export function markOrbVoiceAuthenticated(): void {
  cachedAuthStatus = 'authenticated'
  setOrbVoiceDiagAuthStatus('authenticated', 200)
}

export function markOrbVoiceUnauthenticated(): void {
  cachedAuthStatus = 'unauthenticated'
  setOrbVoiceDiagAuthStatus('unauthenticated', 401)
}
