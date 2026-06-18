/**
 * ORB Web Voice Engine — shared types, states, and user-facing copy.
 */

export type OrbWebVoiceEngineState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'capturing'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'failed'
  | 'unsupported'

export type OrbVoiceTransportId =
  | 'browser_speech_recognition'
  | 'server_transcription'
  | 'unsupported'
  | 'realtime_webrtc_dev_only'

export type OrbVoiceRejectedTransport = {
  id: OrbVoiceTransportId
  reason: string
}

export type OrbVoiceCapabilitySnapshot = {
  browserName: string
  browserFamily: 'chrome' | 'safari' | 'firefox' | 'edge' | 'other' | 'unknown'
  safariDetected: boolean
  firefoxDetected: boolean
  chromeDetected: boolean
  secureContext: boolean
  speechRecognitionSupported: boolean
  mediaRecorderSupported: boolean
  getUserMediaSupported: boolean
  serverTranscriptionRealtimeAvailable: boolean
  serverTranscriptionUploadAvailable: boolean
}

export type OrbVoiceTransportSelection = {
  selectedTransport: OrbVoiceTransportId
  supportedTransports: OrbVoiceTransportId[]
  rejectedTransports: OrbVoiceRejectedTransport[]
}

export const ORB_VOICE_ENGINE_COPY = {
  ready: 'Ready when you are.',
  listening: 'Listening…',
  capturing: 'Recording your voice…',
  transcribing: 'Processing your voice…',
  thinking: 'ORB is thinking…',
  speaking: 'ORB is speaking…',
  noCapture:
    'Voice could not capture speech. Try again, use Dictate, or type instead.',
  limitedBrowser:
    'Voice is limited in this browser. Dictate is available, or you can use Chat instead.',
  dictateHint: 'Use Dictate to speak your note, then ORB can shape it.',
  unsupported: 'Voice is not supported in this browser. Use Dictate or Chat instead.',
  recordAndSend: 'Record and send'
} as const

export type OrbWebVoiceEngineCallbacks = {
  onStateChange?: (state: OrbWebVoiceEngineState) => void
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onUserMessage?: (message: string) => void
  onTransportChange?: (selection: OrbVoiceTransportSelection) => void
}
