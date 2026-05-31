'use client'

import { OrbGlow } from '@/components/orb-standalone/orb-glow'

export function OrbGlowHero({ compact }: { compact?: boolean }) {
  return (
    <div className="relative flex justify-center py-6" data-orb-glow-hero>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-48 rounded-full bg-sky-500/20 blur-[80px]" aria-hidden />
      </div>
      <OrbGlow state="idle" interactive={false} size={compact ? 'dock' : 'hero'} compactLabels />
    </div>
  )
}
