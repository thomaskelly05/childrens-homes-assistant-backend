'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export type OrbAppModalSize = 'compact' | 'standard' | 'wide' | 'fullscreenMobile'

const MODAL_SIZE_CLASS: Record<OrbAppModalSize, string> = {
  compact: 'orb-panel-modal--compact',
  standard: 'orb-panel-modal--standard',
  wide: 'orb-panel-modal--wide',
  fullscreenMobile: 'orb-panel-modal--fullscreen-mobile'
}

export function OrbStandalonePanelShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  ariaLabel,
  panelId,
  wide,
  layout = 'drawer',
  modalSize,
  appModal
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
  layout?: 'drawer' | 'center'
  modalSize?: OrbAppModalSize
  /** Residential ChatGPT-style centred modal */
  appModal?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const isCenter = layout === 'center' || Boolean(appModal)
  const sizeClass = modalSize ? MODAL_SIZE_CLASS[modalSize] : wide ? 'orb-panel-modal--wide' : 'orb-panel-modal--standard'

  return (
    <div
      className={`orb-panel-overlay fixed inset-0 z-[65] flex bg-black/50 backdrop-blur-md ${
        isCenter ? 'items-center justify-center p-3 sm:p-4' : 'justify-end'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      data-orb-panel-shell={panelId || 'panel'}
      data-orb-panel-layout={isCenter ? 'center' : layout}
      {...(appModal ? { 'data-orb-app-modal': 'true' as const } : {})}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={
          isCenter
            ? `orb-panel-modal flex max-h-[min(90dvh,52rem)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-2xl ${sizeClass}`
            : `orb-panel-drawer flex h-full w-full flex-col border-l border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-2xl max-md:max-h-[100dvh] md:max-h-[100dvh] ${
                wide ? 'max-w-4xl' : 'max-w-xl'
              }`
        }
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
            aria-label="Close"
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
