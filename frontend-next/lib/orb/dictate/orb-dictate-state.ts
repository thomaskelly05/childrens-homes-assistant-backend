/**
 * ORB Dictate capture state machine — shared types and UI mapping (no React).
 */

export type DictateState =
  | 'idle'
  | 'ready'
  | 'requesting_permission'
  | 'listening'
  | 'paused'
  | 'stopping'
  | 'transcript_ready'
  | 'generating'
  | 'generated'
  | 'error'

export type DictateCaptureMode =
  | 'realtime_transcription'
  | 'speech'
  | 'paste'
  | 'upload'
  | 'audio_fallback'
  | 'none'

export type DictateStartSource = 'none' | 'user_click' | 'paste' | 'upload' | 'import'

export type DictateRecordingUiState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'stopped'
  | 'error'

export function mapRecordingUiToDictateState(input: {
  recordingUiState: DictateRecordingUiState
  recordingPaused: boolean
  generating: boolean
  hasGeneratedOutput: boolean
  hasTranscript: boolean
}): DictateState {
  if (input.generating) return 'generating'
  if (input.hasGeneratedOutput) return 'generated'
  if (input.recordingUiState === 'error') return 'error'
  if (input.recordingUiState === 'stopping' || input.recordingUiState === 'processing') return 'stopping'
  if (input.recordingUiState === 'starting') return 'requesting_permission'
  if (input.recordingUiState === 'recording' && input.recordingPaused) return 'paused'
  if (input.recordingUiState === 'recording') return 'listening'
  if (input.recordingUiState === 'stopped' && input.hasTranscript) return 'transcript_ready'
  if (input.recordingUiState === 'idle' && input.hasTranscript) return 'transcript_ready'
  if (input.recordingUiState === 'idle') return 'ready'
  return 'idle'
}

export const DICTATE_READY_MESSAGE = 'Ready to transcribe. Press Start speech transcript.'

export const DICTATE_LISTENING_MESSAGE = 'Listening — speech will appear as text'

export const DICTATE_TRANSCRIPT_READY_MESSAGE =
  'Speech transcript captured — review before generating.'

export const DICTATE_NO_SPEECH_MESSAGE =
  'No speech was detected. Try again, upload audio, or paste a transcript.'

export const DICTATE_AUDIO_FALLBACK_FAILED_MESSAGE =
  'Your browser allowed the microphone but did not provide audio data. Use speech transcript, Chrome/Edge, upload audio, or paste a transcript.'

export const DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE =
  'Realtime transcription is not configured. Paste transcript or upload audio.'

export const DICTATE_REALTIME_LISTENING_MESSAGE = 'Listening — live transcript via server realtime'
