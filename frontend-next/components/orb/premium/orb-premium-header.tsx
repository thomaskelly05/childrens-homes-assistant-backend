'use client'

import type { ReactNode } from 'react'

export function OrbPremiumHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="orb-premium-header shrink-0 space-y-1" data-orb-premium-header>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-[var(--orb-foreground)] sm:text-lg">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--orb-muted)] sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  )
}
