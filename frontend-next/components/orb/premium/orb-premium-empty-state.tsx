'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { OrbPremiumActionBar } from '@/components/orb/premium/orb-premium-action-bar'
import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbPremiumEmptyState({
  title,
  body,
  icon: Icon,
  actions,
  className,
  dataAttr
}: {
  title: string
  body: string
  icon?: LucideIcon
  actions?: ReactNode
  className?: string
  dataAttr?: string
}) {
  return (
    <div
      className={cn(
        'orb-premium-empty-state flex flex-col items-center rounded-2xl border border-dashed border-[var(--orb-line)]/80 bg-[var(--orb-surface-elevated)]/50 px-6 py-10 text-center',
        className
      )}
      data-orb-premium-empty-state
      {...(dataAttr ? { [`data-orb-${dataAttr}`]: true } : {})}
    >
      {Icon ? <Icon className="h-9 w-9 text-[var(--orb-muted)]" aria-hidden /> : null}
      <p className="mt-3 text-sm font-semibold text-[var(--orb-foreground)]">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--orb-muted)]">{body}</p>
      {actions ? (
        <OrbPremiumActionBar className="mt-5 justify-center">{actions}</OrbPremiumActionBar>
      ) : null}
    </div>
  )
}
