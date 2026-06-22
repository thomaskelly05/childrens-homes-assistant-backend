/**
 * ORB Voice UI state machine — separate from Dictate capture states.
 */

import type { OrbRealtimeVoiceStatus } from './orb-realtime-availability'
import {
  ORB_VOICE_BUTTON_SPEAKING,
  ORB_VOICE_BUTTON_START,
  ORB_VOICE_BUTTON_STOP_LISTENING,
  ORB_VOICE_BUTTON_STOP_ORB,
  ORB_VOICE_BUTTON_THINKING,
  ORB_VOICE_MIC_ERROR,
  ORB_VOICE_REFLECTIVE_HERO_LINE
} from './orb-voice-reflective-copy.ts'

export const ORB_REALTIME_CONFIGURED_PROVIDERS = ['openai', 'openai_realtime'] as const

/** True when realtime + v2 status probe reports realtime ready (no legacy session/status). */
export function isOrbRealtimeStatusConfigured(
  status: OrbRealtimeVoiceStatus | null | undefined
): boolean {
  if (!status?.ok || !status.realtime_enabled || status.reason !== 'configured') return false
  const provider = status.provider?.trim().toLowerCase()
  if (!provider) return false
  return (ORB_REALTIME_CONFIGURED_PROVIDERS as readonly string[]).includes(provider)
}

export type OrbVoiceUiState =
  | 'unauthenticated'
  | 'checking'
  | 'ready'
  | 'preparing'
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'speaking'
  | 'reconnecting'
  | 'ended'
  | 'failed_permission'
  | 'failed_connection'
  | 'unsupported'
  /** @deprecated Use `preparing` or `reconnecting` — kept for data-attribute compatibility */
  | 'connecting'
  /** @deprecated Use `unsupported` */
  | 'provider_unavailable'
  /** @deprecated Use `failed_connection` */
  | 'webrtc_failed'

export type OrbVoiceAuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

export type ResolveOrbVoiceUiStateInput = {
  authStatus: OrbVoiceAuthStatus
  statusProbe: 'idle' | 'loading' | 'done'
  realtimeStatus: OrbRealtimeVoiceStatus | null
  startStage: 'idle' | 'starting' | 'active' | 'failed'
  sessionEnded: boolean
  transportLive: boolean
  realtimeState: string
  webrtcFailed: boolean
  permissionDenied?: boolean
  /** Browser voice engine active (PTT / server transcription) — not WebRTC reconnect. */
  browserEngineActive?: boolean
}

export function resolveOrbVoiceUiState(input: ResolveOrbVoiceUiStateInput): OrbVoiceUiState {
  if (input.authStatus === 'unauthenticated') return 'unauthenticated'

  if (
    input.authStatus === 'unknown' ||
    input.statusProbe === 'loading' ||
    input.statusProbe === 'idle'
  ) {
    return 'checking'
  }

  if (input.sessionEnded && input.startStage === 'idle') return 'ended'

  if (input.permissionDenied && input.startStage === 'failed') return 'failed_permission'

  if (input.webrtcFailed || (input.startStage === 'failed' && isOrbRealtimeStatusConfigured(input.realtimeStatus))) {
    return 'failed_connection'
  }

  if (input.startStage === 'starting') return 'preparing'

  if (input.browserEngineActive && input.startStage === 'active') {
    if (input.realtimeState === 'speaking') return 'speaking'
    if (input.realtimeState === 'thinking' || input.realtimeState === 'transcribing') return 'thinking'
    return 'listening'
  }

  if (input.startStage === 'active' && !input.transportLive) return 'reconnecting'

  if (input.startStage === 'active' && input.transportLive) {
    if (input.realtimeState === 'speaking') return 'speaking'
    if (input.realtimeState === 'thinking' || input.realtimeState === 'transcribing') return 'thinking'
    if (input.realtimeState === 'speech_detected') return 'user_speaking'
    return 'listening'
  }

  if (input.startStage === 'failed') {
    return isOrbRealtimeStatusConfigured(input.realtimeStatus) ? 'failed_connection' : 'unsupported'
  }

  if (!isOrbRealtimeStatusConfigured(input.realtimeStatus)) {
    return 'unsupported'
  }

  return 'ready'
}

/** Normalise legacy state names for UI consumers. */
export function normaliseOrbVoiceUiState(state: OrbVoiceUiState): OrbVoiceUiState {
  switch (state) {
    case 'connecting':
      return 'preparing'
    case 'provider_unavailable':
      return 'unsupported'
    case 'webrtc_failed':
      return 'failed_connection'
    default:
      return state
  }
}

export type OrbVoiceStartProgressStage = 'opening_mic' | 'listening_local' | 'connecting_orb' | 'ready'

