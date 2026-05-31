import type { ReactNode } from 'react'

import { OrbGlassCard } from './orb-glass-card'

export function OrbStepCard({
  step,
  total,
  title,
  children
}: {
  step: number
  total: number
  title: string
  children: ReactNode
}) {
  return (
    <OrbGlassCard data-orb-setup-step={step}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/90">
        Step {step} of {total}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </OrbGlassCard>
  )
}
