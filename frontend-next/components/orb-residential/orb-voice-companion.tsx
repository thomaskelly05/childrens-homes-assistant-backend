'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { ORB_VOICE_VERSION } from '@/lib/orb/orb-visual-build'
import { getOrbHueProfile, type OrbVisualState } from '@/lib/orb/rendering/visual-system'

/** Visual-only voice companion states — safe fallbacks when transport state is unavailable. */
export type OrbVoiceCompanionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

export const ORB_VOICE_COMPANION_STATES: readonly OrbVoiceCompanionState[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'error'
] as const

export const ORB_VOICE_COMPANION_STATE_LABELS: Record<OrbVoiceCompanionState, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Error / Unavailable'
}

export const ORB_VOICE_COMPANION_HEADLINES: Record<OrbVoiceCompanionState, string> = {
  idle: "I'm ORB. I'm listening.",
  listening: "I'm listening.",
  thinking: 'Let me think…',
  speaking: 'ORB is speaking.',
  error: 'Voice is unavailable right now.'
}

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

function companionToVisualState(state: OrbVoiceCompanionState): OrbVisualState {
  switch (state) {
    case 'listening':
      return 'listening'
    case 'thinking':
      return 'thinking'
    case 'speaking':
      return 'speaking'
    case 'error':
      return 'offline'
    default:
      return 'idle'
  }
}

/**
 * Living ORB voice companion — abstract head/bust silhouette with calm face marks.
 * Visual only; voice transport logic stays in the voice station hook.
 */
export function OrbVoiceCompanion({
  state = 'idle',
  className = '',
  label = 'ORB voice companion',
  size = 'default'
}: {
  state?: OrbVoiceCompanionState
  className?: string
  label?: string
  /** `preview` / `mini` for state panel and mobile preview cards */
  size?: 'default' | 'preview' | 'mini'
}) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const visualState = companionToVisualState(state)
  const renderState: OrbVisualState = reducedMotion ? 'reduced_motion' : visualState
  const hueProfile = useMemo(() => getOrbHueProfile(renderState, reducedMotion), [renderState, reducedMotion])
  const pulse = state === 'listening' || state === 'thinking' || state === 'speaking'

  const hueStyle = {
    '--orb-hue-a': hueProfile.hueA,
    '--orb-hue-b': hueProfile.hueB,
    '--orb-hue-c': hueProfile.hueC,
    '--orb-warm': hueProfile.warm,
    '--orb-glow': String(hueProfile.glow),
    '--orb-motion-speed': reducedMotion ? '0.001ms' : hueProfile.motionSpeed,
    '--orb-edge-opacity': String(hueProfile.edgeOpacity)
  } as CSSProperties

  const sizeClass =
    size === 'mini' ? 'orb-voice-companion--mini' : size === 'preview' ? 'orb-voice-companion--preview' : ''

  return (
    <div
      className={`orb-voice-companion flex shrink-0 items-center justify-center ${sizeClass} ${className}`.trim()}
      data-orb-voice-companion
      data-orb-voice-version={ORB_VOICE_VERSION}
      data-orb-voice-state={state}
      data-orb-voice-head
      data-orb-voice-head-size={size}
      aria-live="polite"
      aria-label={label}
    >
      <div className="orb-voice-companion__stage" data-orb-voice-head-stage>
        <div
          className={`orb-voice-companion__aura${pulse && !reducedMotion ? ' orb-voice-companion__aura--pulse' : ''}`}
          aria-hidden
        />
        <div className="orb-voice-companion__silhouette" style={hueStyle} aria-hidden>
          <div className="orb-voice-companion__head-shell" data-orb-voice-head-shell>
            <div className="orb-voice-companion__head-material" />
            <div className="orb-voice-companion__neck" />
            <div className="orb-voice-companion__bust" />
          </div>
          <div className="orb-voice-companion__face" data-orb-voice-face>
            <span className="orb-voice-companion__eyes" data-orb-voice-eyes />
            {state === 'listening' ? (
              <>
                <span className="orb-voice-companion__ear orb-voice-companion__ear--left" data-orb-voice-ear-left />
                <span className="orb-voice-companion__ear orb-voice-companion__ear--right" data-orb-voice-ear-right />
                <span className="orb-voice-companion__listen-glow" data-orb-voice-listen-glow />
              </>
            ) : null}
            {state === 'speaking' ? (
              <span
                className="orb-voice-companion__mouth-wave"
                data-orb-voice-waveform
                data-orb-voice-waveform-active="true"
              />
            ) : (
              <span
                className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--idle"
                data-orb-voice-waveform
                data-orb-voice-waveform-active="false"
              />
            )}
            {state === 'thinking' ? <span className="orb-voice-companion__orbit" data-orb-voice-orbit /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
