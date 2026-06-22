/** Phase 5L/5M — realtime capability layer (additive; voice v2 remains fallback). */

import type { OrbVoiceRealtimeBetaStatus } from './orb-voice-v2-types.ts'

export type OrbVoiceRealtimeMode = 'off' | 'webrtc' | 'hybrid' | 'fallback'

export const ORB_VOICE_V2_WAKE_PHRASE_HINT =
  'Say “Hey ORB” while this Voice session is open, or tap the wave.' as const

export const ORB_VOICE_V2_BARGE_IN_STOPPED_COPY = 'Stopped. I’m listening.' as const

/** Full speech-detected duplex barge-in requires continuous VAD during playback and is intentionally deferred. */
export const ORB_VOICE_V2_DUPLEX_VAD_BARGE_IN_ENABLED = false

export function isOrbVoiceWebRtcSupported(): boolean {
  return typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined'
}

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
  hybridSpeechAvailable: boolean,
  webrtcSupported: boolean = isOrbVoiceWebRtcSupported()
): OrbVoiceRealtimeMode {
  if (!status) return 'fallback'
  const mode = status.mode ?? status.transport
  if (status.available && (mode === 'webrtc' || status.transport === 'openai_realtime') && webrtcSupported) {
    return 'webrtc'
  }
  if (status.hybridSpeech && hybridSpeechAvailable) return 'hybrid'
  return 'fallback'
}

export function isOrbVoiceWebRtcMode(mode: OrbVoiceRealtimeMode): boolean {
  return mode === 'webrtc'
}

export function isOrbVoiceHybridMode(mode: OrbVoiceRealtimeMode): boolean {
  return mode === 'hybrid'
}

export function orbVoiceRealtimeEnabled(mode: OrbVoiceRealtimeMode): boolean {
  return mode === 'webrtc' || mode === 'hybrid'
}

export function orbVoiceRealtimeAvailable(
  status: OrbVoiceRealtimeBetaStatus | null,
  hybridSpeechAvailable: boolean,
  webrtcSupported: boolean = isOrbVoiceWebRtcSupported()
): boolean {
  return resolveOrbVoiceRealtimeMode(status, hybridSpeechAvailable, webrtcSupported) !== 'fallback'
}

export function resolveOrbVoiceRealtimeSetupLabel(mode: OrbVoiceRealtimeMode): string {
  if (mode === 'webrtc') return 'Realtime available'
  if (mode === 'hybrid') return 'Hybrid beta'
  return 'Standard voice mode'
}

export function resolveOrbVoiceRealtimeSetupDetail(
  mode: OrbVoiceRealtimeMode,
  reason?: string | null
): string | null {
  if (mode === 'fallback') {
    if (reason === 'disabled' || reason === 'missing_api_key' || reason === 'not_configured') {
      return 'Using standard voice mode on this browser.'
    }
    return 'Using standard voice mode on this browser.'
  }
  return null
}
