/**
 * Server voice abstraction — UI uses this whether STT/TTS is browser or backend-powered.
 */

import { authFetch } from '@/lib/auth/api'

export type OrbVoiceProvider = 'browser_fallback' | 'server' | 'not_configured'

export type OrbVoiceSessionResponse = {
  session_id: string
  status: 'ready' | 'unavailable'
  provider: OrbVoiceProvider
}

export type OrbVoiceSpeakResponse = {
  provider: OrbVoiceProvider
  text: string
  voice_id: string
  audio_url?: string | null
}

export type OrbVoiceTranscribeResponse = {
  provider: OrbVoiceProvider
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

export async function startOrbVoiceSession(options: {
  mode?: string
  voice_id?: string
}): Promise<OrbVoiceSessionResponse> {
  try {
    return await postJson<OrbVoiceSessionResponse>('/api/orb/voice/session', {
      mode: options.mode ?? 'conversational',
      voice_id: options.voice_id ?? 'orb_british_female'
    })
  } catch {
    return {
      session_id: `local_${Date.now()}`,
      status: 'ready',
      provider: 'browser_fallback'
    }
  }
}

export async function requestOrbVoiceSpeak(options: {
  text: string
  voice_id?: string
  rate?: number
}): Promise<OrbVoiceSpeakResponse> {
  try {
    return await postJson<OrbVoiceSpeakResponse>('/api/orb/voice/speak', {
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
    return await postJson<OrbVoiceTranscribeResponse>('/api/orb/voice/transcribe', {
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
