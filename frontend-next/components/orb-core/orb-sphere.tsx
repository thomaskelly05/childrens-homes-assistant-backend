'use client'

import type { OrbVisualState } from '@/lib/orb/rendering/visual-system'

export type OrbRenderState = OrbVisualState

const SIZE_CLASS: Record<'small' | 'medium' | 'large' | 'xlarge', string> = {
  small: 'h-14 w-14 min-h-14 min-w-14',
  medium: 'h-28 w-28 min-h-28 min-w-28',
  large: 'h-44 w-44 min-h-44 min-w-44',
  xlarge: 'h-64 w-64 min-h-64 min-w-64 md:h-80 md:w-80 md:min-h-80 md:min-w-80'
}

/**
 * Cross-browser living ORB — radial-gradient sphere visible without filters, blend modes, or PNG.
 */
export function OrbSphere({
  state = 'idle',
  size = 'large'
}: {
  state?: OrbRenderState
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}) {
  const sizeClass = SIZE_CLASS[size]

  return (
    <div
      className={`orb-sphere-wrap relative inline-flex ${sizeClass} items-center justify-center`}
      data-orb-state={state}
      role="img"
      aria-label={`ORB ${state.replaceAll('_', ' ')}`}
    >
      <span
        className={`orb-living-sphere orb-sphere relative block ${sizeClass}`}
        data-orb-living-sphere
        data-orb-state={state}
        aria-hidden
      />
    </div>
  )
}
