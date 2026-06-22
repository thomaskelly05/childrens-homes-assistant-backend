import { authFetchResponse } from '@/lib/auth/api'

import type { OrbVoiceRealtimeBetaStatus } from './orb-voice-v2-types.ts'

const FALLBACK_STATUS: OrbVoiceRealtimeBetaStatus = {
  available: false,
  provider: 'none',
  reason: 'not_configured',
  mode: 'fallback',
  hybridSpeech: false,
  fallback: 'voice_v2'
}

function normaliseRealtimeStatus(data: Record<string, unknown>): OrbVoiceRealtimeBetaStatus {
  const provider = typeof data.provider === 'string' ? data.provider : data.available ? 'openai' : 'none'
  const mode = typeof data.mode === 'string' ? data.mode : undefined
  return {
    available: Boolean(data.available),
    provider,
    reason: typeof data.reason === 'string' ? data.reason : data.available ? null : 'not_configured',
    mode: (mode as OrbVoiceRealtimeBetaStatus['mode']) ?? (data.available ? 'webrtc' : 'fallback'),
    model: typeof data.model === 'string' ? data.model : null,
    transcriptionModel:
      typeof data.transcriptionModel === 'string'
        ? data.transcriptionModel
        : typeof data.transcription_model === 'string'
          ? data.transcription_model
          : null,
    transport: typeof data.transport === 'string' ? data.transport : null,
    hybridSpeech: Boolean(data.hybridSpeech ?? data.hybrid_speech),
    fallback: 'voice_v2'
  }
}

export async function fetchOrbVoiceRealtimeBetaStatus(): Promise<OrbVoiceRealtimeBetaStatus> {
  try {
    const response = await authFetchResponse('/orb/voice/realtime/status', { method: 'GET' })
    if (!response.ok) return { ...FALLBACK_STATUS }
    const data = (await response.json()) as Record<string, unknown>
    return normaliseRealtimeStatus(data)
  } catch {
    return { ...FALLBACK_STATUS }
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
