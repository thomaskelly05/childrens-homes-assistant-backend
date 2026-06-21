/**
 * ORB Voice realtime availability — honest server config probe (no fake sessions).
 */

import { AuthApiError, authFetchResponse } from '@/lib/auth/api'

import { isRealtimeVoiceProvider, type OrbVoiceSessionResponse } from './orb-voice-client'
import { getOrbVoiceCachedAuthStatus, markOrbVoiceUnauthenticated, probeOrbVoiceAuth } from './orb-voice-auth'
import type { OrbRealtimeVoiceState } from './orb-realtime-voice-client'

export type OrbVoiceRuntimeDiagnostics = {
  ttsEnabled: boolean
  preferredProvider: 'elevenlabs' | 'openai' | 'browser' | 'text_only' | string
  elevenLabsConfigured: boolean
  katherineConfigured: boolean
  forcedProvider?: string | null
  serverTranscriptionAvailable: boolean
}

export type OrbRealtimeVoiceStatus = {
  ok: boolean
  realtime_enabled: boolean
  provider: string | null
  model?: string | null
  requires_client_secret?: boolean
  reason: 'configured' | 'not_configured' | 'endpoint_failed'
  runtime?: OrbVoiceRuntimeDiagnostics
}

export type OrbRealtimeVoiceAvailability = {
  realtimeVoiceAvailable: boolean
  reason: OrbRealtimeVoiceStatus['reason']
  status?: OrbRealtimeVoiceStatus
}

import { isOrbRealtimeStatusConfigured } from './orb-voice-ui-state'

export { isOrbRealtimeStatusConfigured, ORB_REALTIME_CONFIGURED_PROVIDERS } from './orb-voice-ui-state'

const DEFAULT_UNAVAILABLE: OrbRealtimeVoiceAvailability = {
  realtimeVoiceAvailable: false,
  reason: 'not_configured'
}

const STATUS_UNAVAILABLE: OrbRealtimeVoiceStatus = {
  ok: false,
  realtime_enabled: false,
  provider: null,
  reason: 'endpoint_failed'
}

let cachedVoiceStatus: { value: OrbRealtimeVoiceStatus; fetchedAt: number } | null = null
const VOICE_STATUS_CACHE_MS = 60_000

export type OrbVoiceTranscriptCallbacks = {
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onAssistantDelta?: (delta: string) => void
  onAssistantDone?: (text: string) => void
  onStateChange?: (state: OrbRealtimeVoiceState) => void
}

/** Probe GET /orb/voice/session/status — never throws; skips when unauthenticated. */
export async function fetchOrbVoiceRealtimeStatus(): Promise<OrbRealtimeVoiceStatus> {
  const { emitOrbClientDebug } = await import('@/lib/orb/orb-client-debug')
  const { setOrbVoiceDiagStatus, registerOrbVoiceDiagGlobal } = await import('./orb-voice-diag')
  registerOrbVoiceDiagGlobal()

  const auth = await probeOrbVoiceAuth()
  if (auth === 'unauthenticated') {
    emitOrbClientDebug({ area: 'voice', event: 'voice_status_skipped_unauthenticated', detail: {} })
    return STATUS_UNAVAILABLE
  }

  const { shouldAllowOrbProductFetch, recordOrbVoiceStatusBootstrapRequest } = await import(
    '@/lib/orb/orb-product-bootstrap-guard'
  )
  if (!shouldAllowOrbProductFetch('voice_session_status')) {
    emitOrbClientDebug({ area: 'voice', event: 'voice_status_skipped_gate', detail: {} })
    return STATUS_UNAVAILABLE
  }
  recordOrbVoiceStatusBootstrapRequest()

  if (cachedVoiceStatus && Date.now() - cachedVoiceStatus.fetchedAt < VOICE_STATUS_CACHE_MS) {
    return cachedVoiceStatus.value
  }

  try {
    emitOrbClientDebug({ area: 'voice', event: 'voice_status_requested', detail: {} })
    const response = await authFetchResponse('/orb/voice/session/status', { method: 'GET' })
    if (response.status === 401 || response.status === 402 || response.status === 403) {
      if (response.status === 401) markOrbVoiceUnauthenticated()
      const { handleOrbProductBootstrapBlockedResponse } = await import('@/lib/orb/orb-product-bootstrap-response')
      handleOrbProductBootstrapBlockedResponse(
        'voice_session_status',
        new AuthApiError(response.status, { message: 'ORB voice bootstrap blocked' })
      )
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_status_skipped_unauthenticated',
        detail: { status: response.status }
      })
      setOrbVoiceDiagStatus(STATUS_UNAVAILABLE, response.status)
      return STATUS_UNAVAILABLE
    }
    const payload = await response.json().catch(() => undefined)
    if (!response.ok || !payload || typeof payload !== 'object') {
      setOrbVoiceDiagStatus(STATUS_UNAVAILABLE, response.status)
      return STATUS_UNAVAILABLE
    }
    const data = payload as Record<string, unknown>
    const runtime: OrbVoiceRuntimeDiagnostics = {
      ttsEnabled: Boolean(data.ttsEnabled),
      preferredProvider:
        typeof data.preferredProvider === 'string' ? data.preferredProvider : 'text_only',
      elevenLabsConfigured: Boolean(data.elevenLabsConfigured),
      katherineConfigured: Boolean(data.katherineConfigured),
      forcedProvider: typeof data.forcedProvider === 'string' ? data.forcedProvider : null,
      serverTranscriptionAvailable: Boolean(data.serverTranscriptionAvailable)
    }
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
            : 'not_configured',
      runtime
    }
    setOrbVoiceDiagStatus(status, response.status)
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
    cachedVoiceStatus = { value: status, fetchedAt: Date.now() }
    return status
  } catch (error) {
    if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) {
      markOrbVoiceUnauthenticated()
      emitOrbClientDebug({ area: 'voice', event: 'voice_status_skipped_unauthenticated', detail: {} })
    }
    return STATUS_UNAVAILABLE
  }
}

