'use client'

import type { ReactNode } from 'react'

import { orbStudioClass, orbStudioSidebarPanelClass } from '@/components/orb/premium/orb-studio-theme'

export function OrbStudioSidebarPanel({
  title,
  subtitle,
  children,
  className,
  position = 'right'
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  position?: 'left' | 'right'
}) {
  return (
    <aside
      className={orbStudioClass(orbStudioSidebarPanelClass, className)}
      data-orb-studio-sidebar-panel
      data-orb-studio-sidebar-position={position}
    >
      {title ? (
        <header className="shrink-0 border-b border-[var(--orb-line)]/35 px-3 py-2.5">
          <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[10px] leading-snug text-[var(--orb-muted)]">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  )
}