export function resolveOrbVoiceStartProgressStage(input: {
  voiceCaptureState: string
  startStage: 'idle' | 'starting' | 'active' | 'failed'
  transportLive: boolean
  browserLaunch: boolean
  listening: boolean
}): OrbVoiceStartProgressStage | null {
  if (input.voiceCaptureState === 'requesting_permission') return 'opening_mic'
  if (
    input.browserLaunch &&
    (input.listening || input.voiceCaptureState === 'listening' || input.voiceCaptureState === 'recording')
  ) {
    return 'listening_local'
  }
  if (input.startStage === 'starting' && !input.transportLive) return 'connecting_orb'
  if (input.startStage === 'active' && input.transportLive) return 'ready'
  if (input.voiceCaptureState === 'starting') return 'opening_mic'
  return null
}

export function orbVoiceStartProgressLine(stage: OrbVoiceStartProgressStage): string {
  switch (stage) {
    case 'opening_mic':
      return 'Opening microphone…'
    case 'listening_local':
      return 'Listening…'
    case 'connecting_orb':
      return 'Connecting ORB voice…'
    case 'ready':
      return 'Ready'
    default:
      return 'Opening microphone…'
  }
}

export function orbVoiceUiStatusLine(state: OrbVoiceUiState): string {
  switch (normaliseOrbVoiceUiState(state)) {
    case 'unauthenticated':
      return 'Sign in to use ORB Voice.'
    case 'checking':
      return 'Checking voice…'
    case 'ready':
      return 'Ready to talk'
    case 'preparing':
      return 'Opening microphone…'
    case 'listening':
      return 'Listening…'
    case 'user_speaking':
      return 'I heard that.'
    case 'thinking':
      return 'Thinking with you…'
    case 'speaking':
      return 'ORB is responding…'
    case 'reconnecting':
      return 'Reconnecting…'
    case 'ended':
      return 'Voice session captured'
    case 'failed_permission':
      return ORB_VOICE_MIC_ERROR.split('.')[0] + '.'
    case 'failed_connection':
      return 'Voice could not connect.'
    case 'unsupported':
      return 'Voice is not available in this browser.'
    default:
      return 'Ready to talk'
  }
}

export function orbVoiceUiDetailLine(state: OrbVoiceUiState, dictateReady?: boolean): string | null {
  void dictateReady
  switch (normaliseOrbVoiceUiState(state)) {
    case 'unauthenticated':
      return 'Sign in to start a live conversation with ORB.'
    case 'ready':
      return ORB_VOICE_REFLECTIVE_HERO_LINE
    case 'preparing':
      return 'Getting voice ready…'
    case 'listening':
      return 'Speak naturally. You can pause.'
    case 'user_speaking':
      return 'Keep going when you are ready.'
    case 'thinking':
      return "I'm structuring what you shared."
    case 'speaking':
      return 'You can continue when I finish.'
    case 'reconnecting':
      return 'Trying to restore your voice connection…'
    case 'failed_permission':
      return ORB_VOICE_MIC_ERROR
    case 'failed_connection':
      return 'You can try again, type instead, or use Dictate.'
    case 'unsupported':
      return 'Try typing, Dictate, or another browser.'
    case 'ended':
      return 'Review what was discussed before turning it into a record.'
    default:
      return null
  }
}

export function orbVoiceUiPrimaryLabel(state: OrbVoiceUiState): string {
  switch (normaliseOrbVoiceUiState(state)) {
    case 'unauthenticated':
      return 'Sign in'
    case 'ready':
      return ORB_VOICE_BUTTON_START
    case 'preparing':
    case 'reconnecting':
      return 'Cancel'
    case 'listening':
    case 'user_speaking':
      return ORB_VOICE_BUTTON_STOP_LISTENING
    case 'thinking':
      return ORB_VOICE_BUTTON_THINKING
    case 'speaking':
      return ORB_VOICE_BUTTON_STOP_ORB
    case 'ended':
      return 'Start new voice conversation'
    case 'failed_permission':
    case 'failed_connection':
    case 'unsupported':
      return 'Try voice again'
    default:
      return ORB_VOICE_BUTTON_START
  }
}

export function isOrbVoiceSessionLiveState(state: OrbVoiceUiState): boolean {
  const normalised = normaliseOrbVoiceUiState(state)
  return (
    normalised === 'listening' ||
    normalised === 'user_speaking' ||
    normalised === 'thinking' ||
    normalised === 'speaking' ||
    normalised === 'reconnecting'
  )
}

export function isOrbVoiceFailureState(state: OrbVoiceUiState): boolean {
  const normalised = normaliseOrbVoiceUiState(state)
  return (
    normalised === 'failed_permission' ||
    normalised === 'failed_connection' ||
    normalised === 'unsupported'
  )
}
