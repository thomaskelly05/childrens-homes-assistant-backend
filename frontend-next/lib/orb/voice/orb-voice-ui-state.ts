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
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ended'
  | 'provider_unavailable'
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

  if (input.webrtcFailed) return 'webrtc_failed'

  if (input.startStage === 'starting') return 'connecting'

  if (input.startStage === 'active' && !input.transportLive) return 'connecting'

  if (input.startStage === 'active' && input.transportLive) {
    if (input.realtimeState === 'speaking') return 'speaking'
    if (input.realtimeState === 'thinking' || input.realtimeState === 'transcribing') return 'thinking'
    return 'listening'
  }

  if (input.startStage === 'failed') {
    return isOrbRealtimeStatusConfigured(input.realtimeStatus) ? 'webrtc_failed' : 'provider_unavailable'
  }

  if (!isOrbRealtimeStatusConfigured(input.realtimeStatus)) {
    return 'provider_unavailable'
  }

  return 'ready'
}

export function orbVoiceUiStatusLine(state: OrbVoiceUiState): string {
  switch (state) {
    case 'unauthenticated':
      return 'Sign in to use ORB Voice.'
    case 'checking':
      return 'Checking voice…'
    case 'ready':
      return 'Tap to start'
    case 'connecting':
      return 'Connecting…'
    case 'listening':
      return "I'm listening"
    case 'thinking':
      return 'Thinking…'
    case 'speaking':
      return 'ORB is speaking'
    case 'ended':
      return 'Conversation ended'
    case 'provider_unavailable':
    case 'webrtc_failed':
      return 'Live voice could not connect.'
    default:
      return 'Tap to start'
  }
}

export function orbVoiceUiDetailLine(state: OrbVoiceUiState, dictateReady?: boolean): string | null {
  switch (state) {
    case 'unauthenticated':
      return 'Sign in to start a live conversation with ORB.'
    case 'ready':
      return 'Talk with ORB — speak naturally and ORB will respond.'
    case 'connecting':
      return 'Setting up your live voice session…'
    case 'listening':
      return 'Speak naturally — ORB will respond.'
    case 'provider_unavailable':
    case 'webrtc_failed':
      return dictateReady
        ? 'You can still type to ORB or use Dictate.'
        : 'You can still type to ORB or use Dictate.'
    case 'ended':
      return 'Start a new voice conversation or send the transcript to Dictate.'
    default:
      return null
  }
}

export function orbVoiceUiPrimaryLabel(state: OrbVoiceUiState): string {
  switch (state) {
    case 'unauthenticated':
      return 'Sign in'
    case 'ready':
      return 'Start voice'
    case 'connecting':
      return 'Cancel'
    case 'listening':
    case 'thinking':
    case 'speaking':
      return 'End'
    case 'ended':
      return 'Start new voice conversation'
    case 'provider_unavailable':
    case 'webrtc_failed':
      return 'Try voice again'
    default:
      return 'Start voice'
  }
}
