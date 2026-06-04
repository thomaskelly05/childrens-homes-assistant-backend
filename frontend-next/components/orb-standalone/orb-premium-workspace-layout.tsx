'use client'

import type { ReactNode } from 'react'

/**
 * Shared one-screen premium workspace chrome for ORB tool stations.
 * Full viewport height, compact header, central card, optional footer.
 */
export function OrbPremiumWorkspaceLayout({
  children,
  intro,
  primaryAction,
  advanced,
  output,
  footer,
  panelId,
  compact = true
}: {
  children?: ReactNode
  intro?: ReactNode
  primaryAction?: ReactNode
  advanced?: ReactNode
  output?: ReactNode
  footer?: ReactNode
  panelId?: string
  compact?: boolean
}) {
  return (
    <div
      className={`orb-premium-workspace flex min-h-0 flex-1 flex-col ${compact ? 'orb-premium-workspace--compact' : ''}`}
      data-orb-premium-workspace={panelId}
      data-orb-premium-workspace-compact={compact ? 'true' : undefined}
    >
      {intro ? (
        <div className="orb-premium-workspace-intro shrink-0 px-1 pb-2" data-orb-premium-workspace-intro>
          {intro}
        </div>
      ) : null}

      <div
        className="orb-premium-workspace-card min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 p-3 sm:p-4"
        data-orb-premium-workspace-card
      >
        {children}
      </div>

      {output ? (
        <div
          className="orb-premium-workspace-output mt-3 min-h-0 max-h-[min(40vh,20rem)] shrink-0 overflow-y-auto rounded-2xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)]/90 p-3 sm:p-4"
          data-orb-premium-workspace-output
        >
          {output}
        </div>
      ) : null}

      {primaryAction ? (
        <div className="orb-premium-workspace-primary mt-3 shrink-0" data-orb-premium-workspace-primary>
          {primaryAction}
        </div>
      ) : null}

      {advanced ? (
        <details className="orb-premium-workspace-advanced mt-2 shrink-0" data-orb-premium-workspace-advanced>
          <summary className="cursor-pointer text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
            Advanced options
          </summary>
          <div className="mt-2 space-y-3 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-3">
            {advanced}
          </div>
        </details>
      ) : null}

      {footer ? (
        <footer className="orb-premium-workspace-footer mt-2 shrink-0 text-[10px] leading-4 text-[var(--orb-muted)]">
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
