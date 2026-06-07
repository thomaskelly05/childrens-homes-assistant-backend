'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import './orb-voice.css'

import { OrbVoiceCore } from '@/components/orb-residential/orb-voice-core'
import { useOrbVoiceSpeechEnergy } from '@/components/orb-residential/use-orb-voice-speech-energy'
import { ORB_VOICE_VERSION } from '@/lib/orb/orb-visual-build'
import { getOrbHueProfile, type OrbVisualState } from '@/lib/orb/rendering/visual-system'

/** Visual-only voice companion states — safe fallbacks when transport state is unavailable. */
export type OrbVoiceCompanionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error'

/** Scoped companion render sizes — hero is the main voice studio centre piece. */
export type OrbVoiceCompanionSize = 'hero' | 'mini' | 'mobile-preview'

/** @deprecated Use `OrbVoiceCompanionSize` — kept for call-site compatibility. */
export type OrbVoiceCompanionLegacySize = 'default' | 'preview' | 'mini'

export function resolveOrbVoiceCompanionSize(
  size: OrbVoiceCompanionSize | OrbVoiceCompanionLegacySize = 'hero'
): OrbVoiceCompanionSize {
  switch (size) {
    case 'mini':
      return 'mini'
    case 'mobile-preview':
      return 'mobile-preview'
    case 'preview':
      return 'mini'
    case 'default':
    case 'hero':
    default:
      return 'hero'
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
    case 'paused':
      return 'idle'
    case 'error':
      return 'offline'
    default:
      return 'idle'
  }
}

function isEngagedAttention(state: OrbVoiceCompanionState): boolean {
  return state === 'listening' || state === 'thinking' || state === 'speaking'
}

function resolveCoreScale(state: OrbVoiceCompanionState, speechEnergy: number): number {
  if (state === 'speaking') return 1 + speechEnergy * 0.055
  if (state === 'listening') return 1.018
  if (state === 'thinking') return 1.012
  if (state === 'paused') return 0.992
  return 1
}

function resolveCoreBrightness(state: OrbVoiceCompanionState, speechEnergy: number): number {
  if (state === 'speaking') return 1.04 + speechEnergy * 0.14
  if (state === 'listening') return 1.08
  if (state === 'thinking') return 1.06
  if (state === 'paused') return 0.94
  if (state === 'error') return 0.82
  return 1
}

function resolveAuraOpacity(state: OrbVoiceCompanionState, speechEnergy: number): number {
  if (state === 'speaking') return 0.48 + speechEnergy * 0.28
  if (state === 'listening') return 0.56
  if (state === 'thinking') return 0.52
  if (state === 'paused') return 0.36
  if (state === 'error') return 0.28
  return 0.44
}

function resolveHueShift(state: OrbVoiceCompanionState): number {
  switch (state) {
    case 'listening':
      return -8
    case 'thinking':
      return 18
    case 'speaking':
      return 6
    case 'paused':
      return -4
    default:
      return 0
  }
}

/**
 * Living ORB Voice presence — wrapper around OrbVoiceCore.
 * Used by OrbVoiceCompanion; renders a multi-coloured intelligence core, not a human avatar.
 */
export function OrbVoiceHead({
  state = 'idle',
  className = '',
  label = 'ORB voice companion',
  size = 'hero',
  speechEnergy: speechEnergyProp,
  audioElement = null
}: {
  state?: OrbVoiceCompanionState
  className?: string
  label?: string
  size?: OrbVoiceCompanionSize | OrbVoiceCompanionLegacySize
  /** 0–1 amplitude from voice playback; CSS fallback animates when omitted or zero. */
  speechEnergy?: number
  /** Optional explicit audio element for amplitude sampling. */
  audioElement?: HTMLAudioElement | null
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

  const isSpeaking = state === 'speaking'
  const sampledEnergy = useOrbVoiceSpeechEnergy(isSpeaking, audioElement)
  const speechEnergy = speechEnergyProp ?? sampledEnergy
  const speechDriven = isSpeaking && speechEnergy > 0.04

  const visualState = companionToVisualState(state)
  const renderState: OrbVisualState = reducedMotion ? 'reduced_motion' : visualState
  const hueProfile = useMemo(() => getOrbHueProfile(renderState, reducedMotion), [renderState, reducedMotion])

  const behaviourStyle = {
    '--orb-hue-a': hueProfile.hueA,
    '--orb-hue-b': hueProfile.hueB,
    '--orb-hue-c': hueProfile.hueC,
    '--orb-warm': hueProfile.warm,
    '--orb-glow': String(hueProfile.glow),
    '--orb-motion-speed': reducedMotion ? '0.001ms' : hueProfile.motionSpeed,
    '--orb-edge-opacity': String(hueProfile.edgeOpacity),
    '--orb-voice-speech-energy': String(speechEnergy),
    '--orb-voice-core-scale': String(resolveCoreScale(state, speechEnergy)),
    '--orb-voice-core-brightness': String(resolveCoreBrightness(state, speechEnergy)),
    '--orb-voice-hue-shift': `${resolveHueShift(state)}deg`,
    '--orb-voice-aura-opacity': String(resolveAuraOpacity(state, speechEnergy))
  } as CSSProperties

  const resolvedSize = resolveOrbVoiceCompanionSize(size)
  const sizeClass =
    resolvedSize === 'mini'
      ? 'orb-voice-companion--mini'
      : resolvedSize === 'mobile-preview'
        ? 'orb-voice-companion--mobile-preview'
        : 'orb-voice-companion--hero'

  const engaged = isEngagedAttention(state)

  return (
    <div
      className={`orb-voice-companion flex shrink-0 items-center justify-center ${sizeClass} ${className}`.trim()}
      data-orb-voice-companion
      data-orb-voice-companion-size={resolvedSize}
      data-orb-voice-version={ORB_VOICE_VERSION}
      data-orb-voice-state={state}
      data-orb-voice-attention={engaged ? 'engaged' : 'idle'}
      data-orb-voice-head
      data-orb-voice-head-size={resolvedSize}
      data-orb-voice-visual-authority="OrbVoiceHead"
      data-orb-voice-behaviour="living-core-v1"
      data-orb-voice-renderer="css"
      data-orb-voice-speech-driven={speechDriven ? 'true' : 'false'}
      style={behaviourStyle}
      aria-live="polite"
      aria-label={label}
    >
      <div className="orb-voice-companion__stage" data-orb-voice-head-stage>
        <div className="orb-voice-companion__core-shell" data-orb-voice-head-shell>
          <OrbVoiceCore
            state={state}
            speechEnergy={speechEnergy}
            speechDriven={speechDriven}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>
    </div>
  )
}
