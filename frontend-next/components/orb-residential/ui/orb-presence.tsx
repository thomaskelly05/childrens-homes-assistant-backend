'use client'

import { useEffect, useState } from 'react'

import { OrbBrandImage, type OrbBrandImageCrop } from '@/components/orb-core/orb-brand-image'

/** Canonical ORB Residential presence states (visual state is conveyed outside the static brand asset). */
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

const SIZE_CROP: Record<OrbPresenceSize, OrbBrandImageCrop> = {
  tiny: 'sphere',
  xs: 'sphere',
  sm: 'sphere',
  md: 'sphere',
  empty: 'full',
  home: 'full',
  dictate: 'full',
  voice: 'full',
  voiceMobile: 'full',
  lg: 'sphere',
  hero: 'full'
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

  const crop = SIZE_CROP[size]
  const shouldPulse = pulse && !reducedMotion && state === 'idle'

  return (
    <span
      className={`orb-presence ${SIZE_CLASS[size]} ${shouldPulse ? 'orb-presence--pulse' : ''} ${className}`.trim()}
      data-orb-presence
      data-orb-presence-state={state}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <OrbBrandImage crop={crop} alt={label ?? 'ORB'} />
    </span>
  )
}
