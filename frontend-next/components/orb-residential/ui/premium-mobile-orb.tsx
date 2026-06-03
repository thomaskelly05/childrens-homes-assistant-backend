'use client'

import { OrbPresence } from '@/components/orb-residential/ui/orb-presence'

/**
 * Compact premium ORB mark for residential landing/login — canonical `OrbPresence`.
 */
export function PremiumMobileOrb({
  variant = 'mobile',
  className = '',
  label = 'ORB',
  state = 'idle'
}: {
  variant?: 'mobile' | 'desktop'
  className?: string
  label?: string
  state?: 'idle' | 'listening' | 'thinking' | 'responding' | 'error'
}) {
  const size = variant === 'desktop' ? 'home' : 'empty'

  return (
    <div
      className={`premium-mobile-orb premium-mobile-orb--${variant} ${className}`.trim()}
      data-premium-mobile-orb
      data-orb-empty-sphere-mark
    >
      <OrbPresence size={size} state={state} pulse={state === 'idle'} label={label} />
    </div>
  )
}
