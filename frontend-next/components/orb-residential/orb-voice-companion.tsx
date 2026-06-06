'use client'

import { OrbPresence, type OrbPresenceState } from '@/components/orb-residential/ui/orb-presence'

/** Visual-only voice companion states — safe fallbacks when transport state is unavailable. */
export type OrbVoiceCompanionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

export function mapOrbVoiceUiToCompanionState(input: string | null | undefined): OrbVoiceCompanionState {
  switch (input) {
    case 'listening':
      return 'listening'
    case 'thinking':
    case 'connecting':
      return 'thinking'
    case 'speaking':
    case 'responding':
      return 'speaking'
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

function companionToPresenceState(state: OrbVoiceCompanionState): OrbPresenceState {
  switch (state) {
    case 'listening':
      return 'listening'
    case 'thinking':
      return 'thinking'
    case 'speaking':
      return 'responding'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
}

/**
 * Living ORB voice companion — abstract head silhouette with breathing/listening/thinking/speaking states.
 * Visual only; voice transport logic stays in the voice station hook.
 */
export function OrbVoiceCompanion({
  state = 'idle',
  className = '',
  label = 'ORB voice companion'
}: {
  state?: OrbVoiceCompanionState
  className?: string
  label?: string
}) {
  const presenceState = companionToPresenceState(state)
  const pulse = state === 'listening' || state === 'thinking' || state === 'speaking'

  return (
    <div
      className={`orb-voice-companion flex shrink-0 items-center justify-center ${className}`.trim()}
      data-orb-voice-companion
      data-orb-voice-state={state}
      data-orb-voice-head
      aria-live="polite"
      aria-label={label}
    >
      <OrbPresence variant="voice" state={presenceState} pulse={pulse} label={label} />
    </div>
  )
}
