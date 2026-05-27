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
      className={`orb-hue-text font-semibold tracking-tight ${sizeClass[size]} ${pulse ? 'orb-hue-text--pulse' : ''} ${className}`.trim()}
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
      className={`orb-electric-text text-[11px] font-medium uppercase tracking-[0.18em] ${className}`.trim()}
      data-orb-powered-indicare
    >
      Powered by IndiCare
    </p>
  )
}

export function OrbHueMark({ pulse = false }: { pulse?: boolean }) {
  return (
    <span
      className={`orb-hue-mark inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00B8FF]/15 to-[#2563EB]/10 text-sm font-bold ${pulse ? 'orb-hue-mark--pulse' : ''}`}
      data-orb-hue-mark
      aria-hidden
    >
      <span className="orb-hue-text text-sm font-bold">O</span>
    </span>
  )
}
