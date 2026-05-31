'use client'

import { PremiumMobileOrb } from '@/components/orb-residential/ui/premium-mobile-orb'

/**
 * Single premium ORB sphere for landing/login — no square OrbGlow / OrbSphere artefact.
 */
export function OrbHeroSphere({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`.trim()}
      data-orb-hero-sphere
      data-orb-empty-sphere-mark
    >
      <PremiumMobileOrb variant="desktop" label="ORB Residential" />
    </div>
  )
}
