'use client'

import type { CSSProperties } from 'react'

import './orb-voice-studio-layout.css'

import {
  OrbVoiceCompanion,
  ORB_VOICE_COMPANION_HEADLINES,
  ORB_VOICE_COMPANION_STATE_LABELS,
  ORB_VOICE_COMPANION_STATES,
  type OrbVoiceCompanionState
} from '@/components/orb-residential/orb-voice-companion'

const TRUST_FEATURES = [
  { id: 'natural', label: 'Natural', detail: 'Speak naturally — ORB understands context.' },
  { id: 'private', label: 'Private', detail: 'Voice stays within your ORB account boundary.' },
  { id: 'professional', label: 'Professional', detail: 'Built for residential care judgement.' },
  { id: 'always-here', label: 'Always here', detail: 'Ready when you need a calm voice copilot.' }
] as const

/** Animated waveform strip below companion headline in the voice studio. */
export function OrbVoiceStudioWaveform({
  state,
  className = ''
}: {
  state: OrbVoiceCompanionState
  className?: string
}) {
  const active = state === 'listening' || state === 'speaking'
  return (
    <div
      className={`orb-voice-studio-waveform ${className}`.trim()}
      data-orb-voice-waveform
      data-orb-voice-waveform-active={active ? 'true' : 'false'}
      data-orb-voice-state={state}
      aria-hidden
    >
      {Array.from({ length: 7 }, (_, index) => (
        <span key={index} className="orb-voice-studio-waveform__bar" style={{ '--orb-bar-index': index } as CSSProperties} />
      ))}
    </div>
  )
}

/** Right-side ORB voice state reference cards (desktop studio). */
export function OrbVoiceStatePanel({
  activeState,
  className = ''
}: {
  activeState: OrbVoiceCompanionState
  className?: string
}) {
  return (
    <aside
      className={`orb-voice-state-panel ${className}`.trim()}
      data-orb-voice-state-panel
      aria-label="ORB voice states"
    >
      <h3 className="orb-voice-state-panel__title">ORB voice states</h3>
      <ul className="orb-voice-state-panel__list">
        {ORB_VOICE_COMPANION_STATES.map((state) => (
          <li key={state}>
            <div
              className="orb-voice-state-panel__card"
              data-orb-voice-state-card={state}
              data-orb-voice-state-active={activeState === state ? 'true' : 'false'}
            >
              <OrbVoiceCompanion state={state} size="mini" label={`ORB ${ORB_VOICE_COMPANION_STATE_LABELS[state]}`} />
              <div className="orb-voice-state-panel__copy">
                <p className="orb-voice-state-panel__label">{ORB_VOICE_COMPANION_STATE_LABELS[state]}</p>
                <p className="orb-voice-state-panel__headline">{ORB_VOICE_COMPANION_HEADLINES[state]}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

/** Bottom mobile state preview strip (desktop studio). */
export function OrbVoiceMobilePreviewStrip({
  activeState,
  className = ''
}: {
  activeState: OrbVoiceCompanionState
  className?: string
}) {
  return (
    <div
      className={`orb-voice-mobile-preview ${className}`.trim()}
      data-orb-voice-mobile-preview
      aria-label="Mobile voice state previews"
    >
      <p className="orb-voice-mobile-preview__title">Mobile preview</p>
      <div className="orb-voice-mobile-preview__row">
        {ORB_VOICE_COMPANION_STATES.map((state) => (
          <div
            key={state}
            className="orb-voice-mobile-preview__card"
            data-orb-voice-mobile-preview-card={state}
            data-orb-voice-state-active={activeState === state ? 'true' : 'false'}
          >
            <OrbVoiceCompanion state={state} size="mobile-preview" label={`Mobile ${state}`} />
            <span className="orb-voice-mobile-preview__label">{ORB_VOICE_COMPANION_STATE_LABELS[state]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Trust feature row for voice studio. */
export function OrbVoiceTrustStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`orb-voice-trust-strip ${className}`.trim()}
      data-orb-voice-trust-strip
      data-orb-voice-trust-cards
    >
      {TRUST_FEATURES.map((feature) => (
        <div key={feature.id} className="orb-voice-trust-strip__card" data-orb-voice-trust={feature.id}>
          <p className="orb-voice-trust-strip__label">{feature.label}</p>
          <p className="orb-voice-trust-strip__detail">{feature.detail}</p>
        </div>
      ))}
    </div>
  )
}
