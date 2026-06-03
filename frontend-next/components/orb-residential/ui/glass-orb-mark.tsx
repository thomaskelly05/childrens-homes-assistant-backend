'use client'

import {
  OrbPresence,
  orbPresenceStateFromClassName,
  type OrbPresenceSize,
  type OrbPresenceState
} from '@/components/orb-residential/ui/orb-presence'

/** Residential ORB mark — delegates to `OrbPresence` (single source of truth). */
export type GlassOrbMarkSize = OrbPresenceSize

export function GlassOrbMark({
  size = 'md',
  pulse = false,
  state,
  className = ''
}: {
  size?: GlassOrbMarkSize
  pulse?: boolean
  state?: OrbPresenceState
  className?: string
}) {
  const resolvedState = state ?? orbPresenceStateFromClassName(className) ?? 'idle'

  return (
    <span data-glass-orb-mark>
      <OrbPresence size={size} state={resolvedState} pulse={pulse} className={className} />
    </span>
  )
}

/**
 * Logo lockup: orb + ORB Residential + tagline.
 */
export function OrbResidentialLogoLockup({
  size = 'md',
  pulse = false,
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}) {
  const orbSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'
  const titleClass =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div className={`flex flex-col items-center text-center ${className}`.trim()} data-orb-residential-lockup>
      <GlassOrbMark size={orbSize} pulse={pulse} />
      <p className={`mt-3 font-semibold tracking-tight text-[var(--orb-foreground,#f7faff)] ${titleClass}`}>
        ORB Residential
      </p>
      <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-[#5ec8ff]/90">
        Powered by IndiCare Intelligence
      </p>
    </div>
  )
}
