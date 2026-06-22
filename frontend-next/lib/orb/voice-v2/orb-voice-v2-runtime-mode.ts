/** Phase 5N.3 — honest runtime capture labels (configured vs active browser path). */

import type { OrbVoiceActiveCaptureMode, OrbVoiceRealtimeBetaStatus, OrbVoiceV2State } from './orb-voice-v2-types.ts'
import type { OrbVoiceRealtimeMode } from './orb-voice-v2-realtime-beta.ts'
import { isOrbVoiceWebRtcSupported } from './orb-voice-v2-realtime-beta.ts'

export function isSafariLikeBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export function mapRealtimeModeToActiveCapture(mode: OrbVoiceRealtimeMode): OrbVoiceActiveCaptureMode {
  if (mode === 'webrtc') return 'webrtc_active'
  if (mode === 'hybrid') return 'hybrid_active'
  if (mode === 'fallback') return 'standard_capture'
  return 'unavailable'
}

export function resolveOrbVoiceActiveCaptureLabel(mode: OrbVoiceActiveCaptureMode): string {
  switch (mode) {
    case 'webrtc_active':
      return 'WebRTC capture active'
    case 'hybrid_active':
      return 'Hybrid live transcript'
    case 'standard_capture':
      return isSafariLikeBrowser() ? 'Standard capture on Safari' : 'Standard voice capture'
    case 'fallback':
      return 'Fallback voice mode'
    default:
      return 'Voice capture unavailable'
  }
}

export function isOrbVoiceRealtimeConfigured(status: OrbVoiceRealtimeBetaStatus | null): boolean {
  if (!status?.available) return false
  const mode = status.mode ?? status.transport
  return mode === 'webrtc' || status.transport === 'openai_realtime' || Boolean(status.hybridSpeech)
}

export function resolveOrbVoiceConfiguredRealtimeLabel(
  status: OrbVoiceRealtimeBetaStatus | null,
  resolvedMode: OrbVoiceRealtimeMode
): string | null {
  if (!isOrbVoiceRealtimeConfigured(status)) return null
  if (resolvedMode === 'hybrid' || status?.hybridSpeech) return 'Hybrid configured'
  return 'Realtime configured'
}

export function resolveOrbVoiceRuntimeSetupDetail(input: {
  status: OrbVoiceRealtimeBetaStatus | null
  resolvedMode: OrbVoiceRealtimeMode
  activeCaptureMode: OrbVoiceActiveCaptureMode
  sessionStarted: boolean
}): string | null {
  const configured = isOrbVoiceRealtimeConfigured(input.status)
  const webrtcConfigured =
    configured &&
    (input.status?.mode === 'webrtc' || input.status?.transport === 'openai_realtime')
  const webrtcSupported = isOrbVoiceWebRtcSupported()

  if (input.sessionStarted) {
    return resolveOrbVoiceActiveCaptureLabel(input.activeCaptureMode)
  }

  if (webrtcConfigured && !webrtcSupported) {
    return 'Realtime configured · using standard capture on this browser'
  }

  if (webrtcConfigured && input.resolvedMode === 'fallback' && isSafariLikeBrowser()) {
    return 'Realtime configured · standard capture on Safari'
  }

  if (input.resolvedMode === 'fallback') {
    return isSafariLikeBrowser()
      ? 'Standard capture on Safari'
      : 'Using standard voice capture on this browser'
  }

  if (input.resolvedMode === 'hybrid') {
    return 'Hybrid live transcript when listening starts'
  }

  if (input.resolvedMode === 'webrtc') {
    return 'WebRTC capture when listening starts'
  }

  return null
}

export function resolveOrbVoiceRuntimeStatusCopy(input: {
  state: OrbVoiceV2State
  activeCaptureMode: OrbVoiceActiveCaptureMode
  voicePreparing?: boolean
}): string | null {
  if (input.state === 'idle' || input.state === 'summary_ready') return null
  if (input.state === 'interrupted') return 'Stopped. I’m listening again.'
  if (input.state === 'listening' || input.state === 'speech_detected') {
    if (input.activeCaptureMode === 'webrtc_active') return 'Listening · WebRTC capture'
    if (input.activeCaptureMode === 'hybrid_active') return 'Listening · hybrid live transcript'
    if (input.activeCaptureMode === 'standard_capture') {
      return isSafariLikeBrowser() ? 'Listening · standard Safari capture' : 'Listening'
    }
    if (input.activeCaptureMode === 'fallback') return 'Listening · fallback voice mode'
  }
  if (input.state === 'thinking') return 'ORB is thinking this through'
  if (input.voicePreparing && input.state === 'speaking') return 'Katherine is preparing voice…'
  if (input.state === 'speaking') return 'Katherine is responding'
  return null
}
