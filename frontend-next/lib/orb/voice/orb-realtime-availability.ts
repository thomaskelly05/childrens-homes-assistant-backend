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
    const { setOrbVoiceDiagStatus, registerOrbVoiceDiagGlobal } = await import('./orb-voice-diag')
    registerOrbVoiceDiagGlobal()
    emitOrbClientDebug({ area: 'voice', event: 'voice_status_requested', detail: {} })
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
    setOrbVoiceDiagStatus(status)
    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_status_received',
      detail: {
        configured: status.reason === 'configured',
        realtime_enabled: status.realtime_enabled,
        provider: status.provider,
        reason: status.reason
      }
    })
    if (!status.realtime_enabled) {
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_session_unavailable',
        detail: { reason: status.reason }
      })
    }
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
  /** True when WebRTC peer, data channel, or remote track is active. */
  transportLive?: boolean
}

const TRANSPORT_LIVE_WAIT_MS = 12_000

function extractClientSecretValue(session: OrbVoiceSessionResponse): string | null {
  const secret = session.openai_session?.client_secret
  if (!secret) return null
  if (typeof secret === 'object' && secret.value) return String(secret.value)
  return null
}

async function waitForVoiceTransportLive(timeoutMs: number): Promise<boolean> {
  const { getOrbVoiceTransportLive } = await import('./orb-voice-diag')
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (getOrbVoiceTransportLive()) return true
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  return getOrbVoiceTransportLive()
}

/** Start a configured realtime voice session (OpenAI WebRTC or WebSocket). */
export async function beginOrbRealtimeVoiceConversation(options: {
  mode?: string
  voice_id?: string
}): Promise<BeginOrbRealtimeVoiceResult> {
  const { emitOrbClientDebug } = await import('@/lib/orb/orb-client-debug')
  const {
    resetOrbVoiceDiagTransport,
    setOrbVoiceDiagSessionResponse,
    registerOrbVoiceDiagGlobal
  } = await import('./orb-voice-diag')
  const {
    clearActiveOrbRealtimeVoiceClient,
    registerActiveOrbRealtimeVoiceClient
  } = await import('./orb-voice-session-registry')

  registerOrbVoiceDiagGlobal()
  resetOrbVoiceDiagTransport()
  clearActiveOrbRealtimeVoiceClient()

  emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_session_requested', detail: {} })

  const { OrbRealtimeVoiceClient } = await import('./orb-realtime-voice-client')
  const client = new OrbRealtimeVoiceClient({
    onProviderResolved: (session) => {
      setOrbVoiceDiagSessionResponse({
        session_id: session.session_id,
        status: session.status,
        provider: session.provider,
        hasClientSecret: Boolean(extractClientSecretValue(session)),
        model: session.openai_session?.model ?? null
      })
    }
  })
  try {
    const session = await client.startSession({
      mode: options.mode as import('./orb-voice-types').OrbVoiceModeId | undefined,
      voice_id: options.voice_id as import('./orb-voice-types').OrbVoicePresetId | undefined,
      transport: 'auto'
    })

    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_realtime_session_received',
      detail: {
        hasClientSecret: Boolean(extractClientSecretValue(session)),
        sessionId: session.session_id,
        model: session.openai_session?.model ?? null,
        provider: session.provider,
        status: session.status
      }
    })

    if (!sessionHasRealtimeProvider(session)) {
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_session_unavailable',
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

    emitOrbClientDebug({ area: 'voice', event: 'voice_mic_requested', detail: {} })
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
    emitOrbClientDebug({ area: 'voice', event: 'voice_mic_started', detail: {} })

    registerActiveOrbRealtimeVoiceClient(client, session)

    const transportLive =
      session.provider === 'websocket_realtime'
        ? client.usesWebSocket
        : await waitForVoiceTransportLive(TRANSPORT_LIVE_WAIT_MS)

    if (!transportLive && session.provider === 'openai_realtime') {
      clearActiveOrbRealtimeVoiceClient()
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_session_unavailable',
        detail: { reason: 'webrtc_transport_failed' }
      })
      return {
        ok: false,
        session,
        transportLive: false,
        error: 'Live voice could not connect. Dictate is ready.'
      }
    }

    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_realtime_session_started',
      detail: { provider: session.provider, sessionId: session.session_id, transportLive }
    })
    if (transportLive) {
      emitOrbClientDebug({ area: 'voice', event: 'voice_session_live', detail: { provider: session.provider } })
    }
    return { ok: true, session, transportLive }
  } catch (error) {
    clearActiveOrbRealtimeVoiceClient()
    const message = error instanceof Error ? error.message : 'Realtime voice session failed.'
    emitOrbClientDebug({ area: 'voice', event: 'voice_realtime_session_failed', detail: { error: message } })
    return { ok: false, error: message, transportLive: false }
  }
}

export { clearActiveOrbRealtimeVoiceClient } from './orb-voice-session-registry'
