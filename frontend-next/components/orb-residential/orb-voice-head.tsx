'use client'

import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react'

import './orb-voice.css'

import { ORB_VOICE_VERSION } from '@/lib/orb/orb-visual-build'
import { getOrbHueProfile, type OrbHueProfile, type OrbVisualState } from '@/lib/orb/rendering/visual-system'

/** Visual-only voice companion states — safe fallbacks when transport state is unavailable. */
export type OrbVoiceCompanionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

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
    case 'error':
      return 'offline'
    default:
      return 'idle'
  }
}

const ORB_VOICE_HEAD_ASSET_WEBP = '/assets/orb/orb-voice-head-base.webp'
const ORB_VOICE_HEAD_ASSET_PNG = '/assets/orb/orb-voice-head-base.png'

/** Designed base head/bust asset — soft luminous 3/4 profile silhouette. */
function OrbVoiceHeadAsset({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <picture className="orb-voice-companion__head-asset-wrap" data-orb-voice-head-asset>
      <source srcSet={ORB_VOICE_HEAD_ASSET_WEBP} type="image/webp" />
      <img
        className={`orb-voice-companion__head-asset orb-voice-companion__head-material orb-voice-companion__breathe-head${reducedMotion ? '' : ''}`}
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
        <radialGradient id={`${uid}-aura`} cx="50%" cy="40%" r="58%">
          <stop offset="0%" stopColor={`rgba(56, 189, 248, ${0.34 * g})`} />
          <stop offset="42%" stopColor={`rgba(47, 125, 255, ${0.22 * g})`} />
          <stop offset="58%" stopColor={`rgba(124, 92, 255, ${0.18 * g})`} />
          <stop offset="72%" stopColor={`rgba(236, 72, 153, ${0.12 * g})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-breathe-glow`} cx="48%" cy="42%" r="52%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.28)`} />
          <stop offset="55%" stopColor={`rgba(47, 125, 255, 0.14)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-eye`} cx="50%" cy="58%" r="52%">
          <stop offset="0%" stopColor="rgba(240, 249, 255, 0.98)" />
          <stop offset="62%" stopColor={`rgba(${ha}, 0.78)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-mouth`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="16%" stopColor={`rgba(${warm}, 0.72)`} />
          <stop offset="50%" stopColor={`rgba(${ha}, 0.92)`} />
          <stop offset="84%" stopColor={`rgba(${hc}, 0.72)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        <filter id={`${uid}-halo-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Halo / aura behind silhouette */}
      <ellipse
        className="orb-voice-companion__halo-svg"
        cx="100"
        cy="108"
        rx="92"
        ry="102"
        fill={`url(#${uid}-aura)`}
        filter={`url(#${uid}-halo-blur)`}
        opacity={0.82 * g}
      />

      {/* Breathing inner glow — soft luminous wash over asset */}
      <ellipse
        className="orb-voice-companion__breathe-glow"
        data-orb-voice-breathe-bust
        cx="100"
        cy="118"
        rx="72"
        ry="88"
        fill={`url(#${uid}-breathe-glow)`}
        opacity="0.52"
      />

      {/* Listening radial waves — outward from head */}
      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__listen-waves" data-orb-voice-listening-waves aria-hidden>
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--1" cx="100" cy="108" r="76" stroke={`rgba(${ha}, 0.18)`} strokeWidth="1" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--2" cx="100" cy="108" r="76" stroke={`rgba(${hb}, 0.14)`} strokeWidth="0.8" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--3" cx="100" cy="108" r="76" stroke={`rgba(${hc}, 0.1)`} strokeWidth="0.6" fill="none" />
        </g>
      ) : null}

      {/* Listening particles */}
      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__particles" data-orb-voice-particles aria-hidden>
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--1" cx="152" cy="82" r="1.6" fill={`rgba(${ha}, 0.48)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--2" cx="160" cy="112" r="1.2" fill={`rgba(${hb}, 0.42)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--3" cx="146" cy="142" r="1.4" fill={`rgba(${hc}, 0.36)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--4" cx="48" cy="68" r="1" fill={`rgba(${ha}, 0.32)`} />
        </g>
      ) : null}

      {/* Subtle profile plane accents — silhouette comes from asset; these add light only */}
      <path
        className="orb-voice-companion__temple-warmth"
        d="M 108 28 C 124 24 142 32 152 48 C 140 40 124 34 108 28 Z"
        fill={`rgba(${hc}, 0.12)`}
        opacity="0.32"
      />
      <path
        className="orb-voice-companion__nose-bridge"
        d="M 58 48 C 56 68 54 88 56 108 C 58 86 60 66 58 48 Z"
        fill={`rgba(${ha}, 0.08)`}
        opacity="0.28"
      />
      <path
        className="orb-voice-companion__jaw-line"
        d="M 72 148 C 86 156 104 160 120 158 C 106 154 90 150 72 148 Z"
        fill={`rgba(${hb}, 0.06)`}
        opacity="0.22"
      />

      {/* Face features — positioned for 3/4 left-facing asset */}
      <g className="orb-voice-companion__face" data-orb-voice-face>
        <path
          className="orb-voice-companion__brow-bridge"
          d="M 72 58 C 66 62 62 68 64 74 C 68 70 74 66 80 64 C 76 60 74 58 72 58 Z"
          fill="rgba(255, 255, 255, 0.18)"
          opacity="0.42"
        />

        <g className="orb-voice-companion__eyes" data-orb-voice-eyes>
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--left orb-voice-companion__eye--blink"
            data-orb-voice-eye-left
            cx="76"
            cy="86"
            rx="5.2"
            ry="3"
            fill={`url(#${uid}-eye)`}
          />
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--right orb-voice-companion__eye--blink"
            data-orb-voice-eye-right
            cx="90"
            cy="84"
            rx="3.8"
            ry="2.4"
            fill={`url(#${uid}-eye)`}
            opacity="0.88"
          />
          <ellipse className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--left" cx="74.5" cy="85.2" rx="1.4" ry="0.85" fill="rgba(255, 255, 255, 0.68)" />
          <ellipse className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--right" cx="89.2" cy="83.5" rx="1" ry="0.6" fill="rgba(255, 255, 255, 0.58)" opacity="0.82" />
        </g>

        {isSpeaking ? (
          <path
            className="orb-voice-companion__mouth-wave"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="true"
            d="M 62 132 C 68 136 76 138 84 134 C 80 140 70 142 62 138 Z"
            stroke={`url(#${uid}-mouth)`}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--idle"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="false"
            d="M 64 134 C 70 136 76 136 80 134"
            stroke="rgba(186, 230, 253, 0.36)"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.22"
          />
        )}

        {isThinking ? (
          <g className="orb-voice-companion__thinking-halo" data-orb-voice-thinking-halo aria-hidden>
            <ellipse
              className="orb-voice-companion__orbit"
              data-orb-voice-orbit
              cx="100"
              cy="108"
              rx="88"
              ry="94"
              stroke={`rgba(${hb}, 0.28)`}
              strokeWidth="0.8"
              fill="none"
            />
            <ellipse
              className="orb-voice-companion__orbit orb-voice-companion__orbit--inner"
              data-orb-voice-orbit-inner
              cx="100"
              cy="108"
              rx="80"
              ry="86"
              stroke={`rgba(${ha}, 0.16)`}
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="4 8"
            />
          </g>
        ) : null}

        {isListening ? (
          <ellipse
            className="orb-voice-companion__listen-glow"
            data-orb-voice-listen-glow
            cx="100"
            cy="108"
            rx="90"
            ry="96"
            stroke={`rgba(${ha}, 0.24)`}
            strokeWidth="0.8"
            fill={`rgba(${ha}, 0.06)`}
          />
        ) : null}
      </g>

      {/* CSS-driven aura pulse overlay */}
      {pulse && !reducedMotion ? (
        <ellipse
          className="orb-voice-companion__aura-svg orb-voice-companion__aura--pulse"
          cx="100"
          cy="108"
          rx="84"
          ry="90"
          fill={`rgba(${ha}, 0.08)`}
          opacity="0.52"
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
  size = 'hero'
}: {
  state?: OrbVoiceCompanionState
  className?: string
  label?: string
  size?: OrbVoiceCompanionSize | OrbVoiceCompanionLegacySize
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
      aria-live="polite"
      aria-label={label}
    >
      <div className="orb-voice-companion__stage" data-orb-voice-head-stage>
        <div className="orb-voice-companion__halo" aria-hidden />
        <div
          className={`orb-voice-companion__aura${pulse && !reducedMotion ? ' orb-voice-companion__aura--pulse' : ''}`}
          aria-hidden
        />
        <div className="orb-voice-companion__silhouette" style={hueStyle} aria-hidden>
          <div className="orb-voice-companion__head-shell" data-orb-voice-head-shell>
            <OrbVoiceHeadAsset reducedMotion={reducedMotion} />
            <OrbVoiceHeadOverlaySvg
              uid={svgUid}
              hue={hueProfile}
              glow={hueProfile.glow}
              state={state}
              pulse={pulse}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
