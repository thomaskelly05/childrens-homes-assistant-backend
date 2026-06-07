'use client'

import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react'

import './orb-voice.css'

import { ORB_VOICE_VERSION } from '@/lib/orb/orb-visual-build'
import { getOrbHueProfile, type OrbHueProfile, type OrbVisualState } from '@/lib/orb/rendering/visual-system'
import { useOrbVoiceSpeechEnergy } from '@/lib/orb/voice/use-orb-voice-speech-energy'

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

function useOrbVoiceNaturalBlink(active: boolean, reducedMotion: boolean) {
  const [blinkActive, setBlinkActive] = useState(false)

  useEffect(() => {
    if (!active || reducedMotion) {
      setBlinkActive(false)
      return
    }

    let nextTimer = 0
    let closeTimer = 0

    const scheduleBlink = () => {
      const delayMs = 5000 + Math.random() * 4000
      nextTimer = window.setTimeout(() => {
        setBlinkActive(true)
        const durationMs = 120 + Math.random() * 60
        closeTimer = window.setTimeout(() => {
          setBlinkActive(false)
          scheduleBlink()
        }, durationMs)
      }, delayMs)
    }

    scheduleBlink()

    return () => {
      window.clearTimeout(nextTimer)
      window.clearTimeout(closeTimer)
      setBlinkActive(false)
    }
  }, [active, reducedMotion])

  return blinkActive
}

const ORB_VOICE_HEAD_IDLE_WEBP = '/assets/orb/orb-voice-head-idle.webp'
const ORB_VOICE_HEAD_IDLE_PNG = '/assets/orb/orb-voice-head-idle.png'
const ORB_VOICE_HEAD_ENGAGED_WEBP = '/assets/orb/orb-voice-head-engaged.webp'
const ORB_VOICE_HEAD_ENGAGED_PNG = '/assets/orb/orb-voice-head-engaged.png'

function isEngagedAttention(state: OrbVoiceCompanionState): boolean {
  return state === 'listening' || state === 'thinking' || state === 'speaking'
}

/** Designed base head/bust assets — idle 3/4 profile and engaged attentive pose. */
function OrbVoiceHeadAsset({ engaged }: { engaged: boolean }) {
  return (
    <div className="orb-voice-companion__head-asset-stack" data-orb-voice-head-asset-stack>
      <picture
        className={`orb-voice-companion__head-asset-wrap orb-voice-companion__head-asset-wrap--idle${engaged ? '' : ' is-active'}`}
        data-orb-voice-head-asset="idle"
      >
        <source srcSet={ORB_VOICE_HEAD_IDLE_WEBP} type="image/webp" />
        <img
          className="orb-voice-companion__head-asset orb-voice-companion__head-material orb-voice-companion__breathe-head"
          data-orb-voice-breathe
          src={ORB_VOICE_HEAD_IDLE_PNG}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
        />
      </picture>
      <picture
        className={`orb-voice-companion__head-asset-wrap orb-voice-companion__head-asset-wrap--engaged${engaged ? ' is-active' : ''}`}
        data-orb-voice-head-asset="engaged"
      >
        <source srcSet={ORB_VOICE_HEAD_ENGAGED_WEBP} type="image/webp" />
        <img
          className="orb-voice-companion__head-asset orb-voice-companion__head-material orb-voice-companion__breathe-head"
          data-orb-voice-breathe
          src={ORB_VOICE_HEAD_ENGAGED_PNG}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
        />
      </picture>
    </div>
  )
}

