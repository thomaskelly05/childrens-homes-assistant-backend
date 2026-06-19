/**
 * Server transcription lifecycle helpers — keep UI and diagnostics consistent.
 */

import type { OrbWebVoiceEngineState } from './engine/orb-web-voice-engine-types'
import type { OrbVoiceBrowserDiagnostics } from './orb-voice-browser-diagnostics'

export const ORB_VOICE_TRANSCRIPTION_FAILED_MESSAGE =
  'Voice could not be processed. Try again, use Dictate, or use Chat.'

/** True while recorder is active or stop/upload is in flight. */
export function isServerTranscriptionFinalizeInProgress(
  diagnostics: Pick<
    OrbVoiceBrowserDiagnostics,
    | 'serverTranscriptionStatus'
    | 'mediaRecorderStarted'
    | 'mediaRecorderStopped'
  >,
  engineState: OrbWebVoiceEngineState,
  isFinalizing: boolean
): boolean {
  if (isFinalizing) return true
  if (engineState === 'capturing' || engineState === 'transcribing' || engineState === 'requesting_permission') {
    return true
  }
  const status = diagnostics.serverTranscriptionStatus
  if (status === 'recording' || status === 'processing' || status === 'stopping' || status === 'uploading') {
    return true
  }
  if (diagnostics.mediaRecorderStarted && !diagnostics.mediaRecorderStopped) return true
  return false
}

export function canShowServerTranscriptionNoSpeechPanel(
  wantsNoSpeechPanel: boolean,
  diagnostics: Pick<
    OrbVoiceBrowserDiagnostics,
    | 'serverTranscriptionStatus'
    | 'mediaRecorderStarted'
    | 'mediaRecorderStopped'
  >,
  engineState: OrbWebVoiceEngineState,
  isFinalizing: boolean
): boolean {
  if (!wantsNoSpeechPanel) return false
  return !isServerTranscriptionFinalizeInProgress(diagnostics, engineState, isFinalizing)
}

export function serverTranscriptionStatusWhileActive(
  engineState: OrbWebVoiceEngineState,
  isFinalizing: boolean
): string {
  if (isFinalizing || engineState === 'transcribing') return 'Processing your voice…'
  if (engineState === 'capturing' || engineState === 'listening') return 'Recording…'
  return 'Ready to record'
}
