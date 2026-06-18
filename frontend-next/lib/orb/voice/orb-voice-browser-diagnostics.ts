/**
 * Browser voice diagnostics — DEBUG / dev only. No full transcripts in production logs.
 */

import {
  ORB_WEB_REALTIME_DISABLED_REASON,
  ORB_WEB_VOICE_CAPTURE_MODE
} from './orb-web-voice-config'

export type OrbVoiceBrowserDiagnostics = {
  microphonePermission: string
  speechRecognitionSupported: boolean
  mediaRecorderSupported: boolean
  dictateCaptureAvailable: boolean
  voiceCaptureMode: typeof ORB_WEB_VOICE_CAPTURE_MODE | 'unknown'
  getUserMediaAttempted: boolean
  getUserMediaSuccess: boolean
  recognitionStartEvent: boolean
  recognitionEndEvent: boolean
  recognitionErrorEvent: boolean
  recognitionStartCount: number
  recognitionEndCount: number
  stopReason: string | null
  lastStopReason: string | null
  lastError: string | null
  realtimeAttempted: boolean
  realtimeDisabledReason: string | null
  brainRequestAttempted: boolean
  orbBrainAttempted: boolean
  orbBrainStatus: string | null
  ttsRequestAttempted: boolean
  ttsAttempted: boolean
  ttsStatus: string | null
  ttsProvider: string | null
}

const empty: OrbVoiceBrowserDiagnostics = {
  microphonePermission: 'unknown',
  speechRecognitionSupported: false,
  mediaRecorderSupported: false,
  dictateCaptureAvailable: false,
  voiceCaptureMode: ORB_WEB_VOICE_CAPTURE_MODE,
  getUserMediaAttempted: false,
  getUserMediaSuccess: false,
  recognitionStartEvent: false,
  recognitionEndEvent: false,
  recognitionErrorEvent: false,
  recognitionStartCount: 0,
  recognitionEndCount: 0,
  stopReason: null,
  lastStopReason: null,
  lastError: null,
  realtimeAttempted: false,
  realtimeDisabledReason: ORB_WEB_REALTIME_DISABLED_REASON,
  brainRequestAttempted: false,
  orbBrainAttempted: false,
  orbBrainStatus: null,
  ttsRequestAttempted: false,
  ttsAttempted: false,
  ttsStatus: null,
  ttsProvider: null
}

let state: OrbVoiceBrowserDiagnostics = { ...empty }

export function resetOrbVoiceBrowserDiagnostics(): void {
  state = { ...empty }
}

export function patchOrbVoiceBrowserDiagnostics(
  patch: Partial<OrbVoiceBrowserDiagnostics>
): void {
  const next = { ...state, ...patch }
  if (patch.stopReason !== undefined) {
    next.lastStopReason = patch.stopReason
  }
  if (patch.brainRequestAttempted === true) {
    next.orbBrainAttempted = true
  }
  if (patch.orbBrainAttempted === true) {
    next.brainRequestAttempted = true
  }
  if (patch.ttsRequestAttempted === true) {
    next.ttsAttempted = true
  }
  if (patch.ttsAttempted === true) {
    next.ttsRequestAttempted = true
  }
  state = next
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
  'Voice could not start. Dictate is available, or you can use Chat instead.'

export const ORB_VOICE_WEB_UNSUPPORTED_ERROR =
  'Voice is not supported in this browser. Use Dictate or Chat instead.'

export const ORB_VOICE_WEB_NO_TRANSCRIPT =
  "I didn't catch that. Try again, use Dictate, or use Chat."

export const ORB_VOICE_WEB_BOUNDARY_COPY = [
  'Voice uses your microphone while listening.',
  'Audio is not stored by ORB.',
  'If voice is unavailable, use Dictate or Chat instead.',
  'Review any output before use.'
] as const