/** SVG backdrop — faint halo, soft aura and state rings behind the designed asset only. */
function OrbVoiceHeadBackdropSvg({
  uid,
  hue,
  glow,
  state,
  pulse,
  reducedMotion
}: {
  uid: string
  hue: OrbHueProfile
  glow: number
  state: OrbVoiceCompanionState
  pulse: boolean
  reducedMotion: boolean
}) {
  const g = glow
  const ha = hue.hueA
  const hb = hue.hueB
  const hc = hue.hueC

  const isListening = state === 'listening'
  const isThinking = state === 'thinking'

  return (
    <svg
      className="orb-voice-companion__svg orb-voice-companion__svg--backdrop"
      data-orb-voice-head-backdrop
      viewBox="0 0 200 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="40%" r="58%">
          <stop offset="0%" stopColor={`rgba(56, 189, 248, ${0.2 * g})`} />
          <stop offset="42%" stopColor={`rgba(47, 125, 255, ${0.12 * g})`} />
          <stop offset="58%" stopColor={`rgba(124, 92, 255, ${0.08 * g})`} />
          <stop offset="72%" stopColor={`rgba(236, 72, 153, ${0.05 * g})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-breathe-glow`} cx="48%" cy="42%" r="52%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.12)`} />
          <stop offset="55%" stopColor={`rgba(47, 125, 255, 0.06)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <filter id={`${uid}-halo-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <ellipse
        className="orb-voice-companion__halo-svg"
        cx="100"
        cy="108"
        rx="92"
        ry="102"
        fill={`url(#${uid}-aura)`}
        filter={`url(#${uid}-halo-blur)`}
        opacity={0.34 * g}
      />

      <ellipse
        className="orb-voice-companion__breathe-glow"
        data-orb-voice-breathe-bust
        cx="100"
        cy="118"
        rx="72"
        ry="88"
        fill={`url(#${uid}-breathe-glow)`}
        opacity="0.14"
      />

      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__listen-waves" data-orb-voice-listening-waves aria-hidden>
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--1" cx="100" cy="108" r="88" stroke={`rgba(${ha}, 0.1)`} strokeWidth="0.7" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--2" cx="100" cy="108" r="88" stroke={`rgba(${hb}, 0.07)`} strokeWidth="0.5" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--3" cx="100" cy="108" r="88" stroke={`rgba(${hc}, 0.05)`} strokeWidth="0.4" fill="none" />
        </g>
      ) : null}

      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__particles" data-orb-voice-particles aria-hidden>
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--1" cx="158" cy="72" r="1" fill={`rgba(${ha}, 0.22)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--2" cx="166" cy="108" r="0.8" fill={`rgba(${hb}, 0.18)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--3" cx="152" cy="148" r="0.9" fill={`rgba(${hc}, 0.16)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--4" cx="42" cy="62" r="0.7" fill={`rgba(${ha}, 0.14)`} />
        </g>
      ) : null}

      {isThinking && !reducedMotion ? (
        <g className="orb-voice-companion__thinking-halo" data-orb-voice-thinking-halo aria-hidden>
          <ellipse
            className="orb-voice-companion__orbit"
            data-orb-voice-orbit
            cx="100"
            cy="108"
            rx="96"
            ry="102"
            stroke={`rgba(${hb}, 0.1)`}
            strokeWidth="0.5"
            fill="none"
          />
          <ellipse
            className="orb-voice-companion__orbit orb-voice-companion__orbit--inner"
            data-orb-voice-orbit-inner
            cx="100"
            cy="108"
            rx="88"
            ry="94"
            stroke={`rgba(${ha}, 0.06)`}
            strokeWidth="0.35"
            fill="none"
            strokeDasharray="4 12"
          />
        </g>
      ) : null}

      {isListening ? (
        <ellipse
          className="orb-voice-companion__listen-glow"
          data-orb-voice-listen-glow
          cx="100"
          cy="108"
          rx="98"
          ry="104"
          stroke={`rgba(${ha}, 0.08)`}
          strokeWidth="0.5"
          fill="none"
        />
      ) : null}

      {pulse && !reducedMotion ? (
        <ellipse
          className="orb-voice-companion__aura-svg orb-voice-companion__aura--pulse"
          cx="100"
          cy="108"
          rx="90"
          ry="96"
          fill={`rgba(${ha}, 0.04)`}
          opacity="0.14"
        />
      ) : null}
    </svg>
  )
}

type OrbVoiceFacePose = {
  nearEye: { cx: number; cy: number; rx: number; ry: number; rotate: number }
  farEye: { cx: number; cy: number; rx: number; ry: number; rotate: number; opacity: number }
  nearShimmer: { cx: number; cy: number; rx: number; ry: number }
  farShimmer: { cx: number; cy: number; rx: number; ry: number; opacity: number }
  mouthIdle: string
  mouthSpeaking: string
  brow: string
  nose: string
  jaw: string
  temple: string
}

