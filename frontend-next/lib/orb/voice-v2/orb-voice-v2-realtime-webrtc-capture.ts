/**
 * Phase 5M — OpenAI Realtime WebRTC transcription capture for Voice v2.
 * Reuses existing WebRTC client; ORB specialist brain + Katherine TTS remain on v2 routes.
 */

import { OrbOpenAIRealtimeWebRTCClient } from '@/lib/orb/voice/orb-openai-realtime-webrtc-client'
import {
  startOrbRealtimeVoiceSession,
  type OrbVoiceSessionResponse
} from '@/lib/orb/voice/orb-voice-client.ts'

import type { OrbVoiceV2CaptureSession } from './orb-voice-v2-capture.ts'
import { detectOrbWakePhrase } from './orb-voice-v2-wake-phrase.ts'
import { traceOrbVoiceRealtime } from './orb-voice-v2-realtime-trace.ts'

function extractClientSecret(session: OrbVoiceSessionResponse): string | null {
  const secret = session.openai_session?.client_secret
  if (!secret) return null
  if (typeof secret === 'object' && secret.value) return String(secret.value)
  return null
}

export async function startOrbVoiceV2RealtimeWebRtcCapture(input: {
  onListeningReady?: () => void
  onSpeechStart?: () => void
  onPartialTranscript?: (text: string) => void
  onWakePhrase?: () => void
  onEndOfTurn: (transcript: string) => void
  onError: (message: string) => void
}): Promise<OrbVoiceV2CaptureSession> {
  const session = await startOrbRealtimeVoiceSession({ mode: 'conversational' })
  if (session.provider !== 'openai_realtime' || session.status !== 'ready') {
    throw new Error(session.fallback_reason || 'realtime_not_available')
  }

  const clientSecret = extractClientSecret(session)
  if (!clientSecret) {
    throw new Error('realtime_missing_client_secret')
  }

  const model = session.openai_session?.model ?? 'gpt-realtime'
  const client = new OrbOpenAIRealtimeWebRTCClient({
    onPartialTranscript: (text) => {
      if (text.trim()) {
        traceOrbVoiceRealtime('orb_voice_realtime_partial_received')
        input.onPartialTranscript?.(text)
      }
      if (detectOrbWakePhrase(text)) input.onWakePhrase?.()
    },
    onFinalTranscript: (text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      traceOrbVoiceRealtime('orb_voice_realtime_final_received')
      if (detectOrbWakePhrase(trimmed)) {
        input.onWakePhrase?.()
        return
      }
      input.onSpeechStart?.()
      input.onEndOfTurn(trimmed)
    },
    onError: (message) => input.onError(message)
  })

  try {
    await client.connect({
      clientSecret,
      model,
      transcriptionOnly: true
    })
    traceOrbVoiceRealtime('orb_voice_realtime_session_started')
    input.onListeningReady?.()
  } catch (error) {
    client.close()
    const message = error instanceof Error ? error.message : 'Realtime voice failed to start.'
    throw new Error(message)
  }

  return {
    stop: () => {
      client.close()
    },
    dispose: () => {
      client.close()
    }
  }
}
