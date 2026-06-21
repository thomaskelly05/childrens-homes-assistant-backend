/**
 * Phase 4H — text-first Voice UX and live TTS latency helpers.
 */

import { stripMarkdownForSpeech } from '../orb-speech-text.ts'

import { stripForSpokenReply } from './orb-voice-human-conversation.ts'
import type { OrbVoiceSpeechDecision } from './orb-voice-speech-policy.ts'

export const ORB_VOICE_LIVE_SPOKEN_CAP = 320
export const ORB_VOICE_TTS_PREPARING = 'ORB is preparing voice…' as const
export const ORB_VOICE_TTS_VOICE_LOADING = 'Voice loading…' as const
export const ORB_VOICE_CONTINUE_WITHOUT_VOICE = 'Continue without voice' as const
export const ORB_VOICE_TTS_PREPARE_HINT_MS = 2500
export const ORB_VOICE_TTS_SKIP_VOICE_MS = 6000

export type OrbVoiceTtsLatencyContext = 'live_voice' | 'summary' | 'replay'

export function resolveOrbVoiceTtsContext(source?: string | null): OrbVoiceTtsLatencyContext {
  const normalised = (source || '').trim().toLowerCase()
  if (normalised === 'summary' || normalised === 'replay') return normalised
  return 'live_voice'
}

export type OrbVoiceSpokenTextResult = {
  spokenText: string
  visibleText: string
  source: 'full_reply' | 'summary' | 'none'
  spokenCapApplied: boolean
}

export function capOrbVoiceSpokenText(
  text: string,
  cap = ORB_VOICE_LIVE_SPOKEN_CAP
): { text: string; capApplied: boolean } {
  const cleaned = text.trim()
  if (cleaned.length <= cap) return { text: cleaned, capApplied: false }
  return { text: cleaned.slice(0, cap).trim(), capApplied: true }
}

export function resolveOrbVoiceSpokenText(input: {
  visibleReply: string
  speechDecision?: OrbVoiceSpeechDecision | null
  promptTier?: string | null
  cap?: number
}): OrbVoiceSpokenTextResult {
  const visibleText = input.visibleReply.trim()
  if (!visibleText) {
    return { spokenText: '', visibleText: '', source: 'none', spokenCapApplied: false }
  }

  const cap = input.cap ?? ORB_VOICE_LIVE_SPOKEN_CAP
  const voiceFast = (input.promptTier || '').trim().toLowerCase() === 'voice_fast'

  if (voiceFast) {
    const stripped = stripForSpokenReply(stripMarkdownForSpeech(visibleText))
    const { text, capApplied } = capOrbVoiceSpokenText(stripped, cap)
    return { spokenText: text, visibleText, source: 'full_reply', spokenCapApplied: capApplied }
  }

  const summary = input.speechDecision?.spokenText?.trim()
  if (summary) {
    const stripped = stripForSpokenReply(stripMarkdownForSpeech(summary))
    const { text, capApplied } = capOrbVoiceSpokenText(stripped, cap)
    return { spokenText: text, visibleText, source: 'summary', spokenCapApplied: capApplied }
  }

  const stripped = stripForSpokenReply(stripMarkdownForSpeech(visibleText))
  const { text, capApplied } = capOrbVoiceSpokenText(stripped, cap)
  return { spokenText: text, visibleText, source: 'full_reply', spokenCapApplied: capApplied }
}

export function shouldShowOrbVoiceTtsPreparing(input: {
  voicePreparing: boolean
  hasVisibleReply: boolean
  speaking: boolean
}): boolean {
  return input.voicePreparing && input.hasVisibleReply && !input.speaking
}
