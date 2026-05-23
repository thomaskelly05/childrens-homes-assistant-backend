'use client'

import { operationalFeatureFlags } from '@/lib/navigation/operational-navigation'

import { OrbCompanionPanel } from './orb-companion-panel'

export function ContextualOrbPanel({ className = '' }: { className?: string }) {
  if (!operationalFeatureFlags.embeddedOrbPanel) return null

  return (
    <div data-testid="contextual-orb-panel" className={className}>
      <OrbCompanionPanel />
    </div>
  )
}
