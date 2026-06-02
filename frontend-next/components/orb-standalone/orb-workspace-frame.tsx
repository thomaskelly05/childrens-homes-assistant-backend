'use client'

import { ArrowLeft, X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Full-height in-layout workspace chrome for core ORB tools (ChatGPT-style main area).
 * No backdrop blur or centred modal — sidebar stays visible on desktop.
 */
export function OrbWorkspaceFrame({
  open,
  title,
  subtitle,
  onClose,
  children,
  panelId,
  footer
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  panelId?: string
  footer?: ReactNode
}) {
  if (!open) return null

  return (
    <div
      className="orb-main-workspace flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--orb-bg-deep,var(--orb-page-bg,#f7fbff))]"
      data-orb-main-workspace="true"
      data-orb-workspace-panel={panelId}
      data-orb-app-panel-active="true"
    >
      <header className="orb-workspace-header flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)] bg-[var(--orb-surface-elevated,var(--orb-surface,#fff))] px-3 py-2.5 md:px-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--orb-royal-blue,#168bff)]"
          aria-label="Back to chat"
          data-orb-workspace-back
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight text-[var(--orb-foreground)]">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-[var(--orb-muted)] [text-wrap:pretty]">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--orb-royal-blue,#168bff)] lg:hidden"
          aria-label="Close workspace"
          data-orb-panel-close
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>
      <div className="orb-workspace-body min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer ? (
        <footer className="shrink-0 border-t border-[var(--orb-line)] px-4 py-3 text-[11px] leading-5 text-[var(--orb-muted)]">
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
