'use client'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'

type OrbHueLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const sizeClass: Record<NonNullable<OrbHueLogoProps['size']>, string> = {
  sm: 'text-lg font-extrabold',
  md: 'text-2xl font-extrabold',
  lg: 'text-4xl font-extrabold md:text-5xl'
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
      className={`orb-electric-text text-[11px] font-semibold tracking-[0.06em] ${className}`.trim()}
      data-orb-powered-indicare
    >
      Powered by IndiCare
    </p>
  )
}

export function OrbHueMark({ pulse = false, className = '' }: { pulse?: boolean; className?: string }) {
  return (
    <GlassOrbMark
      variant="avatar"
      pulse={pulse}
      className={`orb-hue-mark ${pulse ? 'orb-assistant-thinking-mark' : ''} ${className}`.trim()}
    />
  )
}
