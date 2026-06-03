'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { OrbSphere, type OrbRenderState } from '@/components/orb-core/orb-sphere'
import { getOrbHueProfile } from '@/lib/orb/rendering/visual-system'

/** Canonical ORB Residential presence states — map to `OrbSphere` render states. */
export type OrbPresenceState = 'idle' | 'listening' | 'thinking' | 'responding' | 'error'

export type OrbPresenceSize =
  | 'tiny'
  | 'xs'
  | 'sm'
  | 'md'
  | 'empty'
  | 'home'
  | 'dictate'
  | 'voice'
  | 'voiceMobile'
  | 'lg'
  | 'hero'

const PRESENCE_TO_RENDER: Record<OrbPresenceState, OrbRenderState> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  responding: 'speaking',
  error: 'offline'
}

const SIZE_TO_SPHERE: Record<OrbPresenceSize, 'small' | 'medium' | 'large' | 'xlarge'> = {
  tiny: 'small',
  xs: 'small',
  sm: 'small',
  md: 'medium',
  empty: 'large',
  home: 'large',
  dictate: 'xlarge',
  voice: 'xlarge',
  voiceMobile: 'xlarge',
  lg: 'medium',
  hero: 'xlarge'
}

const SIZE_CLASS: Record<OrbPresenceSize, string> = {
  tiny: 'orb-presence--tiny',
  xs: 'orb-presence--xs',
  sm: 'orb-presence--sm',
  md: 'orb-presence--md',
  empty: 'orb-presence--empty',
  home: 'orb-presence--home',
  dictate: 'orb-presence--dictate',
  voice: 'orb-presence--voice',
  voiceMobile: 'orb-presence--voice-mobile',
  lg: 'orb-presence--lg',
  hero: 'orb-presence--hero'
}

/** Infer presence state from legacy `glass-orb-mark--*` modifier classes. */
export function orbPresenceStateFromClassName(className: string): OrbPresenceState | undefined {
  if (className.includes('glass-orb-mark--listening')) return 'listening'
  if (className.includes('glass-orb-mark--thinking')) return 'thinking'
  if (className.includes('glass-orb-mark--speaking')) return 'responding'
  if (className.includes('glass-orb-mark--error')) return 'error'
  if (className.includes('glass-orb-mark--idle')) return 'idle'
  return undefined
}

export function OrbPresence({
  state = 'idle',
  size = 'md',
  pulse = false,
  className = '',
  label
}: {
  state?: OrbPresenceState
  size?: OrbPresenceSize
  pulse?: boolean
  className?: string
  label?: string
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

  const renderState = reducedMotion ? 'reduced_motion' : PRESENCE_TO_RENDER[state]
  const sphereSize = SIZE_TO_SPHERE[size]
  const hueProfile = useMemo(() => getOrbHueProfile(renderState, reducedMotion), [renderState, reducedMotion])

  const hueStyle = {
    '--orb-hue-a': hueProfile.hueA,
    '--orb-hue-b': hueProfile.hueB,
    '--orb-hue-c': hueProfile.hueC,
    '--orb-warm': hueProfile.warm,
    '--orb-glow': String(hueProfile.glow),
    '--orb-motion-speed': reducedMotion ? '0.001ms' : hueProfile.motionSpeed,
    '--orb-edge-opacity': String(hueProfile.edgeOpacity)
  } as CSSProperties

  return (
    <span
      className={`orb-presence ${SIZE_CLASS[size]} ${pulse && !reducedMotion ? 'orb-presence--pulse' : ''} ${className}`.trim()}
      data-orb-presence
      data-orb-presence-state={state}
      data-orb-state={renderState}
      style={hueStyle}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <OrbSphere state={renderState} size={sphereSize} />
    </span>
  )
}
