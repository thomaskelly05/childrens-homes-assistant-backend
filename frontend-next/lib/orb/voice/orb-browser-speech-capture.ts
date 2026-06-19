/**
 * Shared browser SpeechRecognition transcript handling — Dictate and Voice.
 */

import { isSafariBrowser } from './orb-voice-readiness.ts'
import { appendOrbVoiceFinalTranscriptChunk, buildOrbVoiceDisplayTranscript } from './orb-voice-transcript.ts'

export const ORB_BROWSER_SPEECH_LANG = 'en-GB'

export const ORB_BROWSER_SPEECH_FINALIZE_MS = 400

export const ORB_SAFARI_BROWSER_VOICE_DEV_OVERRIDE_KEY = 'indicare.orb.voice.safari.browser'

export const ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE =
  'Safari could not capture speech in this session. You can try again, use Dictate, or type in Chat.'

export type OrbBrowserSpeechCapturePurpose = 'voice' | 'dictate'

export type OrbVoiceRecommendedFallback = 'dictate' | 'chat' | null

export function detectBrowserName(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (isSafariBrowser()) return 'safari'
  if (/edg\//i.test(ua)) return 'edge'
  if (/chrome|chromium/i.test(ua)) return 'chrome'
  if (/firefox/i.test(ua)) return 'firefox'
  return 'other'
}

/** Safari Voice uses Dictate realtime — browser SpeechRecognition is unreliable. */
export function shouldBlockSafariBrowserVoice(): boolean {
  if (!isSafariBrowser()) return false
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(ORB_SAFARI_BROWSER_VOICE_DEV_OVERRIDE_KEY) !== '1'
  } catch {
    return true
  }
}

export function isSafariRecognitionNoSpeechError(code: string, message?: string | null): boolean {
  const normalized = code.trim().toLowerCase()
  const detail = (message || '').trim().toLowerCase()
  if (normalized === 'no-speech') return true
  if (normalized === 'aborted' && detail.includes('no speech')) return true
  if (detail.includes('no speech detected')) return true
  return false
}

export function recognitionErrorUserMessage(
  code: string,
  message?: string | null,
  purpose: OrbBrowserSpeechCapturePurpose = 'voice'
): string {
  if (purpose === 'voice' && isSafariRecognitionNoSpeechError(code, message)) {
    return ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE
  }
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'Voice could not start. Dictate is available, or you can use Chat instead.'
  }
  if (code === 'audio-capture') {
    return 'Voice could not capture speech in this browser session. Dictate is available, or you can use Chat instead.'
  }
  if (purpose === 'voice' && isSafariBrowser()) {
    return ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE
  }
  return "I didn't catch that. Try again, open Dictate, or use Chat instead."
}

export function recommendedFallbackForRecognitionError(
  code: string,
  message?: string | null
): OrbVoiceRecommendedFallback {
  if (isSafariBrowser() || isSafariRecognitionNoSpeechError(code, message)) return 'dictate'
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'dictate'
  return 'chat'
}

/** Promote live interim text into committed transcript (Safari often ends without isFinal). */
export function promoteInterimTranscriptCommitted(
  committed: string,
  interim: string,
  options?: { dictateLineBreaks?: boolean }
): string {
  const interimTrimmed = interim.trim()
  const committedTrimmed = committed.trim()
  if (!interimTrimmed) return committedTrimmed
  if (!committedTrimmed) return interimTrimmed
  if (committedTrimmed.endsWith(interimTrimmed)) return committedTrimmed
  if (committedTrimmed.includes(interimTrimmed)) return committedTrimmed
  if (options?.dictateLineBreaks) {
    return `${committedTrimmed}\n${interimTrimmed}`.trim()
  }
  return appendOrbVoiceFinalTranscriptChunk(committedTrimmed, interimTrimmed)
}

export function resolveBrowserSpeechCaptureText(input: {
  transcript: string
  interimTranscript: string
  displayTranscript?: string
}): string {
  const promoted = promoteInterimTranscriptCommitted(input.transcript, input.interimTranscript, {
    dictateLineBreaks: true
  })
  if (promoted) return promoted
  return (input.displayTranscript || '').trim()
}

export function previewTranscriptForDiagnostics(text: string, max = 80): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`
}

export function syncBrowserSpeechTranscriptDiagnostics(text: string): {
  lastTranscriptLength: number
  lastTranscriptPreview: string
  finalTranscriptLength: number
} {
  const trimmed = text.trim()
  return {
    lastTranscriptLength: trimmed.length,
    lastTranscriptPreview: previewTranscriptForDiagnostics(trimmed),
    finalTranscriptLength: trimmed.length
  }
}

export function buildBrowserSpeechDisplayTranscript(transcript: string, interimTranscript: string): string {
  return buildOrbVoiceDisplayTranscript(transcript, interimTranscript)
}
