/**
 * ORB Voice launch mode — browser push-to-talk / synthesis fallback vs optional OpenAI realtime.
 * Safe to import from tests without React.
 */

import {
  ORB_VOICE_BOUNDARY_COPY,
  ORB_RESIDENTIAL_VOICE_SAFETY_STRIP
} from '../orb-residential-safety-copy.ts'
import { orbResidentialStation } from '../orb-residential-stations.ts'
import { isOrbWebRealtimeVoiceEnabled } from './orb-web-voice-config.ts'

const ORB_REALTIME_CONFIGURED_PROVIDERS = ['openai', 'openai_realtime'] as const

const voiceStation = orbResidentialStation('orb_voice')

function isOrbRealtimeStatusConfigured(
  status: OrbRealtimeVoiceStatusLite | null | undefined
): boolean {
  if (!status?.ok || !status.realtime_enabled || status.reason !== 'configured') return false
  const provider = status.provider?.trim().toLowerCase()
  if (!provider) return false
  return (ORB_REALTIME_CONFIGURED_PROVIDERS as readonly string[]).includes(provider)
}

export type OrbRealtimeVoiceStatusLite = {
  ok: boolean
  realtime_enabled: boolean
  provider: string | null
  reason: 'configured' | 'not_configured' | 'endpoint_failed'
}

export const ORB_VOICE_PANEL_TITLE = voiceStation.label
export const ORB_VOICE_PANEL_SUBTITLE = voiceStation.tagline
export const ORB_VOICE_PANEL_MOBILE_SUBTITLE = voiceStation.tagline

export { ORB_VOICE_BOUNDARY_COPY, ORB_RESIDENTIAL_VOICE_SAFETY_STRIP }

export type OrbVoiceLaunchMode = 'browser_ptt' | 'openai_realtime' | 'unavailable'

export type OrbVoiceLaunchUiState =
  | 'ready'
  | 'starting'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'unavailable'
  | 'error'

export type ResolveOrbVoiceLaunchModeInput = {
  realtimeStatus: OrbRealtimeVoiceStatusLite | null
  recognitionAvailable: boolean
  synthesisAvailable: boolean
  liveVoiceAllowed: boolean
  secureContext?: boolean
}

export function resolveOrbVoiceLaunchMode(input: ResolveOrbVoiceLaunchModeInput): OrbVoiceLaunchMode {
  const secure = input.secureContext !== false
  if (!secure) return 'unavailable'
  if (
    input.liveVoiceAllowed &&
    isOrbWebRealtimeVoiceEnabled() &&
    isOrbRealtimeStatusConfigured(input.realtimeStatus)
  ) {
    return 'openai_realtime'
  }
  if (input.recognitionAvailable || input.synthesisAvailable) {
    return 'browser_ptt'
  }
  return 'unavailable'
}

export type ResolveOrbVoiceLaunchUiStateInput = {
  launchMode: OrbVoiceLaunchMode
  captureState: string
  phase: string
  listening: boolean
  speaking: boolean
  pending?: boolean
  error?: string | null
  hasTranscript?: boolean
}

export function resolveOrbVoiceLaunchUiState(input: ResolveOrbVoiceLaunchUiStateInput): OrbVoiceLaunchUiState {
  if (input.launchMode === 'unavailable') return 'unavailable'
  if (input.error || input.captureState === 'error' || input.phase === 'error') return 'error'
  if (input.captureState === 'requesting_permission' || input.captureState === 'starting') return 'starting'
  if (input.pending) return 'thinking'
  if (input.speaking || input.captureState === 'speaking') return 'speaking'
  if (input.captureState === 'transcribing') return 'transcribing'
  if (input.listening || input.captureState === 'listening' || input.captureState === 'recording') {
    return 'listening'
  }
  if (input.hasTranscript || input.phase === 'transcript_ready') return 'ready'
  return 'ready'
}

export function orbVoiceLaunchStatusLabel(state: OrbVoiceLaunchUiState): string {
  switch (state) {
    case 'ready':
      return 'Ready'
    case 'starting':
      return 'Starting'
    case 'listening':
      return 'Listening'
    case 'transcribing':
      return 'Transcribing'
    case 'thinking':
      return 'Thinking'
    case 'speaking':
      return 'Speaking'
    case 'unavailable':
      return 'Unavailable'
    case 'error':
      return 'Error'
    default:
      return 'Ready'
  }
}

export function orbVoiceLaunchHeadline(
  state: OrbVoiceLaunchUiState,
  options?: { pushToTalk?: boolean; realtimeConfigured?: boolean }
): string {
  switch (state) {
    case 'ready':
      if (options?.realtimeConfigured) return 'Ready to talk'
      return options?.pushToTalk !== false ? 'Hold or tap to speak' : 'Ready to talk'
    case 'starting':
      return 'Opening microphone…'
    case 'listening':
      return "I'm listening."
    case 'transcribing':
      return 'I heard that.'
    case 'thinking':
      return 'Give me a moment.'
    case 'speaking':
      return 'ORB is responding.'
    case 'unavailable':
      return 'Voice is not available in this browser.'
    case 'error':
      return 'Voice could not connect.'
    default:
      return 'Ready to talk'
  }
}

export function orbVoiceLaunchPrimaryLabel(
  state: OrbVoiceLaunchUiState,
  options?: { pushToTalk?: boolean; listening?: boolean }
): string {
  if (state === 'unavailable' || state === 'error') return 'Use Dictate or type'
  if (state === 'listening') return options?.pushToTalk !== false ? 'Release to finish' : 'Stop listening'
  if (state === 'transcribing' || state === 'thinking' || state === 'speaking') return 'Cancel'
  return options?.pushToTalk !== false ? 'Push to talk' : 'Start listening'
}

/** Whether ORB chat auto-read should be suppressed for safeguarding-sensitive modes. */
export function shouldSuppressOrbAutoReadAloud(mode: string, urgentSafeguardingBanner: boolean): boolean {
  const normalised = mode.trim().toLowerCase()
  if (urgentSafeguardingBanner) return true
  return normalised === 'safeguarding thinking' || normalised.includes('safeguard')
}
