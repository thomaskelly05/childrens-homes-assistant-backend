'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function OrbStandalonePanelShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  ariaLabel,
  panelId,
  wide
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  ariaLabel?: string
  /** Marker for tests: data-orb-panel-shell={panelId} */
  panelId?: string
  wide?: boolean
}) {
  if (!open) return null

  return (
    <div
      className="orb-panel-overlay fixed inset-0 z-[65] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      data-orb-panel-shell={panelId || 'panel'}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`orb-panel-drawer flex h-full w-full flex-col border-l border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-2xl max-md:max-h-[100dvh] md:max-h-[100dvh] ${
          wide ? 'max-w-4xl' : 'max-w-xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--orb-line)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--orb-foreground)]">{title}</h2>
            {subtitle ? <p className="truncate text-[11px] leading-5 text-[var(--orb-muted)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50"
            aria-label="Close panel"
            data-orb-panel-close
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="orb-panel-body min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-[var(--orb-line)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-5 text-[var(--orb-muted)]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
