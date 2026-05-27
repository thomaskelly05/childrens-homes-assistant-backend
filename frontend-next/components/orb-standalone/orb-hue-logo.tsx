'use client'

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
      className={`orb-hue-text tracking-tight ${sizeClass[size]} ${pulse ? 'orb-hue-text--pulse orb-hue-pulse' : ''} ${className}`.trim()}
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
      className={`orb-electric-text text-[11px] uppercase ${className}`.trim()}
      data-orb-powered-indicare
    >
      Powered by IndiCare
    </p>
  )
}

export function OrbHueMark({ pulse = false }: { pulse?: boolean }) {
  return (
    <span
      className={`orb-hue-mark inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#00B8FF]/20 bg-gradient-to-br from-[#00B8FF]/12 via-[#60A5FA]/10 to-[#818CF8]/12 text-sm font-bold shadow-sm ${pulse ? 'orb-hue-mark--pulse' : ''}`}
      data-orb-hue-mark
      aria-hidden
    >
      <span className={`orb-hue-text text-sm font-bold ${pulse ? 'orb-hue-pulse' : ''}`}>O</span>
    </span>
  )
}
