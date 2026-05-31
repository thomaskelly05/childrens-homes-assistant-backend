'use client'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'

type OrbHueLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const sizeClass: Record<NonNullable<OrbHueLogoProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl md:text-5xl'
}

export function OrbHueLogo({ size = 'md', pulse = false, className = '' }: OrbHueLogoProps) {
  return (
    <span
      className={`orb-hue-text tracking-tight ${sizeClass[size]} ${pulse ? 'orb-hue-text--pulse orb-hue-pulse orb-hue-response-pulse' : ''} ${className}`.trim()}
      data-orb-hue-logo
      aria-hidden
    >
      ORB
    </span>
  )
}

export function OrbPoweredByIndicare({ className = '' }: { className?: string }) {
  return (
    <p
      className={`orb-electric-text text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`.trim()}
      data-orb-powered-indicare
    >
      Powered by IndiCare
    </p>
  )
}

export function OrbHueMark({ pulse = false, className = '' }: { pulse?: boolean; className?: string }) {
  return (
    <GlassOrbMark
      size="sm"
      pulse={pulse}
      className={`orb-hue-mark ${pulse ? 'orb-assistant-thinking-mark' : ''} ${className}`.trim()}
    />
  )
}
