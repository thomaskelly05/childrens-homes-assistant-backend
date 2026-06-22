/** Phase 5L — realtime beta capability layer (additive; voice v2 remains fallback). */

import type { OrbVoiceRealtimeBetaStatus } from './orb-voice-v2-types.ts'

export type OrbVoiceRealtimeMode = 'off' | 'beta' | 'fallback'

export const ORB_VOICE_V2_WAKE_PHRASE_HINT =
  'Say “Hey ORB” while this Voice session is open, or tap the wave.' as const

export const ORB_VOICE_V2_BARGE_IN_STOPPED_COPY = 'Stopped. I’m listening.' as const

/** Full speech-detected duplex barge-in requires continuous VAD during playback and is intentionally deferred. */
export const ORB_VOICE_V2_DUPLEX_VAD_BARGE_IN_ENABLED = false

export function isOrbVoiceHybridSpeechAvailable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const w = window as Window & {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return false
  if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) return false
  return true
}

export function resolveOrbVoiceRealtimeMode(
  status: OrbVoiceRealtimeBetaStatus | null,
  hybridSpeechAvailable: boolean
): OrbVoiceRealtimeMode {
  if (!status) return 'fallback'
  if (status.available && status.transport === 'openai_realtime') return 'beta'
  if (status.hybridSpeech && hybridSpeechAvailable) return 'beta'
  return 'fallback'
}

export function orbVoiceRealtimeEnabled(mode: OrbVoiceRealtimeMode): boolean {
  return mode === 'beta'
}

export function orbVoiceRealtimeAvailable(
  status: OrbVoiceRealtimeBetaStatus | null,
  hybridSpeechAvailable: boolean
): boolean {
  return resolveOrbVoiceRealtimeMode(status, hybridSpeechAvailable) === 'beta'
}
