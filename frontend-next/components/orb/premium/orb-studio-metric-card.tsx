'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioMetricCardClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioMetricCard({
  label,
  value,
  icon,
  tone = 'default',
  className
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  return (
    <div
      className={orbStudioClass(orbStudioMetricCardClass, className)}
      data-orb-studio-metric-card
      data-orb-studio-metric-tone={tone}
    >
      <div className="flex items-center gap-2">
        {icon ? <span className="text-[var(--orb-primary)]">{icon}</span> : null}
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--orb-muted)]">{label}</p>
          <p className="text-sm font-semibold text-[var(--orb-foreground)]">{value}</p>
        </div>
      </div>
    </div>
  )
}
