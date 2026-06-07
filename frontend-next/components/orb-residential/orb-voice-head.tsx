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

const ORB_VOICE_HEAD_ASSET_WEBP = '/assets/orb/orb-voice-head-base.webp'
const ORB_VOICE_HEAD_ASSET_PNG = '/assets/orb/orb-voice-head-base.png'

/** Designed base head/bust asset — soft luminous 3/4 profile silhouette. */
function OrbVoiceHeadAsset({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <picture className="orb-voice-companion__head-asset-wrap" data-orb-voice-head-asset>
      <source srcSet={ORB_VOICE_HEAD_ASSET_WEBP} type="image/webp" />
      <img
        className="orb-voice-companion__head-asset orb-voice-companion__head-material orb-voice-companion__breathe-head"
        data-orb-voice-breathe
        src={ORB_VOICE_HEAD_ASSET_PNG}
        alt=""
        aria-hidden
        draggable={false}
        decoding="async"
      />
    </picture>
  )
}

/** SVG overlay — aura, eyes, state motion; base silhouette comes from the designed asset. */
function OrbVoiceHeadOverlaySvg({
  uid,
  hue,
  glow,
  state,
  pulse,
  reducedMotion,
  blinkActive
}: {
  uid: string
  hue: OrbHueProfile
  glow: number
  state: OrbVoiceCompanionState
  pulse: boolean
  reducedMotion: boolean
  blinkActive: boolean
}) {
  const g = glow
  const ha = hue.hueA
  const hb = hue.hueB
  const hc = hue.hueC
  const warm = hue.warm

  const isSpeaking = state === 'speaking'
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'

  return (
    <svg
      className="orb-voice-companion__svg"
      viewBox="0 0 200 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor={`rgba(186, 230, 253, ${0.28 * g})`} />
          <stop offset="38%" stopColor={`rgba(56, 189, 248, ${0.22 * g})`} />
          <stop offset="54%" stopColor={`rgba(124, 92, 255, ${0.16 * g})`} />
          <stop offset="68%" stopColor={`rgba(236, 72, 153, ${0.1 * g})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-breathe-glow`} cx="46%" cy="40%" r="56%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.22)`} />
          <stop offset="48%" stopColor={`rgba(196, 181, 253, 0.12)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-eye`} cx="50%" cy="58%" r="58%">
          <stop offset="0%" stopColor="rgba(240, 249, 255, 0.88)" />
          <stop offset="58%" stopColor={`rgba(${ha}, 0.52)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-mouth`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="16%" stopColor={`rgba(${warm}, 0.72)`} />
          <stop offset="50%" stopColor={`rgba(${ha}, 0.92)`} />
          <stop offset="84%" stopColor={`rgba(${hc}, 0.72)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        <filter id={`${uid}-mouth-glow`} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>

        <filter id={`${uid}-halo-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {/* Halo / aura behind silhouette */}
      <ellipse
        className="orb-voice-companion__halo-svg"
        cx="100"
        cy="106"
        rx="98"
        ry="106"
        fill={`url(#${uid}-aura)`}
        filter={`url(#${uid}-halo-blur)`}
        opacity={0.74 * g}
      />

      {/* Breathing inner glow — soft luminous wash over asset */}
      <ellipse
        className="orb-voice-companion__breathe-glow"
        data-orb-voice-breathe-bust
        cx="100"
        cy="116"
        rx="78"
        ry="92"
        fill={`url(#${uid}-breathe-glow)`}
        opacity="0.44"
      />

      {/* Listening radial waves — outward from head */}
      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__listen-waves" data-orb-voice-listening-waves aria-hidden>
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--1" cx="100" cy="106" r="80" stroke={`rgba(${ha}, 0.12)`} strokeWidth="0.8" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--2" cx="100" cy="106" r="80" stroke={`rgba(${hb}, 0.09)`} strokeWidth="0.6" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--3" cx="100" cy="106" r="80" stroke={`rgba(${hc}, 0.07)`} strokeWidth="0.5" fill="none" />
        </g>
      ) : null}

      {/* Listening particles */}
      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__particles" data-orb-voice-particles aria-hidden>
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--1" cx="154" cy="80" r="1.2" fill={`rgba(${ha}, 0.32)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--2" cx="162" cy="110" r="0.9" fill={`rgba(${hb}, 0.28)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--3" cx="148" cy="140" r="1" fill={`rgba(${hc}, 0.24)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--4" cx="46" cy="66" r="0.7" fill={`rgba(${ha}, 0.22)`} />
        </g>
      ) : null}

      {/* Soft light planes — silhouette from asset; suggested face via glow only */}
      <path
        className="orb-voice-companion__temple-warmth"
        d="M 112 24 C 132 20 152 30 162 48 C 148 38 130 30 112 24 Z"
        fill={`rgba(${hc}, 0.08)`}
        opacity="0.2"
      />
      <path
        className="orb-voice-companion__nose-bridge"
        d="M 54 52 C 52 78 54 104 58 124 C 56 96 56 72 54 52 Z"
        fill={`rgba(${ha}, 0.05)`}
        opacity="0.14"
      />
      <path
        className="orb-voice-companion__jaw-line"
        d="M 68 152 C 88 158 108 160 124 156 C 106 152 88 148 68 152 Z"
        fill={`rgba(${hb}, 0.04)`}
        opacity="0.1"
      />

      {/* Face — gentle eye glow only; no drawn anatomy */}
      <g className="orb-voice-companion__face" data-orb-voice-face>
        <path
          className="orb-voice-companion__brow-bridge"
          d="M 70 62 C 66 66 64 72 66 76 C 70 72 76 68 82 66 C 78 62 74 60 70 62 Z"
          fill="rgba(255, 255, 255, 0.1)"
          opacity="0.18"
        />

        <g
          className="orb-voice-companion__eyes"
          data-orb-voice-eyes
          data-orb-voice-blink-active={blinkActive ? 'true' : 'false'}
        >
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--left orb-voice-companion__eye--blink"
            data-orb-voice-eye-left
            cx="74"
            cy="88"
            rx="4.2"
            ry="2.4"
            fill={`url(#${uid}-eye)`}
          />
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--right orb-voice-companion__eye--blink"
            data-orb-voice-eye-right
            cx="86"
            cy="86"
            rx="3"
            ry="1.9"
            fill={`url(#${uid}-eye)`}
            opacity="0.72"
          />
          <ellipse className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--left" cx="72.8" cy="87.4" rx="1" ry="0.55" fill="rgba(255, 255, 255, 0.48)" />
          <ellipse className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--right" cx="85.4" cy="85.6" rx="0.7" ry="0.42" fill="rgba(255, 255, 255, 0.38)" opacity="0.68" />
        </g>

        {isSpeaking ? (
          <g className="orb-voice-companion__mouth-light" data-orb-voice-mouth-light aria-hidden>
            <path
              className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--speaking"
              data-orb-voice-waveform
              data-orb-voice-waveform-active="true"
              d="M 58 134 C 64 136 72 138 80 134 C 86 130 90 134 84 136"
              stroke={`url(#${uid}-mouth)`}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              filter={`url(#${uid}-mouth-glow)`}
            />
          </g>
        ) : (
          <path
            className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--idle"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="false"
            d="M 62 136 C 68 137 74 137 78 136"
            stroke="rgba(186, 230, 253, 0.28)"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
            opacity="0.14"
          />
        )}

        {isThinking ? (
          <g className="orb-voice-companion__thinking-halo" data-orb-voice-thinking-halo aria-hidden>
            <ellipse
              className="orb-voice-companion__orbit"
              data-orb-voice-orbit
              cx="100"
              cy="106"
              rx="92"
              ry="98"
              stroke={`rgba(${hb}, 0.18)`}
              strokeWidth="0.6"
              fill="none"
            />
            <ellipse
              className="orb-voice-companion__orbit orb-voice-companion__orbit--inner"
              data-orb-voice-orbit-inner
              cx="100"
              cy="106"
              rx="84"
              ry="90"
              stroke={`rgba(${ha}, 0.1)`}
              strokeWidth="0.4"
              fill="none"
              strokeDasharray="4 10"
            />
          </g>
        ) : null}

        {isListening ? (
          <ellipse
            className="orb-voice-companion__listen-glow"
            data-orb-voice-listen-glow
            cx="100"
            cy="106"
            rx="94"
            ry="100"
            stroke={`rgba(${ha}, 0.16)`}
            strokeWidth="0.6"
            fill={`rgba(${ha}, 0.04)`}
          />
        ) : null}
      </g>

      {/* CSS-driven aura pulse overlay */}
      {pulse && !reducedMotion ? (
        <ellipse
          className="orb-voice-companion__aura-svg orb-voice-companion__aura--pulse"
          cx="100"
          cy="106"
          rx="90"
          ry="96"
          fill={`rgba(${ha}, 0.06)`}
          opacity="0.38"
        />
      ) : null}
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

  return (
    <div
      className={`orb-voice-companion flex shrink-0 items-center justify-center ${sizeClass} ${className}`.trim()}
      data-orb-voice-companion
      data-orb-voice-companion-size={resolvedSize}
      data-orb-voice-version={ORB_VOICE_VERSION}
      data-orb-voice-state={state}
      data-orb-voice-head
      data-orb-voice-head-size={resolvedSize}
      data-orb-voice-visual-authority="OrbVoiceHead"
      data-orb-voice-behaviour="living-presence-v9"
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
              <OrbVoiceHeadAsset reducedMotion={reducedMotion} />
              <OrbVoiceHeadOverlaySvg
                uid={svgUid}
                hue={hueProfile}
                glow={hueProfile.glow}
                state={state}
                pulse={pulse}
                reducedMotion={reducedMotion}
                blinkActive={blinkActive}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
