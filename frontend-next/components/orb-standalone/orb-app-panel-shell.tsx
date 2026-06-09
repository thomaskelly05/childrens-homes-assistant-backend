'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'

export type OrbAppPanelMode = 'modal' | 'side' | 'full' | 'sheet'
export type OrbAppPanelSize = 'compact' | 'standard' | 'wide' | 'workstation'
export type OrbAppPanelMobileMode = 'sheet' | 'full'

const SIZE_CLASS: Record<OrbAppPanelSize, string> = {
  compact: 'orb-panel-modal--compact',
  standard: 'orb-panel-modal--standard',
  wide: 'orb-panel-modal--wide',
  workstation: 'orb-panel-modal--workstation'
}

/**
 * Single ORB app panel shell — one backdrop below content, no nested full-screen overlays.
 */
export function OrbAppPanelShell({
  appId,
  title,
  subtitle,
  open,
  onClose,
  mode = 'modal',
  size = 'standard',
  mobileMode = 'sheet',
  children,
  footer,
  debugName,
  appModal
}: {
  appId: string
  title: string
  subtitle?: string
  open: boolean
  onClose: () => void
  mode?: OrbAppPanelMode
  size?: OrbAppPanelSize
  mobileMode?: OrbAppPanelMobileMode
  children: ReactNode
  footer?: ReactNode
  /** Extra marker for tests / ORB_UI_AUDIT */
  debugName?: string
  /** Legacy residential centred modal marker */
  appModal?: boolean
}) {
  const { mode: responsiveMode } = useOrbResponsiveMode()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const isCenter = mode === 'modal' || mode === 'sheet'
  const isSide = mode === 'side'
  const isFull = mode === 'full'
  const mobileSheet = responsiveMode === 'mobile' && mobileMode === 'sheet' && !isSide
  const mobileFull = responsiveMode === 'mobile' && mobileMode === 'full'

  const sizeClass = SIZE_CLASS[size]

  return (
    <div
      className="orb-app-panel-root fixed inset-0 z-[65] pointer-events-none"
      role="presentation"
      data-orb-app-panel-root
      data-orb-app-panel-shell="true"
      data-orb-app-panel-name={appId}
      data-orb-panel-debug={debugName || appId}
      data-orb-responsive-mode={responsiveMode}
      data-orb-app-panel-mobile-mode={mobileMode}
      {...(appModal ? { 'data-orb-app-modal': 'true' as const } : {})}
      {...(mobileFull ? { 'data-orb-app-panel-mobile-full': 'true' as const } : {})}
    >
      <button
        type="button"
        className="orb-app-panel-backdrop fixed inset-0 z-0 cursor-default border-0 bg-[var(--orb-overlay,rgba(15,23,42,0.45))] backdrop-blur-md pointer-events-auto"
        aria-label="Close panel"
        data-orb-app-panel-backdrop
        onClick={onClose}
      />

      <div
        className={`orb-app-panel-host pointer-events-none fixed inset-0 z-10 flex ${
          isCenter ? 'items-center justify-center p-3 sm:p-4' : isSide ? 'justify-end' : 'items-stretch'
        } ${mobileSheet ? 'items-end p-0 sm:items-center sm:p-4' : ''}`}
        data-orb-app-panel-host
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={
            isSide
              ? `orb-panel-drawer pointer-events-auto flex h-full w-full flex-col border-l border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-2xl max-md:max-h-[100dvh] md:max-h-[100dvh] ${
                  mobileFull
                    ? 'max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-none max-md:rounded-none max-md:border-0'
                    : ''
                } ${size === 'wide' || size === 'workstation' ? 'max-w-4xl' : 'max-w-xl'}`
              : isFull
                ? `orb-panel-full pointer-events-auto flex h-full w-full flex-col bg-[var(--orb-surface)]`
                : `orb-panel-modal pointer-events-auto flex max-h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem),56rem)] w-[min(calc(100vw-1rem),47.5rem)] max-w-[min(calc(100vw-1rem),47.5rem)] flex-col overflow-hidden rounded-3xl border border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-2xl max-sm:mt-auto max-sm:max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.5rem))] max-sm:w-[calc(100vw-0.75rem)] ${
                    mobileSheet ? 'max-sm:rounded-t-[1.35rem] max-sm:rounded-b-none max-sm:max-h-[min(96dvh,calc(100dvh-env(safe-area-inset-top)-0.25rem))]' : 'max-sm:rounded-b-none'
                  } ${mobileFull ? 'max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0' : ''} ${sizeClass}`
          }
          data-orb-app-panel
          data-orb-app-panel-content
          data-orb-app-panel-active="true"
          data-orb-panel-shell={appId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-cyan-500/10 bg-[var(--orb-surface)] px-5 py-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight text-[var(--orb-foreground)]">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 text-sm leading-snug text-[var(--orb-muted)] [text-wrap:pretty]">{subtitle}</p>
              ) : null}
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
            <footer
              className="shrink-0 border-t border-[var(--orb-line)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-5 text-[var(--orb-muted)]"
              data-orb-app-panel-footer
            >
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  )
}
