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
      <div className="orb-voice-companion__stage" data-orb-voice-head-stage>
        <OrbPresence variant="voice" state={presenceState} pulse={pulse} label={label} />
        <div className="orb-voice-companion__face" aria-hidden>
          <span className="orb-voice-companion__eyes" data-orb-voice-eyes />
          <span
            className="orb-voice-companion__waveform"
            data-orb-voice-waveform
            data-orb-voice-waveform-active={state === 'speaking' ? 'true' : 'false'}
          />
          {state === 'thinking' ? <span className="orb-voice-companion__orbit" data-orb-voice-orbit /> : null}
          {state === 'listening' ? <span className="orb-voice-companion__listen-glow" data-orb-voice-listen-glow /> : null}
        </div>
      </div>
    </div>
  )
}
