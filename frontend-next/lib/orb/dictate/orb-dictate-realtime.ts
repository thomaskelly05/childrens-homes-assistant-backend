/**
 * ORB Dictate server-backed realtime transcription (OpenAI Realtime WebRTC).
 */

import { authFetch } from '@/lib/auth/api'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { fetchOrbVoiceRealtimeStatus } from '@/lib/orb/voice/orb-realtime-availability'
import { OrbOpenAIRealtimeWebRTCClient } from '@/lib/orb/voice/orb-openai-realtime-webrtc-client'

export type OrbDictateRealtimeSessionResponse = {
  ok: boolean
  configured: boolean
  session_id?: string
  provider?: string | null
  model?: string | null
  openai_session?: {
    client_secret?: { value?: string; expires_at?: number | string }
    model?: string
  }
  reason: 'configured' | 'not_configured'
  message?: string
}

export type OrbDictateRealtimeCallbacks = {
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onError?: (message: string) => void
}

const NOT_CONFIGURED_MESSAGE =
  'Realtime transcription is not configured. Paste transcript or upload audio.'

export async function isOrbDictateRealtimeAvailable(): Promise<boolean> {
  const status = await fetchOrbVoiceRealtimeStatus()
  return Boolean(status.ok && status.realtime_enabled)
}

function extractClientSecret(session: OrbDictateRealtimeSessionResponse): string | null {
  const secret = session.openai_session?.client_secret
  if (!secret?.value) return null
  return String(secret.value)
}

export async function requestOrbDictateRealtimeSession(): Promise<OrbDictateRealtimeSessionResponse> {
  emitOrbClientDebug({ area: 'dictate', event: 'dictate_realtime_session_requested', detail: {} })
  try {
    const payload = await authFetch('/orb/dictate/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if (!payload || typeof payload !== 'object') {
      return { ok: false, configured: false, reason: 'not_configured', message: NOT_CONFIGURED_MESSAGE }
    }
    const data = payload as OrbDictateRealtimeSessionResponse
    return {
      ok: Boolean(data.ok ?? true),
      configured: Boolean(data.configured),
      session_id: data.session_id,
      provider: data.provider ?? null,
      model: data.model ?? data.openai_session?.model ?? 'gpt-realtime',
      openai_session: data.openai_session,
      reason: data.configured ? 'configured' : 'not_configured',
      message: data.message
    }
  } catch {
    return { ok: false, configured: false, reason: 'not_configured', message: NOT_CONFIGURED_MESSAGE }
  }
}

export class OrbDictateRealtimeTranscription {
  private client: OrbOpenAIRealtimeWebRTCClient | null = null
  private partial = ''
  private finals: string[] = []

  async start(callbacks: OrbDictateRealtimeCallbacks): Promise<boolean> {
    const session = await requestOrbDictateRealtimeSession()
    if (!session.configured) {
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_realtime_session_failed',
        detail: { reason: session.reason, message: session.message }
      })
      callbacks.onError?.(session.message ?? NOT_CONFIGURED_MESSAGE)
      return false
    }

    const clientSecret = extractClientSecret(session)
    if (!clientSecret) {
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_realtime_session_failed',
        detail: { reason: 'missing_client_secret' }
      })
      callbacks.onError?.('Realtime session did not include credentials.')
      return false
    }

    this.client = new OrbOpenAIRealtimeWebRTCClient({
      onPartialTranscript: (text) => {
        this.partial = text
        emitOrbClientDebug({
          area: 'dictate',
          event: 'dictate_realtime_transcript_delta',
          detail: { length: text.length }
        })
        callbacks.onPartialTranscript?.(text)
      },
      onFinalTranscript: (text) => {
        this.partial = ''
        if (text.trim()) {
          this.finals.push(text.trim())
          emitOrbClientDebug({
            area: 'dictate',
            event: 'dictate_realtime_transcript_final',
            detail: { length: text.length }
          })
          callbacks.onFinalTranscript?.(text.trim())
        }
      },
      onError: (message) => {
        emitOrbClientDebug({
          area: 'dictate',
          event: 'dictate_realtime_session_failed',
          detail: { error: message }
        })
        callbacks.onError?.(message)
      }
    })

    try {
      await this.client.connect({
        clientSecret,
        model: session.model ?? 'gpt-realtime',
        transcriptionOnly: true
      })
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_realtime_session_started',
        detail: { sessionId: session.session_id, provider: session.provider }
      })
      return true
    } catch (error) {
      this.client?.close()
      this.client = null
      const message = error instanceof Error ? error.message : 'Realtime transcription failed to start.'
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_realtime_session_failed',
        detail: { error: message }
      })
      callbacks.onError?.(message)
      return false
    }
  }

  stop(): string {
    const trailing = this.partial.trim()
    if (trailing) this.finals.push(trailing)
    this.partial = ''
    this.client?.close()
    this.client = null
    return this.finals.join('\n').trim()
  }

  get isActive(): boolean {
    return Boolean(this.client?.isConnected)
  }
}
