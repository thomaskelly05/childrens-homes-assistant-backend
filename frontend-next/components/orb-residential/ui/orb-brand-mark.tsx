'use client'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { ORB_RESIDENTIAL_TAGLINE } from '@/lib/orb/orb-residential-copy'

/** Horizontal ORB Residential brand lockup — sidebar, headers, settings. */
export function OrbBrandMark({
  size = 'md',
  pulse = false,
  showTagline = true,
  className = '',
  titleClassName = '',
  taglineClassName = ''
}: {
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  showTagline?: boolean
  className?: string
  titleClassName?: string
  taglineClassName?: string
}) {
  const orbSize = size === 'lg' ? 'md' : size === 'sm' ? 'sm' : 'sm'
  const titleSize =
    size === 'lg' ? 'text-base' : size === 'sm' ? 'text-sm' : 'text-[0.9375rem]'

  return (
    <div className={`orb-brand-mark flex min-w-0 items-center gap-2.5 ${className}`.trim()} data-orb-brand-mark>
      <GlassOrbMark size={orbSize} pulse={pulse} className="shrink-0" data-orb-brand-mark-orb data-orb-sidebar-brand-mark />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-semibold leading-tight text-[var(--orb-foreground)] ${titleSize} ${titleClassName}`.trim()}
          data-orb-sidebar-brand
        >
          ORB Residential
        </p>
        {showTagline ? (
          <p
            className={`orb-sidebar-powered-tagline mt-0.5 truncate text-[10px] ${taglineClassName}`.trim()}
            data-orb-sidebar-powered
          >
            {ORB_RESIDENTIAL_TAGLINE}
          </p>
        ) : null}
      </div>
    </div>
  )
}
