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

/** 3/4 side-profile head/bust silhouette — facing slightly left. */
function OrbVoiceHeadSvg({
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

  /* 3/4 profile facing left — cranium, forehead, cheek, chin, back of skull */
  const headPath =
    'M 100 18 C 128 16 156 30 164 56 C 170 80 168 106 160 128 ' +
    'C 154 148 140 168 120 180 C 106 186 92 184 80 172 C 64 158 52 138 46 118 ' +
    'C 40 102 34 86 36 72 C 38 56 46 42 60 32 C 76 22 88 18 100 18 Z'

  const neckPath =
    'M 86 176 C 80 194 78 214 82 232 C 94 230 106 228 116 232 ' +
    'C 118 214 114 194 108 176 Z'

  const bustPath =
    'M 38 238 C 20 250 26 276 68 278 C 100 280 132 278 162 270 ' +
    'C 182 260 184 244 170 236 C 148 228 118 232 88 238 C 62 240 48 240 38 238 Z'

  const earPath =
    'M 156 104 C 166 108 172 118 170 132 C 168 144 158 152 150 146 ' +
    'C 144 134 148 116 156 104 Z'

  /* Forehead, nose bridge, cheek plane — left-facing profile */
  const facePlanePath =
    'M 58 38 C 48 56 42 78 40 100 C 38 118 40 138 48 156 ' +
    'C 36 130 34 108 36 86 C 40 64 48 48 58 38 Z'

  const cheekGlowPath = 'M 42 96 C 36 112 38 132 48 150 C 44 128 42 110 42 96 Z'

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
        <radialGradient id={`${uid}-aura`} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor={`rgba(56, 189, 248, ${0.28 * g})`} />
          <stop offset="48%" stopColor={`rgba(124, 92, 255, ${0.16 * g})`} />
          <stop offset="68%" stopColor={`rgba(236, 72, 153, ${0.1 * g})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-head-glass`} x1="18%" y1="8%" x2="82%" y2="92%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.48)" />
          <stop offset="14%" stopColor={`rgba(${ha}, 0.72)`} />
          <stop offset="38%" stopColor="#2f7dff" stopOpacity="0.88" />
          <stop offset="62%" stopColor="#1455d9" stopOpacity="0.82" />
          <stop offset="82%" stopColor={`rgba(${hb}, 0.68)`} />
          <stop offset="100%" stopColor="#071034" stopOpacity="0.78" />
        </linearGradient>

        <radialGradient id={`${uid}-head-core`} cx="38%" cy="40%" r="52%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.42)`} />
          <stop offset="55%" stopColor={`rgba(${hb}, 0.22)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-head-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.55)`} />
          <stop offset="35%" stopColor={`rgba(${hb}, 0.18)`} />
          <stop offset="65%" stopColor={`rgba(${hc}, 0.42)`} />
          <stop offset="100%" stopColor={`rgba(${warm}, 0.38)`} />
        </linearGradient>

        <linearGradient id={`${uid}-neck`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.42)`} />
          <stop offset="45%" stopColor={`rgba(${hb}, 0.28)`} />
          <stop offset="100%" stopColor="rgba(7, 16, 52, 0.38)" />
        </linearGradient>

        <radialGradient id={`${uid}-bust`} cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.32)`} />
          <stop offset="50%" stopColor={`rgba(${hb}, 0.18)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-face-plane`} cx="30%" cy="40%" r="65%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.28)" />
          <stop offset="40%" stopColor={`rgba(${ha}, 0.18)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-cheek`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`rgba(${hc}, 0.32)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-eye`} cx="50%" cy="58%" r="50%">
          <stop offset="0%" stopColor="rgba(224, 242, 254, 0.98)" />
          <stop offset="68%" stopColor={`rgba(${ha}, 0.78)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-mouth`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="18%" stopColor={`rgba(${warm}, 0.82)`} />
          <stop offset="50%" stopColor={`rgba(${ha}, 0.96)`} />
          <stop offset="82%" stopColor={`rgba(${hc}, 0.82)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        <filter id={`${uid}-soft-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${uid}-halo-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Halo / aura behind silhouette */}
      <ellipse
        className="orb-voice-companion__halo-svg"
        cx="100"
        cy="118"
        rx="88"
        ry="98"
        fill={`url(#${uid}-aura)`}
        filter={`url(#${uid}-halo-blur)`}
        opacity={0.72 * g}
      />

      {/* Shoulders / bust base */}
      <path className="orb-voice-companion__bust" d={bustPath} fill={`url(#${uid}-bust)`} opacity="0.82" />

      {/* Neck */}
      <path className="orb-voice-companion__neck" d={neckPath} fill={`url(#${uid}-neck)`} opacity="0.9" />

      {/* Main head silhouette — glass body */}
      <path
        className="orb-voice-companion__head-material"
        d={headPath}
        fill={`url(#${uid}-head-glass)`}
        filter={`url(#${uid}-soft-glow)`}
      />

      {/* Inner luminous core */}
      <path className="orb-voice-companion__head-core" d={headPath} fill={`url(#${uid}-head-core)`} opacity="0.72" />

      {/* Glass highlight layer */}
      <path
        className="orb-voice-companion__head-glass"
        d={headPath}
        fill={`url(#${uid}-face-plane)`}
        opacity="0.55"
      />

      {/* Rotating shine overlay */}
      <path
        className="orb-voice-companion__head-shine"
        d={headPath}
        fill={`url(#${uid}-head-shine)`}
        opacity="0.38"
        style={{ mixBlendMode: 'soft-light' }}
      />

      {/* Face plane highlight — forehead / nose bridge */}
      <path className="orb-voice-companion__face-plane" d={facePlanePath} fill={`url(#${uid}-face-plane)`} opacity="0.42" />

      {/* Cheek warmth */}
      <path className="orb-voice-companion__cheek-glow" d={cheekGlowPath} fill={`url(#${uid}-cheek)`} opacity="0.38" />

      {/* Ear — right side, always visible in profile */}
      <path
        className="orb-voice-companion__ear orb-voice-companion__ear--right"
        data-orb-voice-ear-right
        d={earPath}
        fill={`rgba(${ha}, 0.38)`}
        opacity="0.72"
      />
      {isListening ? (
        <path
          className="orb-voice-companion__ear orb-voice-companion__ear--left"
          data-orb-voice-ear-left
          d="M 62 108 C 56 118 54 130 58 140 C 62 148 68 144 66 132 C 64 122 64 114 62 108 Z"
          fill={`rgba(${ha}, 0.28)`}
          opacity="0.45"
        />
      ) : null}

      {/* Face features */}
      <g className="orb-voice-companion__face" data-orb-voice-face>
        <path
          className="orb-voice-companion__brow-bridge"
          d="M 52 68 C 46 72 42 78 44 84 C 48 80 54 76 60 74 C 56 70 54 68 52 68 Z"
          fill="rgba(255, 255, 255, 0.18)"
          opacity="0.48"
        />

        <g className="orb-voice-companion__eyes" data-orb-voice-eyes>
          <ellipse className="orb-voice-companion__eye orb-voice-companion__eye--left" cx="56" cy="92" rx="5.5" ry="3.2" fill={`url(#${uid}-eye)`} />
          <ellipse className="orb-voice-companion__eye orb-voice-companion__eye--right" cx="70" cy="90" rx="4" ry="2.6" fill={`url(#${uid}-eye)`} opacity="0.88" />
        </g>

        {isSpeaking ? (
          <path
            className="orb-voice-companion__mouth-wave"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="true"
            d="M 42 144 C 48 150 56 150 62 144"
            stroke={`url(#${uid}-mouth)`}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--idle"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="false"
            d="M 44 146 C 50 148 56 148 60 146"
            stroke="rgba(186, 230, 253, 0.42)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.22"
          />
        )}

        {isThinking ? (
          <ellipse
            className="orb-voice-companion__orbit"
            data-orb-voice-orbit
            cx="100"
            cy="118"
            rx="82"
            ry="88"
            stroke={`rgba(${hb}, 0.42)`}
            strokeWidth="1"
            fill="none"
          />
        ) : null}

        {isListening ? (
          <ellipse
            className="orb-voice-companion__listen-glow"
            data-orb-voice-listen-glow
            cx="100"
            cy="118"
            rx="86"
            ry="92"
            stroke={`rgba(${ha}, 0.28)`}
            strokeWidth="1"
            fill={`rgba(${ha}, 0.08)`}
          />
        ) : null}
      </g>

      {/* CSS-driven aura pulse overlay */}
      {pulse && !reducedMotion ? (
        <ellipse
          className="orb-voice-companion__aura-svg orb-voice-companion__aura--pulse"
          cx="100"
          cy="118"
          rx="80"
          ry="86"
          fill={`rgba(${ha}, 0.1)`}
          opacity="0.6"
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
            <OrbVoiceHeadSvg
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
