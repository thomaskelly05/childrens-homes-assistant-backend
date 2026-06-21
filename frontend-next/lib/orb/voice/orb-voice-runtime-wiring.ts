/**
 * Phase 4G — Voice runtime wiring invariants (reply → TTS, state guards).
 */

import { stripMarkdownForSpeech } from '../orb-speech-text.ts'

import { stripForSpokenReply } from './orb-voice-human-conversation.ts'
import type { OrbVoiceSpeechDecision } from './orb-voice-speech-policy.ts'

export const ORB_VOICE_MIN_SPOKEN_CHARS = 8
export const ORB_VOICE_MIN_TTS_TEXT_CHARS = ORB_VOICE_MIN_SPOKEN_CHARS

export const ORB_VOICE_TTS_TOO_SHORT_MESSAGE =
  'ORB reply was shown as text because there was not enough spoken content.' as const

export type OrbVoiceTurnTtsText = {
  spokenText: string
  visibleText: string
  source: 'full_reply' | 'summary' | 'none'
}

export function shouldInvokeOrbVoiceTts(text: string): boolean {
  return text.trim().length >= ORB_VOICE_MIN_TTS_TEXT_CHARS
}

export function resolveOrbVoiceTurnTtsText(input: {
  visibleReply: string
  speechDecision?: OrbVoiceSpeechDecision | null
  promptTier?: string | null
}): OrbVoiceTurnTtsText {
  const visibleText = input.visibleReply.trim()
  if (!visibleText) {
    return { spokenText: '', visibleText: '', source: 'none' }
  }

  const voiceFast = (input.promptTier || '').trim().toLowerCase() === 'voice_fast'
  if (voiceFast) {
    const spokenText = stripForSpokenReply(stripMarkdownForSpeech(visibleText)).slice(0, 500)
    return { spokenText, visibleText, source: 'full_reply' }
  }

  const summary = input.speechDecision?.spokenText?.trim()
  if (summary) {
    const spokenText = stripForSpokenReply(stripMarkdownForSpeech(summary))
    return { spokenText, visibleText, source: 'summary' }
  }

  const spokenText = stripForSpokenReply(stripMarkdownForSpeech(visibleText)).slice(0, 500)
  return { spokenText, visibleText, source: 'full_reply' }
}

export function resolveOrbVoiceLaunchUiCaptureState(input: {
  pending?: boolean
  isFinalizingRecording?: boolean
  engineState: string
  voiceCaptureState?: string
}): string {
  if (input.pending) return 'thinking'
  if (input.isFinalizingRecording || input.engineState === 'transcribing') return 'transcribing'
  if (input.engineState === 'capturing' || input.engineState === 'listening') return 'recording'
  if (input.engineState === 'thinking') return 'thinking'
  if (input.engineState === 'speaking') return 'speaking'
  return input.voiceCaptureState || input.engineState || 'idle'
}

export function isOrbVoiceAssistantTurnReady(input: {
  status?: string | null
  content?: string | null
  pending?: boolean
}): boolean {
  if (input.pending) return false
  const status = (input.status || '').trim().toLowerCase()
  if (status === 'streaming' || status === 'thinking' || status === 'error') return false
  return (input.content || '').trim().length >= ORB_VOICE_MIN_SPOKEN_CHARS
}
