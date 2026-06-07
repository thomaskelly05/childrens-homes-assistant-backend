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

  /* 3/4 profile facing left — cranium, forehead, nose bridge, cheek, chin, jaw */
  const headPath =
    'M 96 14 C 124 12 158 26 168 54 C 176 82 174 112 164 136 ' +
    'C 154 158 134 176 110 184 C 94 188 76 182 64 168 C 50 152 40 130 36 108 ' +
    'C 32 88 34 66 42 48 C 52 30 72 16 96 14 Z'

  const neckPath =
    'M 78 178 C 72 198 70 218 74 236 C 88 234 102 232 114 236 ' +
    'C 116 216 112 196 106 178 Z'

  const bustPath =
    'M 32 242 C 14 254 18 278 62 280 C 98 282 136 278 168 268 ' +
    'C 186 256 188 240 172 232 C 148 224 118 228 88 234 C 58 238 42 240 32 242 Z'

  const earPath =
    'M 158 98 C 170 102 176 114 174 130 C 172 144 162 152 152 146 ' +
    'C 146 132 150 112 158 98 Z'

  /* Forehead, nose bridge, cheek plane — left-facing profile */
  const facePlanePath =
    'M 54 32 C 44 50 38 74 36 98 C 34 118 36 140 44 160 ' +
    'C 32 132 30 108 32 84 C 36 60 44 44 54 32 Z'

  const foreheadHighlightPath =
    'M 56 28 C 48 38 42 52 40 68 C 46 54 52 42 62 34 C 60 30 58 28 56 28 Z'

  const cheekGlowPath = 'M 40 94 C 34 110 36 132 46 152 C 42 128 40 108 40 94 Z'

  const jawLinePath =
    'M 64 168 C 78 176 96 180 110 184 C 98 178 82 172 64 168 Z'

  const noseBridgePath = 'M 38 52 C 36 72 34 94 36 114 C 38 92 40 70 38 52 Z'

  const chinLinePath = 'M 36 108 C 38 128 44 148 56 164 C 48 148 40 128 36 108 Z'

  const templeWarmthPath =
    'M 72 36 C 88 32 108 38 120 52 C 108 44 92 40 72 36 Z'

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
          <stop offset="0%" stopColor={`rgba(56, 189, 248, ${0.3 * g})`} />
          <stop offset="42%" stopColor={`rgba(47, 125, 255, ${0.2 * g})`} />
          <stop offset="58%" stopColor={`rgba(124, 92, 255, ${0.16 * g})`} />
          <stop offset="72%" stopColor={`rgba(236, 72, 153, ${0.1 * g})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-head-glass`} x1="16%" y1="6%" x2="84%" y2="94%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.52)" />
          <stop offset="12%" stopColor={`rgba(${ha}, 0.78)`} />
          <stop offset="32%" stopColor="#38bdf8" stopOpacity="0.82" />
          <stop offset="48%" stopColor="#2f7dff" stopOpacity="0.9" />
          <stop offset="64%" stopColor="#1455d9" stopOpacity="0.84" />
          <stop offset="78%" stopColor={`rgba(${hb}, 0.72)`} />
          <stop offset="92%" stopColor="#3b1a78" stopOpacity="0.68" />
          <stop offset="100%" stopColor="#071034" stopOpacity="0.8" />
        </linearGradient>

        <radialGradient id={`${uid}-head-core`} cx="36%" cy="38%" r="54%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.48)`} />
          <stop offset="40%" stopColor={`rgba(47, 125, 255, 0.28)`} />
          <stop offset="68%" stopColor={`rgba(${hb}, 0.22)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-temple-warmth`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={`rgba(${hc}, 0.38)`} />
          <stop offset="55%" stopColor={`rgba(${warm}, 0.22)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-head-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.58)`} />
          <stop offset="30%" stopColor={`rgba(${hb}, 0.2)`} />
          <stop offset="62%" stopColor={`rgba(${hc}, 0.44)`} />
          <stop offset="100%" stopColor={`rgba(${warm}, 0.4)`} />
        </linearGradient>

        <linearGradient id={`${uid}-neck`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.46)`} />
          <stop offset="40%" stopColor={`rgba(47, 125, 255, 0.32)`} />
          <stop offset="72%" stopColor={`rgba(${hb}, 0.26)`} />
          <stop offset="100%" stopColor="rgba(7, 16, 52, 0.42)" />
        </linearGradient>

        <radialGradient id={`${uid}-bust`} cx="50%" cy="0%" r="92%">
          <stop offset="0%" stopColor={`rgba(${ha}, 0.34)`} />
          <stop offset="45%" stopColor={`rgba(47, 125, 255, 0.2)`} />
          <stop offset="72%" stopColor={`rgba(${hb}, 0.16)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-face-plane`} cx="28%" cy="38%" r="68%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.34)" />
          <stop offset="35%" stopColor={`rgba(${ha}, 0.22)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-forehead-spec`} cx="40%" cy="30%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.42)" />
          <stop offset="60%" stopColor={`rgba(${ha}, 0.14)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-cheek`} cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor={`rgba(${hc}, 0.36)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <radialGradient id={`${uid}-eye`} cx="50%" cy="58%" r="52%">
          <stop offset="0%" stopColor="rgba(224, 242, 254, 0.98)" />
          <stop offset="62%" stopColor={`rgba(${ha}, 0.82)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <linearGradient id={`${uid}-mouth`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="16%" stopColor={`rgba(${warm}, 0.84)`} />
          <stop offset="50%" stopColor={`rgba(${ha}, 0.98)`} />
          <stop offset="84%" stopColor={`rgba(${hc}, 0.84)`} />
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

        <filter id={`${uid}-inner-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo / aura behind silhouette */}
      <ellipse
        className="orb-voice-companion__halo-svg"
        cx="100"
        cy="116"
        rx="90"
        ry="100"
        fill={`url(#${uid}-aura)`}
        filter={`url(#${uid}-halo-blur)`}
        opacity={0.74 * g}
      />

      {/* Listening radial waves — outward from head */}
      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__listen-waves" data-orb-voice-listening-waves aria-hidden>
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--1" cx="100" cy="116" r="72" stroke={`rgba(${ha}, 0.22)`} strokeWidth="1" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--2" cx="100" cy="116" r="72" stroke={`rgba(${hb}, 0.16)`} strokeWidth="0.8" fill="none" />
          <circle className="orb-voice-companion__listen-wave orb-voice-companion__listen-wave--3" cx="100" cy="116" r="72" stroke={`rgba(${hc}, 0.12)`} strokeWidth="0.6" fill="none" />
        </g>
      ) : null}

      {/* Listening particles */}
      {isListening && !reducedMotion ? (
        <g className="orb-voice-companion__particles" data-orb-voice-particles aria-hidden>
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--1" cx="148" cy="88" r="1.8" fill={`rgba(${ha}, 0.55)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--2" cx="156" cy="118" r="1.4" fill={`rgba(${hb}, 0.48)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--3" cx="142" cy="148" r="1.6" fill={`rgba(${hc}, 0.42)`} />
          <circle className="orb-voice-companion__particle orb-voice-companion__particle--4" cx="52" cy="72" r="1.2" fill={`rgba(${ha}, 0.38)`} />
        </g>
      ) : null}

      {/* Shoulders / bust base — breathes with chest expansion */}
      <path
        className="orb-voice-companion__bust orb-voice-companion__breathe-bust"
        data-orb-voice-breathe-bust
        d={bustPath}
        fill={`url(#${uid}-bust)`}
        opacity="0.84"
      />

      {/* Neck */}
      <path className="orb-voice-companion__neck orb-voice-companion__breathe-neck" d={neckPath} fill={`url(#${uid}-neck)`} opacity="0.92" />

      {/* Main head silhouette — glass body */}
      <path
        className="orb-voice-companion__head-material orb-voice-companion__breathe-head"
        data-orb-voice-breathe
        d={headPath}
        fill={`url(#${uid}-head-glass)`}
        filter={`url(#${uid}-soft-glow)`}
      />

      {/* Inner luminous core */}
      <path className="orb-voice-companion__head-core" d={headPath} fill={`url(#${uid}-head-core)`} opacity="0.74" />

      {/* Temple warmth — pink-magenta inner glow */}
      <path className="orb-voice-companion__temple-warmth" d={templeWarmthPath} fill={`url(#${uid}-temple-warmth)`} opacity="0.48" />

      {/* Glass highlight layer */}
      <path
        className="orb-voice-companion__head-glass"
        d={headPath}
        fill={`url(#${uid}-face-plane)`}
        opacity="0.56"
      />

      {/* Rotating shine overlay */}
      <path
        className="orb-voice-companion__head-shine"
        d={headPath}
        fill={`url(#${uid}-head-shine)`}
        opacity="0.4"
        style={{ mixBlendMode: 'soft-light' }}
      />

      {/* Forehead specular highlight */}
      <path className="orb-voice-companion__forehead-spec" d={foreheadHighlightPath} fill={`url(#${uid}-forehead-spec)`} opacity="0.52" />

      {/* Face plane highlight — forehead / nose bridge */}
      <path className="orb-voice-companion__face-plane" d={facePlanePath} fill={`url(#${uid}-face-plane)`} opacity="0.44" />

      {/* Nose bridge definition */}
      <path className="orb-voice-companion__nose-bridge" d={noseBridgePath} fill={`rgba(${ha}, 0.14)`} opacity="0.38" />

      {/* Cheek warmth */}
      <path className="orb-voice-companion__cheek-glow" d={cheekGlowPath} fill={`url(#${uid}-cheek)`} opacity="0.4" />

      {/* Jaw line shadow */}
      <path className="orb-voice-companion__jaw-line" d={jawLinePath} fill={`rgba(${hb}, 0.12)`} opacity="0.32" />

      {/* Chin / lip line */}
      <path
        className="orb-voice-companion__chin-line"
        d={chinLinePath}
        fill="none"
        stroke={`rgba(${warm}, 0.28)`}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.36"
      />

      {/* Ear — right side, visible in profile */}
      <path
        className="orb-voice-companion__ear orb-voice-companion__ear--right"
        data-orb-voice-ear-right
        d={earPath}
        fill={`rgba(${ha}, 0.4)`}
        opacity="0.74"
      />
      {isListening ? (
        <path
          className="orb-voice-companion__ear orb-voice-companion__ear--left"
          data-orb-voice-ear-left
          d="M 60 104 C 54 114 52 126 56 138 C 60 146 66 142 64 130 C 62 120 62 112 60 104 Z"
          fill={`rgba(${ha}, 0.3)`}
          opacity="0.48"
        />
      ) : null}

      {/* Face features */}
      <g className="orb-voice-companion__face" data-orb-voice-face>
        <path
          className="orb-voice-companion__brow-bridge"
          d="M 50 64 C 44 68 40 74 42 80 C 46 76 52 72 58 70 C 54 66 52 64 50 64 Z"
          fill="rgba(255, 255, 255, 0.2)"
          opacity="0.5"
        />

        <g className="orb-voice-companion__eyes" data-orb-voice-eyes>
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--left orb-voice-companion__eye--blink"
            data-orb-voice-eye-left
            cx="54"
            cy="90"
            rx="5.8"
            ry="3.4"
            fill={`url(#${uid}-eye)`}
          />
          <ellipse
            className="orb-voice-companion__eye orb-voice-companion__eye--right orb-voice-companion__eye--blink"
            data-orb-voice-eye-right
            cx="68"
            cy="88"
            rx="4.2"
            ry="2.8"
            fill={`url(#${uid}-eye)`}
            opacity="0.9"
          />
          {/* Eye shimmer highlights */}
          <ellipse className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--left" cx="52" cy="89" rx="1.6" ry="1" fill="rgba(255, 255, 255, 0.72)" />
          <ellipse className="orb-voice-companion__eye-shimmer orb-voice-companion__eye-shimmer--right" cx="67" cy="87.5" rx="1.2" ry="0.7" fill="rgba(255, 255, 255, 0.62)" opacity="0.88" />
        </g>

        {isSpeaking ? (
          <path
            className="orb-voice-companion__mouth-wave"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="true"
            d="M 40 142 C 46 148 54 150 62 144 C 58 152 48 154 40 148 Z"
            stroke={`url(#${uid}-mouth)`}
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            className="orb-voice-companion__mouth-wave orb-voice-companion__mouth-wave--idle"
            data-orb-voice-waveform
            data-orb-voice-waveform-active="false"
            d="M 42 144 C 48 146 54 146 58 144"
            stroke="rgba(186, 230, 253, 0.4)"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.24"
          />
        )}

        {isThinking ? (
          <g className="orb-voice-companion__thinking-halo" data-orb-voice-thinking-halo aria-hidden>
            <ellipse
              className="orb-voice-companion__orbit"
              data-orb-voice-orbit
              cx="100"
              cy="116"
              rx="84"
              ry="90"
              stroke={`rgba(${hb}, 0.38)`}
              strokeWidth="1"
              fill="none"
            />
            <ellipse
              className="orb-voice-companion__orbit orb-voice-companion__orbit--inner"
              data-orb-voice-orbit-inner
              cx="100"
              cy="116"
              rx="76"
              ry="82"
              stroke={`rgba(${ha}, 0.22)`}
              strokeWidth="0.6"
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
            cy="116"
            rx="88"
            ry="94"
            stroke={`rgba(${ha}, 0.32)`}
            strokeWidth="1"
            fill={`rgba(${ha}, 0.1)`}
          />
        ) : null}
      </g>

      {/* CSS-driven aura pulse overlay */}
      {pulse && !reducedMotion ? (
        <ellipse
          className="orb-voice-companion__aura-svg orb-voice-companion__aura--pulse"
          cx="100"
          cy="116"
          rx="82"
          ry="88"
          fill={`rgba(${ha}, 0.1)`}
          opacity="0.62"
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
