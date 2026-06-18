/**
 * ORB Voice server transcription — realtime WebRTC + short audio upload.
 * Uses voice_workflows auth. Audio is transient; transcripts are not auto-saved.
 */

import { authFetch, authFetchResponse } from '@/lib/auth/api'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { OrbOpenAIRealtimeWebRTCClient } from '@/lib/orb/voice/orb-openai-realtime-webrtc-client'
import { fetchOrbVoiceRealtimeStatus } from '@/lib/orb/voice/orb-realtime-availability'

export type OrbVoiceServerTranscriptionSession = {
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

export type OrbVoiceServerTranscriptionCallbacks = {
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onError?: (message: string) => void
}

const NOT_CONFIGURED_MESSAGE =
  'Server transcription is not available. Use Dictate or Chat instead.'

export async function isOrbVoiceServerTranscriptionRealtimeAvailable(): Promise<boolean> {
  const status = await fetchOrbVoiceRealtimeStatus()
  return Boolean(status.ok && status.realtime_enabled)
}

function extractClientSecret(session: OrbVoiceServerTranscriptionSession): string | null {
  const secret = session.openai_session?.client_secret
  if (!secret?.value) return null
  return String(secret.value)
}

export async function requestOrbVoiceServerTranscriptionSession(): Promise<OrbVoiceServerTranscriptionSession> {
  emitOrbClientDebug({
    area: 'voice',
    event: 'voice_server_transcription_session_requested',
    detail: {}
  })
  try {
    const payload = await authFetch('/orb/voice/transcribe/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    if (!payload || typeof payload !== 'object') {
      return { ok: false, configured: false, reason: 'not_configured', message: NOT_CONFIGURED_MESSAGE }
    }
    const data = payload as OrbVoiceServerTranscriptionSession
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

export async function transcribeOrbVoiceAudioBlob(
  blob: Blob,
  filename = 'voice-capture.webm'
): Promise<string> {
  const form = new FormData()
  form.append('file', blob, filename)
  const res = await authFetchResponse('/orb/voice/transcribe/audio', {
    method: 'POST',
    body: form
  })
  if (!res.ok) throw new Error('Voice transcription failed')
  const json = (await res.json()) as { success?: boolean; data?: { transcript?: string }; transcript?: string }
  if (json.success === false) throw new Error('Voice transcription failed')
  const transcript = String(json.data?.transcript ?? json.transcript ?? '').trim()
  if (!transcript) throw new Error('No speech detected in recording')
  return transcript
}

/** Live server transcription for Voice (transcription-only WebRTC). */
export class OrbVoiceServerRealtimeTranscription {
  private client: OrbOpenAIRealtimeWebRTCClient | null = null
  private partial = ''
  private finals: string[] = []

  async start(callbacks: OrbVoiceServerTranscriptionCallbacks): Promise<boolean> {
    const session = await requestOrbVoiceServerTranscriptionSession()
    if (!session.configured) {
      callbacks.onError?.(session.message ?? NOT_CONFIGURED_MESSAGE)
      return false
    }
    const clientSecret = extractClientSecret(session)
    if (!clientSecret) {
      callbacks.onError?.('Voice transcription session did not include credentials.')
      return false
    }

    this.client = new OrbOpenAIRealtimeWebRTCClient({
      onPartialTranscript: (text) => {
        this.partial = text
        callbacks.onPartialTranscript?.(text)
      },
      onFinalTranscript: (text) => {
        this.partial = ''
        if (text.trim()) {
          this.finals.push(text.trim())
          callbacks.onFinalTranscript?.(text.trim())
        }
      },
      onError: (message) => callbacks.onError?.(message)
    })

    try {
      await this.client.connect({
        clientSecret,
        model: session.model ?? 'gpt-realtime',
        transcriptionOnly: true
      })
      emitOrbClientDebug({
        area: 'voice',
        event: 'voice_server_transcription_started',
        detail: { sessionId: session.session_id, provider: session.provider }
      })
      return true
    } catch (error) {
      this.client?.close()
      this.client = null
      const message =
        error instanceof Error ? error.message : 'Server transcription failed to start.'
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
