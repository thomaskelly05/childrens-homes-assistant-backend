'use client'

import type { ReactNode } from 'react'

export function OrbPremiumAdvanced({
  children,
  label = 'Advanced options'
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <details
      className="orb-premium-advanced mt-2 shrink-0"
      data-orb-premium-advanced
      data-orb-premium-workspace-advanced
    >
      <summary className="cursor-pointer text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
        {label}
      </summary>
      <div className="mt-2 space-y-3 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-3">
        {children}
      </div>
    </details>
  )
}
