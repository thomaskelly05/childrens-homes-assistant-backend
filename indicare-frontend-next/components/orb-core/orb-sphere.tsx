'use client'

import type { OrbVisualState } from '@/lib/orb/rendering/visual-system'

export type OrbRenderState = OrbVisualState

export function OrbSphere({ state = 'idle', size = 'large' }: { state?: OrbRenderState; size?: 'small' | 'medium' | 'large' | 'xlarge' }) {
  const sizeClass = size === 'small' ? 'h-14 w-14' : size === 'medium' ? 'h-28 w-28' : size === 'xlarge' ? 'h-64 w-64 md:h-80 md:w-80' : 'h-44 w-44'

  return (
    <div className={`orb-sphere-wrap relative inline-flex ${sizeClass} items-center justify-center`} data-orb-state={state} role="img" aria-label={`ORB ${state.replaceAll('_', ' ')}`}>
      <span className="orb-sphere-aura absolute inset-[-52%] rounded-full" aria-hidden />
      <span className="orb-sphere-edge absolute inset-[-22%] rounded-full" aria-hidden />
      <span className="orb-sphere-ripple absolute inset-[-14%] rounded-full" aria-hidden />
      <span className={`orb-sphere relative block ${sizeClass} overflow-hidden rounded-full`} aria-hidden>
        <span className="orb-sphere-depth absolute inset-0 rounded-full" />
        <span className="orb-sphere-glass absolute inset-0 rounded-full" />
        <span className="orb-sphere-liquid absolute inset-[-22%] rounded-full" />
        <span className="orb-sphere-highlight absolute rounded-full" />
        <span className="orb-sphere-caustic absolute rounded-full" />
        <span className="orb-sphere-core absolute rounded-full" />
      </span>
    </div>
  )
}

