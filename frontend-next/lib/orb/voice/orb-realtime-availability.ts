/**
 * ORB Voice realtime availability — honest server config probe (no fake sessions).
 */

import { authFetch } from '@/lib/auth/api'

import { isRealtimeVoiceProvider, type OrbVoiceSessionResponse } from './orb-voice-client'

export type OrbRealtimeVoiceStatus = {
  ok: boolean
  realtime_enabled: boolean
  provider: string | null
  model?: string | null
  requires_client_secret?: boolean
  reason: 'configured' | 'not_configured' | 'endpoint_failed'
}

export type OrbRealtimeVoiceAvailability = {
  realtimeVoiceAvailable: boolean
  reason: OrbRealtimeVoiceStatus['reason']
  status?: OrbRealtimeVoiceStatus
}

const DEFAULT_UNAVAILABLE: OrbRealtimeVoiceAvailability = {
  realtimeVoiceAvailable: false,
  reason: 'not_configured'
}

/** Probe GET /orb/voice/session/status — never throws; 500 → unavailable. */
export async function fetchOrbVoiceRealtimeStatus(): Promise<OrbRealtimeVoiceStatus> {
  try {
    const { emitOrbClientDebug } = await import('@/lib/orb/orb-client-debug')
    const payload = await authFetch('/orb/voice/session/status', { method: 'GET' })
    if (!payload || typeof payload !== 'object') {
      return { ok: false, realtime_enabled: false, provider: null, reason: 'endpoint_failed' }
    }
    const data = payload as Record<string, unknown>
    const status: OrbRealtimeVoiceStatus = {
      ok: Boolean(data.ok ?? true),
      realtime_enabled: Boolean(data.realtime_enabled),
      provider: typeof data.provider === 'string' ? data.provider : data.provider === null ? null : null,
      model: typeof data.model === 'string' ? data.model : null,
      requires_client_secret: Boolean(data.requires_client_secret),
      reason:
        data.reason === 'configured' || data.reason === 'not_configured' || data.reason === 'endpoint_failed'
          ? data.reason
          : data.realtime_enabled
            ? 'configured'
            : 'not_configured'
    }
    emitOrbClientDebug({
      area: 'voice',
      event: 'realtime_status',
      detail: {
        realtime_enabled: status.realtime_enabled,
        provider: status.provider,
        reason: status.reason
      }
    })
    return status
  } catch {
    return { ok: false, realtime_enabled: false, provider: null, reason: 'endpoint_failed' }
  }
}

export async function isOrbRealtimeVoiceAvailable(): Promise<OrbRealtimeVoiceAvailability> {
  const status = await fetchOrbVoiceRealtimeStatus()
  if (!status.ok || !status.realtime_enabled) {
    return {
      realtimeVoiceAvailable: false,
      reason: status.reason === 'endpoint_failed' ? 'endpoint_failed' : 'not_configured',
      status
    }
  }
  return { realtimeVoiceAvailable: true, reason: 'configured', status }
}

/** True when a session response represents a duplex realtime provider (not browser_fallback). */
export function sessionHasRealtimeProvider(session: OrbVoiceSessionResponse): boolean {
  return isRealtimeVoiceProvider(session)
}

export type BeginOrbRealtimeVoiceResult = {
  ok: boolean
  session?: OrbVoiceSessionResponse
  error?: string
}

/** Start a configured realtime voice session (OpenAI WebRTC or WebSocket). */
export async function beginOrbRealtimeVoiceConversation(options: {
  mode?: string
  voice_id?: string
}): Promise<BeginOrbRealtimeVoiceResult> {
  const { emitOrbClientDebug } = await import('@/lib/orb/orb-client-debug')
  emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_session_requested', detail: {} })

  const { OrbRealtimeVoiceClient } = await import('./orb-realtime-voice-client')
  const client = new OrbRealtimeVoiceClient()
  try {
    const session = await client.startSession({
      mode: options.mode as import('./orb-voice-types').OrbVoiceModeId | undefined,
      voice_id: options.voice_id as import('./orb-voice-types').OrbVoicePresetId | undefined,
      transport: 'auto'
    })
    if (!sessionHasRealtimeProvider(session)) {
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_realtime_session_failed',
        detail: { reason: session.fallback_reason ?? 'not_configured' }
      })
      return {
        ok: false,
        session,
        error:
          session.message ||
          session.fallback_reason ||
          'Live voice is unavailable right now.'
      }
    }
    const micOk = await client.startMicrophone({ vadEnabled: true, bargeInWhileSpeaking: true })
    if (!micOk) {
      client.stop()
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_realtime_session_failed',
        detail: { error: 'microphone_denied' }
      })
      return { ok: false, session, error: 'Microphone could not connect to the realtime voice session.' }
    }
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_realtime_session_started',
      detail: { provider: session.provider, sessionId: session.session_id }
    })
    emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_audio_started', detail: {} })
    return { ok: true, session }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Realtime voice session failed.'
    emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_session_failed', detail: { error: message } })
    return { ok: false, error: message }
  }
}
