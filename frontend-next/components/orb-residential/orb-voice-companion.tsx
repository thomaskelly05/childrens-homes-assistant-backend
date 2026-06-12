'use client'

import { OrbVoiceHead } from '@/components/orb-residential/orb-voice-head'

export type {
  OrbVoiceCompanionLegacySize,
  OrbVoiceCompanionSize,
  OrbVoiceCompanionState
} from '@/components/orb-residential/orb-voice-head'

export { resolveOrbVoiceCompanionSize } from '@/components/orb-residential/orb-voice-head'

export const ORB_VOICE_COMPANION_STATES = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'paused',
  'error'
] as const

export const ORB_VOICE_COMPANION_STATE_LABELS: Record<
  import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionState,
  string
> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  paused: 'Paused / Finished',
  error: 'Error / Unavailable'
}

export const ORB_VOICE_COMPANION_HEADLINES: Record<
  import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionState,
  string
> = {
  idle: "I'm ORB. I'm listening.",
  listening: "I'm listening.",
  thinking: 'Let me think…',
  speaking: 'ORB is speaking.',
  paused: "I'm here when you're ready.",
  error: 'Voice is unavailable right now.'
}

export const ORB_VOICE_COMPANION_SUBLINES: Partial<
  Record<import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionState, string>
> = {
  idle:
    'Talk through a situation, rough note or concern. ORB will help you reflect, structure your thinking and decide what may need recording.',
  listening:
    'Talk through a situation, rough note or concern. ORB will help you reflect, structure your thinking and decide what may need recording.'
}

export function mapOrbVoiceUiToCompanionState(
  input: string | null | undefined
): import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionState {
  switch (input) {
    case 'listening':
      return 'listening'
    case 'thinking':
    case 'connecting':
      return 'thinking'
    case 'speaking':
    case 'responding':
      return 'speaking'
    case 'ended':
    case 'paused':
    case 'interrupted':
      return 'paused'
    case 'provider_unavailable':
    case 'webrtc_failed':
    case 'unauthenticated':
    case 'error':
    case 'offline':
      return 'error'
    default:
      return 'idle'
  }
}

/**
 * Living ORB voice companion — OrbVoiceHead with companion metadata.
 * Visual only; voice transport logic stays in the voice station hook.
 */
export function OrbVoiceCompanion({
  state = 'idle',
  className = '',
  label = 'ORB voice companion',
  size = 'hero',
  speechEnergy,
  audioElement = null
}: {
  state?: import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionState
  className?: string
  label?: string
  /** `hero` centre companion; `mini` debug cards; `mobile-preview` debug strip */
  size?: import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionSize | import('@/components/orb-residential/orb-voice-head').OrbVoiceCompanionLegacySize
  speechEnergy?: number
  audioElement?: HTMLAudioElement | null
}) {
  return (
    <OrbVoiceHead
      state={state}
      className={className}
      label={label}
      size={size}
      speechEnergy={speechEnergy}
      audioElement={audioElement}
    />
  )
}