export async function isOrbRealtimeVoiceAvailable(): Promise<OrbRealtimeVoiceAvailability> {
  if (getOrbVoiceCachedAuthStatus() === 'unauthenticated') {
    return DEFAULT_UNAVAILABLE
  }
  const status = await fetchOrbVoiceRealtimeStatus()
  if (!isOrbRealtimeStatusConfigured(status)) {
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
  transcript?: OrbVoiceTranscriptCallbacks
  /** Route answers through /orb/standalone/conversation instead of OpenAI Realtime. */
  brainRouted?: boolean
}): Promise<BeginOrbRealtimeVoiceResult> {
  const { emitOrbClientDebug } = await import('@/lib/orb/orb-client-debug')
  const {
    resetOrbVoiceDiagTransport,
    setOrbVoiceDiagSessionResponse,
    registerOrbVoiceDiagGlobal,
    setOrbVoiceDiagLastEvent
  } = await import('./orb-voice-diag')
  const {
    clearActiveOrbRealtimeVoiceClient,
    registerActiveOrbRealtimeVoiceClient
  } = await import('./orb-voice-session-registry')

  const auth = await probeOrbVoiceAuth()
  if (auth === 'unauthenticated') {
    return { ok: false, error: 'Sign in to use ORB Voice.' }
  }

  registerOrbVoiceDiagGlobal()
  resetOrbVoiceDiagTransport()
  clearActiveOrbRealtimeVoiceClient()

  emitOrbClientDebug({ area: 'voice', event: 'voice_session_requested', detail: {} })
  setOrbVoiceDiagLastEvent('voice_session_requested')

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
    },
    onPartialTranscript: (text) => {
      setOrbVoiceDiagLastEvent('voice_user_transcript_delta')
      emitOrbClientDebug({ area: 'voice', event: 'voice_user_transcript_delta', detail: { length: text.length } })
      options.transcript?.onPartialTranscript?.(text)
    },
    onFinalTranscript: (text) => {
      setOrbVoiceDiagLastEvent('voice_user_transcript_done')
      emitOrbClientDebug({ area: 'voice', event: 'voice_user_transcript_done', detail: { length: text.length } })
      options.transcript?.onFinalTranscript?.(text)
    },
    onAssistantDelta: (delta) => {
      setOrbVoiceDiagLastEvent('voice_assistant_transcript_delta')
      emitOrbClientDebug({ area: 'voice', event: 'voice_assistant_transcript_delta', detail: { length: delta.length } })
      options.transcript?.onAssistantDelta?.(delta)
    },
    onAssistantDone: (text) => {
      setOrbVoiceDiagLastEvent('voice_response_done')
      emitOrbClientDebug({ area: 'voice', event: 'voice_response_done', detail: { length: text.length } })
      options.transcript?.onAssistantDone?.(text)
    },
    onStateChange: (state) => {
      if (state === 'thinking') {
        setOrbVoiceDiagLastEvent('voice_response_started')
        emitOrbClientDebug({ area: 'voice', event: 'voice_response_started', detail: {} })
      }
      options.transcript?.onStateChange?.(state)
    }
  })
  try {
    const session = await client.startSession({
      mode: options.mode as import('./orb-voice-types').OrbVoiceModeId | undefined,
      voice_id: options.voice_id as import('./orb-voice-types').OrbVoicePresetId | undefined,
      transport: 'auto',
      brainRouted: options.brainRouted
    })

    emitOrbClientDebug({
      area: 'voice',
      event: 'voice_session_received',
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
        error: session.message || session.fallback_reason || 'Live voice could not connect.'
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
      emitOrbClientDebug({ area: 'voice', event: 'voice_transport_live', detail: { provider: session.provider } })
      setOrbVoiceDiagLastEvent('voice_transport_live')
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
