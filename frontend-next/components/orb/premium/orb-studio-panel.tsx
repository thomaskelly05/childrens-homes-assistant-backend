'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioPanelClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioPanel({
  title,
  subtitle,
  headerActions,
  children,
  className,
  panelId,
  noPadding
}: {
  title?: string
  subtitle?: string
  headerActions?: ReactNode
  children: ReactNode
  className?: string
  panelId?: string
  noPadding?: boolean
}) {
  return (
    <section
      className={orbStudioClass(orbStudioPanelClass, className)}
      data-orb-studio-panel={panelId}
    >
      {title ? (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--orb-line)]/35 px-4 py-2.5">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">{subtitle}</p> : null}
          </div>
          {headerActions}
        </header>
      ) : null}
      <div className={noPadding ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto p-4'}>
        {children}
      </div>
    </section>
  )
}
