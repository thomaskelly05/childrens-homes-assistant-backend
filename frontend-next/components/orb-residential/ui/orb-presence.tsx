'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { OrbSphere, type OrbRenderState } from '@/components/orb-core/orb-sphere'
import { getOrbHueProfile } from '@/lib/orb/rendering/visual-system'

/** Canonical ORB Residential presence states — map to `OrbSphere` render states. */
export type OrbPresenceState = 'idle' | 'listening' | 'thinking' | 'responding' | 'error'

/** Fixed layout variants — one size rule per surface (never one global hero size everywhere). */
export type OrbPresenceVariant = 'hero' | 'workspace' | 'voice' | 'dictate' | 'avatar' | 'compact'

/** Legacy size aliases map to variants via `resolveOrbPresenceVariant`. */
export type OrbPresenceSize =
  | OrbPresenceVariant
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

const VARIANT_CLASS: Record<OrbPresenceVariant, string> = {
  hero: 'orb-presence--hero',
  workspace: 'orb-presence--workspace',
  voice: 'orb-presence--voice',
  dictate: 'orb-presence--dictate',
  avatar: 'orb-presence--avatar',
  compact: 'orb-presence--compact'
}

/** Map legacy `size` props and explicit variants to canonical layout variant. */
export function resolveOrbPresenceVariant(input: OrbPresenceSize = 'hero'): OrbPresenceVariant {
  switch (input) {
    case 'hero':
    case 'home':
      return 'hero'
    case 'workspace':
    case 'voice':
    case 'voiceMobile':
      return 'voice'
    case 'dictate':
      return 'dictate'
    case 'avatar':
    case 'tiny':
    case 'xs':
    case 'sm':
    case 'md':
    case 'lg':
      return 'avatar'
    case 'compact':
    case 'empty':
      return 'compact'
    default:
      return input
  }
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
  size,
  variant,
  pulse = false,
  className = '',
  label
}: {
  state?: OrbPresenceState
  /** @deprecated Prefer `variant` — legacy alias resolved via `resolveOrbPresenceVariant`. */
  size?: OrbPresenceSize
  variant?: OrbPresenceVariant
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

  const resolvedVariant = resolveOrbPresenceVariant(variant ?? size ?? 'hero')
  const renderState = reducedMotion ? 'reduced_motion' : PRESENCE_TO_RENDER[state]
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
      className={`orb-presence ${VARIANT_CLASS[resolvedVariant]} ${pulse && !reducedMotion ? 'orb-presence--pulse' : ''} ${className}`.trim()}
      data-orb-presence
      data-orb-presence-variant={resolvedVariant}
      data-orb-presence-state={state}
      data-orb-state={renderState}
      style={hueStyle}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <OrbSphere state={renderState} />
    </span>
  )
}
