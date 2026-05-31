'use client'

/**
 * Compact premium ORB mark for residential empty state — circle only, no square halo artefact.
 */
export function PremiumMobileOrb({
  variant = 'mobile',
  className = '',
  label = 'ORB'
}: {
  variant?: 'mobile' | 'desktop'
  className?: string
  label?: string
}) {
  const sizeClass = variant === 'desktop' ? 'premium-mobile-orb--desktop' : 'premium-mobile-orb--mobile'

  return (
    <div
      className={`premium-mobile-orb ${sizeClass} ${className}`.trim()}
      data-premium-mobile-orb
      data-orb-empty-sphere-mark
      role="img"
      aria-label={label}
    >
      <div className="premium-mobile-orb__glow" aria-hidden />
      <div className="premium-mobile-orb__core" aria-hidden />
    </div>
  )
}