const ORB_VOICE_FACE_IDLE: OrbVoiceFacePose = {
  nearEye: { cx: 58, cy: 100, rx: 5.8, ry: 3.3, rotate: -7 },
  farEye: { cx: 72, cy: 97.5, rx: 3.4, ry: 2.2, rotate: -4, opacity: 0.58 },
  nearShimmer: { cx: 56.5, cy: 99.2, rx: 1.5, ry: 0.9 },
  farShimmer: { cx: 71.2, cy: 96.8, rx: 0.95, ry: 0.58, opacity: 0.62 },
  mouthIdle: 'M 54 128 C 60 130 68 130 74 128',
  mouthSpeaking: 'M 52 126 C 60 130 70 132 78 128 C 72 136 60 136 52 130 Z',
  brow: 'M 48 72 C 44 76 42 82 44 88 C 50 84 56 80 62 78 C 58 74 54 72 48 72 Z',
  nose: 'M 50 62 C 48 80 46 98 48 114 C 50 94 52 76 50 62 Z',
  jaw: 'M 54 152 C 68 158 86 160 102 156 C 88 152 72 150 54 152 Z',
  temple: 'M 96 34 C 112 30 128 38 136 52 C 124 44 110 38 96 34 Z'
}

const ORB_VOICE_FACE_ENGAGED: OrbVoiceFacePose = {
  nearEye: { cx: 70, cy: 101, rx: 5.4, ry: 3.1, rotate: -2 },
  farEye: { cx: 86, cy: 100, rx: 4.2, ry: 2.7, rotate: 2, opacity: 0.76 },
  nearShimmer: { cx: 68.5, cy: 100.2, rx: 1.4, ry: 0.85 },
  farShimmer: { cx: 85.2, cy: 99.4, rx: 1.1, ry: 0.68, opacity: 0.74 },
  mouthIdle: 'M 64 130 C 72 132 80 132 88 130',
  mouthSpeaking: 'M 62 128 C 72 132 84 134 92 130 C 86 138 72 138 62 132 Z',
  brow: 'M 58 74 C 54 78 52 84 54 90 C 62 86 70 82 78 80 C 74 76 68 74 58 74 Z',
  nose: 'M 72 64 C 70 82 68 100 70 116 C 72 96 74 78 72 64 Z',
  jaw: 'M 62 154 C 78 160 98 162 114 158 C 100 154 82 152 62 154 Z',
  temple: 'M 108 32 C 124 28 140 36 148 50 C 136 42 122 36 108 32 Z'
}

