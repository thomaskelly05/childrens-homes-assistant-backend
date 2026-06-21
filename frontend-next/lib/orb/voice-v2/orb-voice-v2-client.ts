import { authFetchResponse } from '@/lib/auth/api'

import { resolveOrbVoiceV2KatherineStatusMessage } from './orb-voice-v2-permissions.ts'
import type {
  OrbVoiceV2Mode,
  OrbVoiceV2RespondResult,
  OrbVoiceV2SpeakResult,
  OrbVoiceV2Status
} from './orb-voice-v2-types.ts'
import { ORB_VOICE_V2_LIVE_SPOKEN_CAP } from './orb-voice-v2-copy.ts'

function parseOrbVoiceV2Status(data: Record<string, unknown>): OrbVoiceV2Status {
  return {
    katherineReady: Boolean(data.katherineReady),
    ttsProviderEffective: String(data.ttsProviderEffective || data.preferredProvider || 'text_only'),
    ttsProviderForced:
      typeof data.ttsProviderForced === 'string'
        ? data.ttsProviderForced
        : typeof data.forcedProvider === 'string'
          ? data.forcedProvider
          : null,
    fallbackReason: typeof data.fallbackReason === 'string' ? data.fallbackReason : null,
    elevenLabsConfigured: Boolean(data.elevenLabsConfigured),
    katherineConfigured: Boolean(data.katherineConfigured ?? data.katherineReady)
  }
}

export async function fetchOrbVoiceV2Status(): Promise<OrbVoiceV2Status> {
  try {
    const response = await authFetchResponse('/orb/voice/v2/status', { method: 'GET' })
    if (!response.ok) {
      return { katherineReady: false, ttsProviderEffective: 'text_only', elevenLabsConfigured: false }
    }
    const data = (await response.json()) as Record<string, unknown>
    return parseOrbVoiceV2Status(data)
  } catch {
    return { katherineReady: false, ttsProviderEffective: 'text_only', elevenLabsConfigured: false }
  }
}

export { resolveOrbVoiceV2KatherineStatusMessage }

export async function requestOrbVoiceV2Respond(input: {
  mode: OrbVoiceV2Mode
  transcript: string
  recentTurns: Array<{ role: 'adult' | 'orb'; text: string }>
}): Promise<OrbVoiceV2RespondResult> {
  const response = await authFetchResponse('/orb/voice/v2/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: input.mode,
      transcript: input.transcript.trim(),
      recentTurns: input.recentTurns
    })
  })
  if (!response.ok) {
    throw new Error('ORB Voice could not respond right now.')
  }
  const data = (await response.json()) as Record<string, unknown>
  return {
    reply: String(data.reply || data.answer || '').trim(),
    safetyBoundaryApplied: Boolean(data.safetyBoundaryApplied),
    promptTier: 'voice_fast'
  }
}

export async function requestOrbVoiceV2Speak(text: string): Promise<OrbVoiceV2SpeakResult> {
  const trimmed = text.trim().slice(0, ORB_VOICE_V2_LIVE_SPOKEN_CAP)
  if (!trimmed) return { ok: false, error: 'empty_text' }
  try {
    const response = await authFetchResponse('/orb/voice/v2/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg, audio/mp4, application/json'
      },
      body: JSON.stringify({ text: trimmed, voice: 'katherine', context: 'live_voice' })
    })
    if (!response.ok) {
      return { ok: false, error: `tts_${response.status}` }
    }
    const blob = await response.blob()
    if (!blob.size) return { ok: false, error: 'empty_audio' }
    return {
      ok: true,
      blob,
      provider: response.headers.get('X-ORB-TTS-Provider') || undefined,
      voiceName: response.headers.get('X-ORB-Voice-Name') || undefined,
      fallbackUsed: response.headers.get('X-ORB-TTS-Fallback') === 'true',
      fallbackReason: response.headers.get('X-ORB-TTS-Fallback-Reason') || null
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function transcribeOrbVoiceV2Audio(blob: Blob, mimeType: string): Promise<string> {
  const ext =
    mimeType.includes('mp4') || mimeType.includes('m4a')
      ? 'm4a'
      : mimeType.includes('wav')
        ? 'wav'
        : mimeType.includes('mpeg') || mimeType.includes('mp3')
          ? 'mp3'
          : 'webm'
  const form = new FormData()
  form.append('file', blob, `orb-voice-v2.${ext}`)
  const response = await authFetchResponse('/orb/voice/v2/transcribe', {
    method: 'POST',
    body: form
  })
  if (!response.ok) {
    throw new Error('transcription_failed')
  }
  const data = (await response.json()) as Record<string, unknown>
  const transcript = String(data.transcript || (data.data as { transcript?: string })?.transcript || '').trim()
  if (!transcript) throw new Error('empty_transcript')
  return transcript
}

export function capOrbVoiceV2SpokenText(text: string): string {
  const cleaned = text.replace(/\*\*/g, '').replace(/[#*_`]/g, '').trim()
  if (cleaned.length <= ORB_VOICE_V2_LIVE_SPOKEN_CAP) return cleaned
  return cleaned.slice(0, ORB_VOICE_V2_LIVE_SPOKEN_CAP).trim()
}
