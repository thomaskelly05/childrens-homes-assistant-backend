import type { ReactNode } from 'react'

import { clsx } from 'clsx'

import { OrbGlassCard } from './orb-glass-card'

export type OrbResultAccent = 'default' | 'teal' | 'amber' | 'purple' | 'gold' | 'blue'

const accentBorder: Record<OrbResultAccent, string> = {
  default: 'border-l-white/20',
  teal: 'border-l-teal-400/70',
  amber: 'border-l-amber-400/70',
  purple: 'border-l-purple-400/70',
  gold: 'border-l-amber-300/80',
  blue: 'border-l-sky-400/70'
}

export function OrbResultCard({
  title,
  accent = 'default',
  children
}: {
  title: string
  accent?: OrbResultAccent
  children: ReactNode
}) {
  return (
    <OrbGlassCard className={clsx('border-l-4', accentBorder[accent])} data-orb-result-section={title}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </OrbGlassCard>
  )
}
