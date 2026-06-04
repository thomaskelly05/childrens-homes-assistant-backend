/**
 * ORB Voice provider client — browser default; optional premium TTS via server only.
 */

import { authFetch } from '@/lib/auth/api'

export type OrbVoiceSpeakProvider = 'browser_speech' | 'premium_tts' | 'text_only'

export type OrbVoiceSpeakRequest = {
  spoken_summary: string
  voice_profile?: string
  expert_depth?: string
  privacy_mode?: boolean
  low_sensory_mode?: boolean
  manual_speak?: boolean
  rate?: number
}

export type OrbVoiceSpeakResult = {
  provider: OrbVoiceSpeakProvider
  text: string
  voice_profile: string
  audio_url?: string | null
  message?: string | null
  fallback_to_browser?: boolean
  premium_available?: boolean
}

export type OrbVoiceProviderStatus = {
  browser_speech: boolean
  premium_configured: boolean
  premium_enabled_by_provider: boolean
  premium_available: boolean
}

const DEFAULT_STATUS: OrbVoiceProviderStatus = {
  browser_speech: true,
  premium_configured: false,
  premium_enabled_by_provider: false,
  premium_available: false
}

export async function fetchOrbVoiceProviderStatus(): Promise<OrbVoiceProviderStatus> {
  try {
    const payload = await authFetch('/orb/voice/provider-status', { method: 'GET' })
    if (!payload || typeof payload !== 'object') return DEFAULT_STATUS
    const row = payload as Record<string, unknown>
    return {
      browser_speech: row.browser_speech !== false,
      premium_configured: Boolean(row.premium_configured),
      premium_enabled_by_provider: Boolean(row.premium_enabled_by_provider),
      premium_available: Boolean(row.premium_available)
    }
  } catch {
    return DEFAULT_STATUS
  }
}

/** Request server-side speak; never exposes API keys. Falls back to browser instruction. */
export async function requestOrbVoiceProviderSpeak(
  body: OrbVoiceSpeakRequest
): Promise<OrbVoiceSpeakResult> {
  try {
    const payload = await authFetch('/orb/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!payload || typeof payload !== 'object') {
      return {
        provider: 'browser_speech',
        text: body.spoken_summary,
        voice_profile: body.voice_profile ?? 'calm_female',
        fallback_to_browser: true
      }
    }
    const row = payload as Record<string, unknown>
    const provider = (row.provider as OrbVoiceSpeakProvider) || 'browser_speech'
    return {
      provider,
      text: String(row.text ?? body.spoken_summary),
      voice_profile: String(row.voice_profile ?? row.voice_id ?? body.voice_profile ?? 'calm_female'),
      audio_url: typeof row.audio_url === 'string' ? row.audio_url : null,
      message: typeof row.message === 'string' ? row.message : null,
      fallback_to_browser: Boolean(row.fallback_to_browser ?? provider === 'browser_speech'),
      premium_available: Boolean(row.premium_available)
    }
  } catch {
    return {
      provider: 'browser_speech',
      text: body.spoken_summary,
      voice_profile: body.voice_profile ?? 'calm_female',
      fallback_to_browser: true,
      message: 'Use browser speech synthesis.'
    }
  }
}

/** True when premium TTS could be used (provider + server); still requires user voice replies on. */
export function isPremiumTtsAvailable(status: OrbVoiceProviderStatus): boolean {
  return status.premium_available
}
