'use client'

import type { CSSProperties } from 'react'

import type { OrbVoiceCompanionState } from '@/components/orb-residential/orb-voice-head'

export type OrbVoiceCoreProps = {
  state: OrbVoiceCompanionState
  speechEnergy: number
  speechDriven: boolean
  reducedMotion: boolean
}

/**
 * Living multi-coloured ORB intelligence core for Voice.
 * Layered glass sphere with state-based colour, motion, and speech-energy response.
 */
export function OrbVoiceCore({ state, speechEnergy, speechDriven, reducedMotion }: OrbVoiceCoreProps) {
  const isSpeaking = state === 'speaking'
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const showListenMotion = isListening && !reducedMotion
  const showThinkMotion = isThinking && !reducedMotion
  const showPlasmaMotion = !reducedMotion

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

      {showListenMotion ? (
        <div className="orb-voice-core__particles" data-orb-voice-particles aria-hidden>
          <span className="orb-voice-core__particle orb-voice-core__particle--1" />
          <span className="orb-voice-core__particle orb-voice-core__particle--2" />
          <span className="orb-voice-core__particle orb-voice-core__particle--3" />
          <span className="orb-voice-core__particle orb-voice-core__particle--4" />
        </div>
      ) : null}

      <div
        className="orb-voice-core__sphere-wrap"
        data-orb-voice-breathe
        data-orb-voice-head-motion
        aria-hidden
      >
        <div className="orb-voice-core__sphere" data-orb-voice-core-sphere>
          <div className="orb-voice-core__sphere-clip" aria-hidden>
            <div
              className="orb-voice-core__inner-body orb-voice-core__depth-base"
              data-orb-voice-inner-body
              aria-hidden
            />
            <div
              className="orb-voice-core__inner-plasma orb-voice-core__plasma-field"
              data-orb-voice-inner-plasma
              data-orb-voice-plasma-field
              data-orb-voice-plasma-motion={showPlasmaMotion ? 'true' : 'false'}
              aria-hidden
            />
            <div className="orb-voice-core__plasma orb-voice-core__plasma--a" aria-hidden />
            <div className="orb-voice-core__plasma orb-voice-core__plasma--b" aria-hidden />
            <div className="orb-voice-core__plasma orb-voice-core__plasma--c" aria-hidden />
            <div className="orb-voice-core__field orb-voice-core__field--a" aria-hidden />
            <div className="orb-voice-core__field orb-voice-core__field--b" aria-hidden />
            {showThinkMotion ? (
              <div className="orb-voice-core__swirl" data-orb-voice-thinking-swirl aria-hidden />
            ) : null}
            <div className="orb-voice-core__inner-shadow" aria-hidden />
            <div className="orb-voice-core__refraction" aria-hidden />
          </div>

          <div
            className="orb-voice-core__shell orb-voice-core__glass-shell"
            data-orb-voice-shell
            aria-hidden
          />
          <div className="orb-voice-core__specular" aria-hidden />
          <div
            className="orb-voice-core__secondary-highlight orb-voice-core__specular-secondary"
            aria-hidden
          />
          <div className="orb-voice-core__rim orb-voice-core__rim-light" data-orb-voice-rim aria-hidden />
          <div className="orb-voice-core__rim-bloom" aria-hidden />
          <div
            className="orb-voice-core__edge-glow orb-voice-core__warm-rim-bloom"
            data-orb-voice-edge-glow
            aria-hidden
          />
          <div className="orb-voice-core__glass-highlight" aria-hidden />
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
