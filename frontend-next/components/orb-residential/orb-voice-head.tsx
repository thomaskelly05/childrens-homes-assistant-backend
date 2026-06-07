'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

import './orb-voice.css'

import { OrbVoiceAvatarRig } from '@/components/orb-residential/orb-voice-avatar-rig'
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

const ORB_VOICE_HEAD_BASE_WEBP = '/assets/orb/orb-voice-head-base.webp'
const ORB_VOICE_HEAD_BASE_PNG = '/assets/orb/orb-voice-head-base.png'

/** Static ORB head fallback when the Rive rig is unavailable or reduced motion is enabled. */
function OrbVoiceHeadFallback({
  state,
  speechDriven,
  mouthOpen
}: {
  state: OrbVoiceCompanionState
  speechDriven: boolean
  mouthOpen: number
}) {
  const isSpeaking = state === 'speaking'

  return (
    <div
      className="orb-voice-companion__head-fallback orb-voice-companion__head-motion"
      data-orb-voice-rig-fallback
      data-orb-voice-face
      data-orb-voice-head-motion
      aria-hidden
    >
      <picture className="orb-voice-companion__head-asset-wrap is-active" data-orb-voice-head-asset="base">
        <source srcSet={ORB_VOICE_HEAD_BASE_WEBP} type="image/webp" />
        <img
          className="orb-voice-companion__head-asset orb-voice-companion__head-material orb-voice-companion__breathe-head"
          data-orb-voice-breathe
          src={ORB_VOICE_HEAD_BASE_PNG}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
        />
      </picture>
      {isSpeaking ? (
        <div
          className="orb-voice-companion__mouth-light"
          data-orb-voice-mouth-light
          data-orb-voice-waveform
          data-orb-voice-waveform-active="true"
          data-orb-voice-speech-driven={speechDriven ? 'true' : 'false'}
          style={{ '--orb-voice-mouth-open': String(mouthOpen) } as CSSProperties}
          aria-hidden
        />
      ) : (
        <div
          className="orb-voice-companion__mouth-light orb-voice-companion__mouth-light--idle"
          data-orb-voice-waveform
          data-orb-voice-waveform-active="false"
          aria-hidden
        />
      )}
    </div>
  )
}

/**
 * Living ORB head/bust — wrapper for Rive avatar rig with static fallback.
 * Used by OrbVoiceCompanion; do not render legacy circular sphere mark visuals here.
 */
export function OrbVoiceHead({
  state = 'idle',
  className = '',
  label = 'ORB voice head',
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
  const [rigFailed, setRigFailed] = useState(false)
  const [rigReady, setRigReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const handleRigLoadFailed = useCallback(() => {
    setRigFailed(true)
    setRigReady(false)
  }, [])

  const handleRigLoaded = useCallback(() => {
    setRigReady(true)
    setRigFailed(false)
  }, [])

  const isSpeaking = state === 'speaking'
  const sampledEnergy = useOrbVoiceSpeechEnergy(isSpeaking, audioElement)
  const speechEnergy = speechEnergyProp ?? sampledEnergy
  const speechDriven = isSpeaking && speechEnergy > 0.04
  const mouthOpen = isSpeaking ? Math.max(0.18, Math.min(1, speechEnergy)) : 0

  const visualState = companionToVisualState(state)
  const renderState: OrbVisualState = reducedMotion ? 'reduced_motion' : visualState
  const hueProfile = useMemo(() => getOrbHueProfile(renderState, reducedMotion), [renderState, reducedMotion])
  const pulse = state === 'listening' || state === 'thinking' || state === 'speaking'

  const behaviourStyle = {
    '--orb-hue-a': hueProfile.hueA,
    '--orb-hue-b': hueProfile.hueB,
    '--orb-hue-c': hueProfile.hueC,
    '--orb-warm': hueProfile.warm,
    '--orb-glow': String(hueProfile.glow),
    '--orb-motion-speed': reducedMotion ? '0.001ms' : hueProfile.motionSpeed,
    '--orb-edge-opacity': String(hueProfile.edgeOpacity),
    '--orb-voice-speech-energy': String(speechEnergy),
    '--orb-voice-mouth-open': String(mouthOpen)
  } as CSSProperties

  const resolvedSize = resolveOrbVoiceCompanionSize(size)
  const sizeClass =
    resolvedSize === 'mini'
      ? 'orb-voice-companion--mini'
      : resolvedSize === 'mobile-preview'
        ? 'orb-voice-companion--mobile-preview'
        : 'orb-voice-companion--hero'

  const engaged = isEngagedAttention(state)
  const attemptRig = !reducedMotion && !rigFailed
  const rigVisible = attemptRig && rigReady
  const showFallback = !rigVisible

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
      data-orb-voice-behaviour="avatar-rig-v1"
      data-orb-voice-renderer={rigVisible ? 'rive' : 'fallback'}
      data-orb-voice-speech-driven={speechDriven ? 'true' : 'false'}
      style={behaviourStyle}
      aria-live="polite"
      aria-label={label}
    >
      <div className="orb-voice-companion__stage" data-orb-voice-head-stage>
        <div className="orb-voice-companion__halo" aria-hidden />
        <div
          className={`orb-voice-companion__aura${pulse && !reducedMotion ? ' orb-voice-companion__aura--pulse' : ''}`}
          aria-hidden
        />
        <div className="orb-voice-companion__silhouette" aria-hidden>
          <div className="orb-voice-companion__head-shell" data-orb-voice-head-shell>
            {attemptRig ? (
              <OrbVoiceAvatarRig
                state={state}
                speechEnergy={speechEnergy}
                mouthOpen={mouthOpen}
                engaged={engaged}
                reducedMotion={reducedMotion}
                onLoadFailed={handleRigLoadFailed}
                onLoaded={handleRigLoaded}
              />
            ) : null}
            {showFallback ? (
              <OrbVoiceHeadFallback state={state} speechDriven={speechDriven} mouthOpen={mouthOpen} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
