import { authFetchResponse } from '@/lib/auth/api'

import type { OrbVoiceRealtimeBetaStatus } from './orb-voice-v2-types.ts'

export async function fetchOrbVoiceRealtimeBetaStatus(): Promise<OrbVoiceRealtimeBetaStatus> {
  try {
    const response = await authFetchResponse('/orb/voice/realtime/status', { method: 'GET' })
    if (!response.ok) {
      return { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: false }
    }
    const data = (await response.json()) as Record<string, unknown>
    return {
      available: Boolean(data.available),
      reason: typeof data.reason === 'string' ? data.reason : undefined,
      mode: typeof data.mode === 'string' ? data.mode : undefined,
      transport: typeof data.transport === 'string' ? data.transport : null,
      hybridSpeech: Boolean(data.hybridSpeech),
      fallback: 'voice_v2'
    }
  } catch {
    return { available: false, reason: 'not_configured', fallback: 'voice_v2', hybridSpeech: false }
  }
}

export async function requestOrbVoiceRealtimeBetaToken(): Promise<{
  ok: boolean
  reason?: string
  useSessionEndpoint?: string
}> {
  try {
    const response = await authFetchResponse('/orb/voice/realtime/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if (!response.ok) return { ok: false, reason: `token_${response.status}` }
    const data = (await response.json()) as Record<string, unknown>
    return {
      ok: Boolean(data.ok),
      reason: typeof data.reason === 'string' ? data.reason : undefined,
      useSessionEndpoint:
        typeof data.useSessionEndpoint === 'string' ? data.useSessionEndpoint : undefined
    }
  } catch {
    return { ok: false, reason: 'network' }
  }
}
