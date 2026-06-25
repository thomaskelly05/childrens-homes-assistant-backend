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
  footer,
  compactChrome = false,
  headerActions
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  panelId?: string
  footer?: ReactNode
  /** Minimal back-only header — studio tools supply their own title bar. */
  compactChrome?: boolean
  /** Optional actions rendered in the workspace header (e.g. Voice settings). */
  headerActions?: ReactNode
}) {
  if (!open) return null

  return (
    <div
      className="orb-main-workspace orb-mobile-workspace-panel flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--orb-mobile-ws-panel,var(--orb-bg-deep,var(--orb-page-bg,#070b14)))] text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
      data-orb-main-workspace="true"
      data-orb-workspace-panel={panelId}
      data-orb-app-panel-active="true"
    >
      <header
        className={`orb-workspace-header orb-mobile-station-header flex shrink-0 items-center gap-2 border-b border-[var(--orb-mobile-ws-card-border,var(--orb-line))] bg-[var(--orb-mobile-ws-footer,var(--orb-surface-elevated))] pt-[max(0.25rem,env(safe-area-inset-top))] ${
          compactChrome ? 'px-2 py-1' : 'px-3 py-1.5 md:px-5 md:py-2.5'
        }`}
        data-orb-workspace-header
        data-orb-workspace-header-compact={compactChrome ? 'true' : undefined}
        data-orb-mobile-station-header
        data-orb-mobile-shell-top-bar
      >
        <button
          type="button"
          onClick={onClose}
          className={`inline-flex shrink-0 items-center justify-center rounded-xl text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--orb-royal-blue,#168bff)] ${
            compactChrome ? 'h-8 w-8' : 'h-10 w-10'
          }`}
          aria-label="Back to chat"
          data-orb-workspace-back
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        {!compactChrome ? (
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight text-[var(--orb-foreground)]">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-[var(--orb-muted)] [text-wrap:pretty]">{subtitle}</p>
          ) : null}
        </div>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}
        {headerActions ? (
          <div className="flex shrink-0 items-center gap-2" data-orb-workspace-header-actions>
            {headerActions}
          </div>
        ) : null}
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
      <div
        className={`orb-workspace-body orb-mobile-workspace-body min-h-0 flex-1 overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] ${
          panelId === 'documents' || panelId === 'orb-write' || panelId === 'voice'
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto'
        }`}
        data-orb-mobile-shell-scroll-region
      >
        {children}
      </div>
      {footer ? (
        <footer className="orb-mobile-workspace-footer shrink-0 border-t border-[var(--orb-mobile-ws-card-border,var(--orb-line))] bg-[var(--orb-mobile-ws-footer,var(--orb-surface-elevated))] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-5 text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
