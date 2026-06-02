'use client'

/**
 * Single living glass orb mark — sidebar, avatars, loading states.
 */
export type GlassOrbMarkSize = 'tiny' | 'xs' | 'sm' | 'md' | 'empty' | 'home' | 'dictate' | 'lg' | 'hero' | 'voiceMobile'

export function GlassOrbMark({
  size = 'md',
  pulse = false,
  className = ''
}: {
  size?: GlassOrbMarkSize
  pulse?: boolean
  className?: string
}) {
  const sizeClass =
    size === 'tiny'
      ? 'glass-orb-mark--tiny'
      : size === 'xs'
        ? 'glass-orb-mark--xs'
        : size === 'sm'
          ? 'glass-orb-mark--sm'
          : size === 'empty'
            ? 'glass-orb-mark--empty'
            : size === 'home'
              ? 'glass-orb-mark--home'
              : size === 'dictate'
                ? 'glass-orb-mark--dictate'
                : size === 'voiceMobile'
                  ? 'glass-orb-mark--voice-mobile'
                  : size === 'lg'
              ? 'glass-orb-mark--lg'
              : size === 'hero'
                ? 'glass-orb-mark--hero'
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
      <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-[#5ec8ff]/90">
        Powered by IndiCare Intelligence
      </p>
    </div>
  )
}
