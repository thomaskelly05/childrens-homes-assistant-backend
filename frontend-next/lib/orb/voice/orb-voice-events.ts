/** Shared ORB Voice realtime event names (client ↔ server). */

export const VOICE_CLIENT_EVENTS = {
  sessionStart: 'session.start',
  audioChunk: 'audio.chunk',
  audioEnd: 'audio.end',
  transcriptText: 'transcript.text',
  userInterrupt: 'user.interrupt',
  sessionStop: 'session.stop',
  ping: 'ping'
} as const

export const VOICE_SERVER_EVENTS = {
  sessionReady: 'session.ready',
  sttPartial: 'stt.partial',
  sttFinal: 'stt.final',
  assistantDelta: 'assistant.delta',
  ttsStart: 'tts.start',
  ttsAudio: 'tts.audio',
  ttsEnd: 'tts.end',
  vadSpeechStart: 'vad.speech_start',
  vadSpeechEnd: 'vad.speech_end',
  interrupted: 'interrupted',
  error: 'error',
  pong: 'pong'
} as const

export type VoiceClientEventType = (typeof VOICE_CLIENT_EVENTS)[keyof typeof VOICE_CLIENT_EVENTS]
export type VoiceServerEventType = (typeof VOICE_SERVER_EVENTS)[keyof typeof VOICE_SERVER_EVENTS]

export type VoiceRealtimeServerMessage = {
  type: VoiceServerEventType | string
  session_id?: string
  text?: string
  delta?: string
  data?: string
  mime_type?: string
  message?: string
  capabilities?: Record<string, unknown>
}
