'use client'

/**
 * Single living glass orb mark — sidebar, avatars, loading states.
 */
export function GlassOrbMark({
  size = 'md',
  pulse = false,
  className = ''
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}) {
  const sizeClass =
    size === 'xs'
      ? 'glass-orb-mark--xs'
      : size === 'sm'
        ? 'glass-orb-mark--sm'
        : size === 'lg'
          ? 'glass-orb-mark--lg'
          : 'glass-orb-mark--md'

  return (
    <span
      className={`glass-orb-mark ${sizeClass} ${pulse ? 'glass-orb-mark--pulse' : ''} ${className}`.trim()}
      data-glass-orb-mark
      aria-hidden
    >
      <span className="glass-orb-mark__sphere" />
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
      <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-[var(--orb-muted,#6f7787)]">
        Powered by IndiCare Intelligence
      </p>
    </div>
  )
}
