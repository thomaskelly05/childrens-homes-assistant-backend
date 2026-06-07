'use client'

import type { CSSProperties } from 'react'

import type { OrbVoiceCompanionState } from '@/components/orb-residential/orb-voice-head'
import {
  ORB_VOICE_CORE_ASSET_PNG,
  ORB_VOICE_CORE_ASSET_WEBP
} from '@/lib/orb/orb-visual-build'

export type OrbVoiceCoreProps = {
  state: OrbVoiceCompanionState
  speechEnergy: number
  speechDriven: boolean
  reducedMotion: boolean
}

/**
 * Living multi-coloured ORB intelligence core for Voice.
 * Transparent 3D sphere asset as the body; CSS layers provide atmosphere only.
 */
export function OrbVoiceCore({ state, speechEnergy, speechDriven, reducedMotion }: OrbVoiceCoreProps) {
  const isSpeaking = state === 'speaking'
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const showListenMotion = isListening && !reducedMotion
  const showThinkMotion = isThinking && !reducedMotion

  return (
    <div className="orb-voice-core" data-orb-voice-core data-orb-voice-core-state={state} aria-hidden>
      <div
        className="orb-voice-core__floor-glow orb-voice-core__ground-glow"
        data-orb-voice-floor-glow
        data-orb-voice-ground-glow
        aria-hidden
      />
      <div
        className="orb-voice-core__halo orb-voice-core__outer-halo"
        data-orb-voice-halo
        data-orb-voice-outer-halo
        aria-hidden
      />
      <div className="orb-voice-core__aura" data-orb-voice-aura aria-hidden />

      {showListenMotion ? (
        <div
          className="orb-voice-core__state-ripples orb-voice-core__listen-rings"
          data-orb-voice-state-ripples
          data-orb-voice-listen-rings
          aria-hidden
        >
          <span className="orb-voice-core__listen-ring orb-voice-core__listen-ring--1" />
          <span className="orb-voice-core__listen-ring orb-voice-core__listen-ring--2" />
          <span className="orb-voice-core__listen-ring orb-voice-core__listen-ring--3" />
        </div>
      ) : null}

      {showThinkMotion ? (
        <div
          className="orb-voice-core__thinking-glow"
          data-orb-voice-thinking-glow
          aria-hidden
        />
      ) : null}

      <div
        className="orb-voice-core__sphere-wrap"
        data-orb-voice-breathe
        data-orb-voice-head-motion
        aria-hidden
      >
        <div className="orb-voice-core__sphere" data-orb-voice-core-sphere>
          <picture className="orb-voice-core__asset" data-orb-voice-orb-asset>
            <source srcSet={ORB_VOICE_CORE_ASSET_WEBP} type="image/webp" />
            <img
              className="orb-voice-core__asset-img"
              src={ORB_VOICE_CORE_ASSET_PNG}
              alt=""
              decoding="async"
              draggable={false}
            />
          </picture>
          {showThinkMotion ? (
            <div className="orb-voice-core__swirl orb-voice-core__shimmer" data-orb-voice-thinking-swirl aria-hidden />
          ) : null}
        </div>
      </div>

      <div
        className="orb-voice-core__waveform-bridge orb-voice-core__waveform"
        data-orb-voice-waveform
        data-orb-voice-waveform-active={isSpeaking ? 'true' : 'false'}
        data-orb-voice-speech-driven={speechDriven ? 'true' : 'false'}
        style={{ '--orb-voice-speech-energy': String(speechEnergy) } as CSSProperties}
        aria-hidden
      >
        <span className="orb-voice-core__waveform-bar orb-voice-core__waveform-bar--1" />
        <span className="orb-voice-core__waveform-bar orb-voice-core__waveform-bar--2" />
        <span className="orb-voice-core__waveform-bar orb-voice-core__waveform-bar--3" />
        <span className="orb-voice-core__waveform-bar orb-voice-core__waveform-bar--4" />
        <span className="orb-voice-core__waveform-bar orb-voice-core__waveform-bar--5" />
      </div>
    </div>
  )
}
