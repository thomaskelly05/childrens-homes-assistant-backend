'use client'

import type { ReactNode } from 'react'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export function OrbStudioEmptyState({
  icon,
  title,
  description,
  actions,
  className
}: {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'orb-studio-empty-state flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--orb-line)]/50 px-6 py-10 text-center',
        className
      )}
      data-orb-studio-empty-state
    >
      {icon ? (
        <div
          className="orb-studio-empty-state__icon mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--orb-primary)]"
          data-orb-studio-empty-icon
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--orb-foreground)]" data-orb-studio-empty-title>
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--orb-muted)]" data-orb-studio-empty-description>
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2" data-orb-studio-empty-actions>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
