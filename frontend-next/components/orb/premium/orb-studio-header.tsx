'use client'

import type { ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbStudioHeader({
  title,
  subtitle,
  badge,
  actions,
  className
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn('flex shrink-0 flex-wrap items-start justify-between gap-3', className)}
      data-orb-studio-header
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--orb-foreground)] sm:text-xl" data-orb-studio-title>
            {title}
          </h2>
          {badge}
        </div>
        {subtitle ? (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--orb-muted)]" data-orb-studio-subtitle>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2" data-orb-studio-header-actions>
          {actions}
        </div>
      ) : null}
    </header>
  )
}
