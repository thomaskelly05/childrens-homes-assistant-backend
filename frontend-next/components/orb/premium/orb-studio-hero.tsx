'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioHeroClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioHero({
  title,
  subtitle,
  icon,
  actions,
  className,
  compact
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <section
      className={orbStudioClass(orbStudioHeroClass, compact ? 'px-4 py-4 sm:px-5 sm:py-5' : undefined, className)}
      data-orb-studio-hero
    >
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon ? (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#168bff]/15 to-[#7c5cff]/10 text-[var(--orb-primary)]"
              data-orb-studio-hero-icon
              aria-hidden
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--orb-foreground)] sm:text-2xl">{title}</h2>
            {subtitle ? <p className="max-w-xl text-sm leading-relaxed text-[var(--orb-muted)]">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  )
}
