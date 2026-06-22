/** Safe capture / transcript-source traces — never log transcript or care content. */

import type { OrbVoiceActiveCaptureMode, OrbVoiceTranscriptSource } from './orb-voice-v2-types.ts'

export type OrbVoiceCaptureTraceEvent =
  | 'orb_voice_capture_mode_selected'
  | 'orb_voice_transcript_source'
  | 'orb_voice_standard_audio_blob'
  | 'orb_voice_transcribe_skipped'
  | 'orb_voice_transcribe_started'
  | 'orb_voice_transcribe_finished'

export function traceOrbVoiceCapture(
  event: OrbVoiceCaptureTraceEvent,
  payload: Record<string, string | number | boolean | null | undefined> = {}
): void {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  console.debug('[orb-voice-v2]', { event, ...payload })
}

export function traceOrbVoiceCaptureModeSelected(mode: OrbVoiceActiveCaptureMode): void {
  traceOrbVoiceCapture('orb_voice_capture_mode_selected', { mode })
}

export function traceOrbVoiceTranscriptSource(source: OrbVoiceTranscriptSource): void {
  traceOrbVoiceCapture('orb_voice_transcript_source', { source })
}
