import {
  orbVoiceUiDetailLine,
  orbVoiceUiPrimaryLabel,
  orbVoiceUiStatusLine,
  type OrbVoiceUiState
} from './orb-voice-ui-state'

/** @deprecated Use OrbVoiceUiState from orb-voice-ui-state */
export type VoiceMobileSessionPhase = OrbVoiceUiState

export function voiceMobilePrimaryButton(input: {
  uiState: OrbVoiceUiState
  sessionLive?: boolean
  starting?: boolean
}): string {
  if (input.sessionLive) return 'End'
  if (input.starting) return 'Connecting…'
  return orbVoiceUiPrimaryLabel(input.uiState)
}

export function voiceMobileStatusLine(input: {
  uiState: OrbVoiceUiState
  permissionDenied?: boolean
  blockedReason?: string | null
}): string {
  if (input.permissionDenied) return 'Microphone access is blocked'
  if (input.blockedReason?.trim()) return input.blockedReason.trim()
  return orbVoiceUiStatusLine(input.uiState)
}

export function voiceMobileUnavailableDetail(dictateRealtimeReady?: boolean): string {
  return orbVoiceUiDetailLine('provider_unavailable', dictateRealtimeReady) ?? 'You can still type to ORB or use Dictate.'
}
