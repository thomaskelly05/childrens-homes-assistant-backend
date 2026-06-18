/**
 * Shared browser SpeechRecognition transcript handling — Dictate and Voice.
 */

import { appendOrbVoiceFinalTranscriptChunk, buildOrbVoiceDisplayTranscript } from './orb-voice-transcript.ts'

export const ORB_BROWSER_SPEECH_LANG = 'en-GB'

export const ORB_BROWSER_SPEECH_FINALIZE_MS = 400

export type OrbBrowserSpeechCapturePurpose = 'voice' | 'dictate'

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
