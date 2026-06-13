/**
 * ORB Voice UI state machine — separate from Dictate capture states.
 */

import type { OrbRealtimeVoiceStatus } from './orb-realtime-availability'

export const ORB_REALTIME_CONFIGURED_PROVIDERS = ['openai', 'openai_realtime'] as const

/** True when GET /orb/voice/session/status reports realtime ready (no session/client secret required). */
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

export function orbVoiceUiStatusLine(state: OrbVoiceUiState): string {
  switch (normaliseOrbVoiceUiState(state)) {
    case 'unauthenticated':
      return 'Sign in to use ORB Voice.'
    case 'checking':
      return 'Checking voice…'
    case 'ready':
      return "I'm ready when you are."
    case 'preparing':
      return 'Preparing voice…'
    case 'listening':
      return "I'm listening."
    case 'user_speaking':
      return 'I heard that.'
    case 'thinking':
      return 'Give me a moment.'
    case 'speaking':
      return 'ORB is responding.'
    case 'reconnecting':
      return 'Reconnecting…'
    case 'ended':
      return 'Voice session captured'
    case 'failed_permission':
      return 'Microphone access is needed.'
    case 'failed_connection':
      return 'Voice could not connect.'
    case 'unsupported':
      return 'Voice is not available in this browser.'
    default:
      return "I'm ready when you are."
  }
}

export function orbVoiceUiDetailLine(state: OrbVoiceUiState, dictateReady?: boolean): string | null {
  void dictateReady
  switch (normaliseOrbVoiceUiState(state)) {
    case 'unauthenticated':
      return 'Sign in to start a live conversation with ORB.'
    case 'ready':
      return 'Talk through a situation, rough note or concern. ORB will help you reflect and decide what may need recording.'
    case 'preparing':
      return 'Setting up your microphone and voice connection…'
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
      return 'You can still type or use Dictate.'
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
      return 'Start voice'
    case 'preparing':
    case 'reconnecting':
      return 'Cancel'
    case 'listening':
    case 'user_speaking':
    case 'thinking':
    case 'speaking':
      return 'End'
    case 'ended':
      return 'Start new voice conversation'
    case 'failed_permission':
    case 'failed_connection':
    case 'unsupported':
      return 'Try voice again'
    default:
      return 'Start voice'
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
