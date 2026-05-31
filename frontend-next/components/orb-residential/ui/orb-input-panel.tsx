import type { ReactNode } from 'react'

import { OrbGlassCard } from './orb-glass-card'

export function OrbInputPanel({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <OrbGlassCard data-orb-input-panel>
      {title ? <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2> : null}
      {children}
    </OrbGlassCard>
  )
}