/** SVG face overlay — eyes, mouth and tiny highlights aligned to the face plane. */
function OrbVoiceHeadFaceSvg({
  uid,
  hue,
  state,
  blinkActive,
  engaged
}: {
  uid: string
  hue: OrbHueProfile
  state: OrbVoiceCompanionState
  blinkActive: boolean
  engaged: boolean
}) {
  const ha = hue.hueA
  const hb = hue.hueB
  const hc = hue.hueC
  const warm = hue.warm

  const isSpeaking = state === 'speaking'
  const pose = engaged ? ORB_VOICE_FACE_ENGAGED : ORB_VOICE_FACE_IDLE

  return (
    <svg
      className="orb-voice-companion__svg orb-voice-companion__svg--face"
      data-orb-voice-head-face-overlay
      viewBox="0 0 200 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-eye-near`} cx="46%" cy="62%" r="54%">
          <stop offset="0%" stopColor="rgba(240, 249, 255, 0.98)" />
          <stop offset="58%" stopColor={`rgba(${ha}, 0.82)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-eye-far`} cx="54%" cy="60%" r="50%">
          <stop offset="0%" stopColor="rgba(240, 249, 255, 0.88)" />
          <stop offset="64%" stopColor={`rgba(${ha}, 0.62)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-mouth`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="16%" stopColor={`rgba(${warm}, 0.72)`} />
          <stop offset="50%" stopColor={`rgba(${ha}, 0.92)`} />
          <stop offset="84%" stopColor={`rgba(${hc}, 0.72)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      <g
        className="orb-voice-companion__face"
        data-orb-voice-face
        data-orb-voice-face-pose={engaged ? 'engaged' : 'idle'}
      >
        <path className="orb-voice-companion__temple-warmth" d={pose.temple} fill={`rgba(${hc}, 0.12)`} opacity="0.28" />
        <path className="orb-voice-companion__nose-bridge" d={pose.nose} fill={`rgba(${ha}, 0.08)`} opacity="0.22" />
        <path className="orb-voice-companion__jaw-line" d={pose.jaw} fill={`rgba(${hb}, 0.06)`} opacity="0.18" />
        <path className="orb-voice-companion__brow-bridge" d={pose.brow} fill="rgba(255, 255, 255, 0.18)" opacity="0.36" />

        <g
          className="orb-voice-companion__eyes"
          data-orb-voice-eyes
          data-orb-voice-blink-active={blinkActive ? 'true' : 'false'}
        >
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--near orb-voice-companion__eye--blink"
            data-orb-voice-eye-left
            cx={pose.nearEye.cx}
            cy={pose.nearEye.cy}
            rx={pose.nearEye.rx}
            ry={pose.nearEye.ry}
            transform={`rotate(${pose.nearEye.rotate} ${pose.nearEye.cx} ${pose.nearEye.cy})`}
            fill={`url(#${uid}-eye-near)`}
          />
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--far orb-voice-companion__eye--blink"
            data-orb-voice-eye-right
            cx={pose.farEye.cx}
            cy={pose.farEye.cy}
            rx={pose.farEye.rx}
            ry={pose.farEye.ry}
            transform={`rotate(${pose.farEye.rotate} ${pose.farEye.cx} ${pose.farEye.cy})`}
            fill={`url(#${uid}-eye-far)`}
            opacity={pose.farEye.opacity}
          />
          <ellipse
            className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--near"
            cx={pose.nearShimmer.cx}
            cy={pose.nearShimmer.cy}
            rx={pose.nearShimmer.rx}
            ry={pose.nearShimmer.ry}
            fill="rgba(255, 255, 255, 0.68)"
          />
          <ellipse
            className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--far"
            cx={pose.farShimmer.cx}
            cy={pose.farShimmer.cy}
            rx={pose.farShimmer.rx}
            ry={pose.farShimmer.ry}
            fill="rgba(255, 255, 255, 0.58)"
            opacity={pose.farShimmer.opacity}
          />
        </g>

        {isSpeaking ? (
          <g className="orb-voice-companion__mouth-light" data-orb-voice-mouth-light aria-hidden>
            <path
              className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--speaking"
              data-orb-voice-waveform
              data-orb-voice-waveform-active="true"
              d={pose.mouthSpeaking}
              stroke={`url(#${uid}-mouth)`}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        ) : (
          <path
            className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--idle"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="false"
            d={pose.mouthIdle}
            stroke="rgba(186, 230, 253, 0.36)"
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            opacity="0.2"
          />
        )}
      </g>
    </svg>
  )
}

/**
 * Living ORB head/bust — the only visual authority for Voice presence.
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
  const svgUid = useId().replace(/:/g, '')

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
  const mouthOpen = isSpeaking ? Math.max(0.18, Math.min(1, speechEnergy)) : 0

  const blinkEligible = state === 'idle' || state === 'listening' || state === 'thinking' || state === 'paused'
  const blinkActive = useOrbVoiceNaturalBlink(blinkEligible, reducedMotion)

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
      data-orb-voice-behaviour="living-presence-v10"
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
          <div
            className="orb-voice-companion__head-motion"
            data-orb-voice-head-motion
          >
            <div className="orb-voice-companion__head-shell" data-orb-voice-head-shell>
              <OrbVoiceHeadBackdropSvg
                uid={svgUid}
                hue={hueProfile}
                glow={hueProfile.glow}
                state={state}
                pulse={pulse}
                reducedMotion={reducedMotion}
              />
              <OrbVoiceHeadAsset engaged={engaged} />
              <OrbVoiceHeadFaceSvg
                uid={svgUid}
                hue={hueProfile}
                state={state}
                blinkActive={blinkActive}
                engaged={engaged}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
