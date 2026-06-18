/**
 * Browser voice diagnostics — DEBUG / dev only. No full transcripts in production logs.
 */

export type OrbVoiceBrowserDiagnostics = {
  microphonePermission: string
  speechRecognitionSupported: boolean
  mediaRecorderSupported: boolean
  getUserMediaAttempted: boolean
  getUserMediaSuccess: boolean
  recognitionStartEvent: boolean
  recognitionEndEvent: boolean
  recognitionErrorEvent: boolean
  stopReason: string | null
  lastError: string | null
  brainRequestAttempted: boolean
  ttsRequestAttempted: boolean
}

const empty: OrbVoiceBrowserDiagnostics = {
  microphonePermission: 'unknown',
  speechRecognitionSupported: false,
  mediaRecorderSupported: false,
  getUserMediaAttempted: false,
  getUserMediaSuccess: false,
  recognitionStartEvent: false,
  recognitionEndEvent: false,
  recognitionErrorEvent: false,
  stopReason: null,
  lastError: null,
  brainRequestAttempted: false,
  ttsRequestAttempted: false
}

let state: OrbVoiceBrowserDiagnostics = { ...empty }

export function resetOrbVoiceBrowserDiagnostics(): void {
  state = { ...empty }
}

export function patchOrbVoiceBrowserDiagnostics(
  patch: Partial<OrbVoiceBrowserDiagnostics>
): void {
  state = { ...state, ...patch }
}

export function getOrbVoiceBrowserDiagnostics(): OrbVoiceBrowserDiagnostics {
  return { ...state }
}

export function detectSpeechRecognitionInWindow(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function detectMediaRecorderInWindow(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
}

export const ORB_VOICE_WEB_START_ERROR =
  'Voice could not start. Check microphone permission or use Chat instead.'

export const ORB_VOICE_WEB_NO_TRANSCRIPT =
  "I didn't catch that. Try again or use Chat."

export const ORB_VOICE_WEB_BOUNDARY_COPY = [
  'Voice uses your microphone while listening.',
  'Audio is not stored by ORB.',
  'If voice is unavailable, use Chat instead.',
  'Review any output before use.'
] as const
