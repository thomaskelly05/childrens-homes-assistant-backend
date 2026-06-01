/**
 * Server voice abstraction — UI uses this whether STT/TTS is browser or backend-powered.
 */

import { authFetch } from '@/lib/auth/api'

export type VoiceProviderType =
  | 'browser_fallback'
  | 'websocket_realtime'
  | 'webrtc_realtime'
  | 'openai_realtime'
export type VoiceLatencyClass = 'fallback' | 'standard' | 'realtime'

export type VoiceProviderCapabilities = {
  provider: string
  supportsStreamingStt: boolean
  supportsStreamingTts: boolean
  supportsBargeIn: boolean
  supportsVad: boolean
  supportsDuplex: boolean
  supportsServerAudio: boolean
  latencyClass: VoiceLatencyClass
}

export type OrbVoiceOpenAISession = {
  model?: string | null
  client_secret?: { value?: string; expires_at?: number | string } | null
  voice?: string | null
}

export type OrbVoiceSessionResponse = {
  session_id: string
  status: 'ready' | 'not_configured' | 'error'
  provider: VoiceProviderType
  mode?: string
  voice_id?: string
  selected_voice_profile?: string
  profile_label?: string | null
  provider_voice?: string | null
  websocket_url?: string | null
  webrtc_offer_url?: string | null
  openai_session?: OrbVoiceOpenAISession | null
  capabilities: VoiceProviderCapabilities
  message?: string | null
  fallback_reason?: string | null
}

export type OrbVoiceSpeakResponse = {
  provider: 'browser_fallback' | 'server' | 'openai_realtime'
  text: string
  voice_id: string
  selected_voice_profile?: string
  provider_voice?: string | null
  audio_url?: string | null
  message?: string
}

export type OrbVoiceTranscribeResponse = {
  provider: 'browser_fallback' | 'server'
  text?: string | null
  status?: 'not_configured' | 'ok'
  message?: string
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const payload = await authFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!payload || typeof payload !== 'object') {
    throw new Error('Unexpected voice API response')
  }
  return payload as T
}

const BROWSER_CAPABILITIES: VoiceProviderCapabilities = {
  provider: 'browser',
  supportsStreamingStt: false,
  supportsStreamingTts: false,
  supportsBargeIn: true,
  supportsVad: true,
  supportsDuplex: false,
  supportsServerAudio: false,
  latencyClass: 'fallback'
}

/** True when the server selected a duplex realtime provider (not browser-only fallback). */
export function isRealtimeVoiceProvider(session: OrbVoiceSessionResponse): boolean {
  if (session.status !== 'ready') return false
  return (
    session.provider === 'openai_realtime' ||
    session.provider === 'websocket_realtime' ||
    session.provider === 'webrtc_realtime'
  )
}

export async function startOrbVoiceSession(options: {
  mode?: string
  voice_id?: string
  transport?: 'auto' | 'websocket' | 'webrtc' | 'browser_fallback'
}): Promise<OrbVoiceSessionResponse> {
  try {
    return await postJson<OrbVoiceSessionResponse>('/orb/voice/session', {
      mode: options.mode ?? 'conversational',
      voice_id: options.voice_id ?? 'orb_british_female',
      transport: options.transport ?? 'auto'
    })
  } catch {
    return {
      session_id: `local_${Date.now()}`,
      status: 'not_configured',
      provider: 'browser_fallback',
      capabilities: BROWSER_CAPABILITIES,
      fallback_reason: 'Could not reach voice session API.'
    }
  }
}

export { fetchOrbVoiceRealtimeStatus, isOrbRealtimeVoiceAvailable } from './orb-realtime-availability'
export type { OrbRealtimeVoiceAvailability, OrbRealtimeVoiceStatus } from './orb-realtime-availability'

export async function requestOrbVoiceSpeak(options: {
  text: string
  voice_id?: string
  rate?: number
}): Promise<OrbVoiceSpeakResponse> {
  try {
    return await postJson<OrbVoiceSpeakResponse>('/orb/voice/speak', {
      text: options.text,
      voice_id: options.voice_id ?? 'orb_british_female',
      rate: options.rate ?? 1
    })
  } catch {
    return {
      provider: 'browser_fallback',
      text: options.text,
      voice_id: options.voice_id ?? 'orb_british_female'
    }
  }
}

export async function requestOrbVoiceTranscribe(options: {
  text?: string
}): Promise<OrbVoiceTranscribeResponse> {
  try {
    return await postJson<OrbVoiceTranscribeResponse>('/orb/voice/transcribe', {
      text: options.text ?? ''
    })
  } catch {
    return {
      provider: 'browser_fallback',
      status: 'not_configured',
      message: 'Use browser SpeechRecognition.'
    }
  }
}
