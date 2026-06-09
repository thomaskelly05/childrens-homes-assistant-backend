'use client'

import type { ReactNode } from 'react'

/** Root class for the shared ORB mobile layout shell. */
export const ORB_MOBILE_SHELL_CLASS = 'orb-mobile-shell'

/** Safe-area padding utility — use on mobile pages and scroll regions. */
export const ORB_MOBILE_SAFE_AREA_CLASS = 'orb-mobile-safe-area'

/** Cross-browser viewport height utility (svh/dvh + Safari fill-available). */
export const ORB_MOBILE_VIEWPORT_CLASS = 'orb-mobile-viewport'

export type OrbMobileShellProps = {
  children: ReactNode
  /** Top app bar slot (title row, close, menu). */
  appBar?: ReactNode
  /** Scrollable main content. */
  contentClassName?: string
  /** Sticky primary actions above the safe-area inset. */
  primaryAction?: ReactNode
  /** Footer note or legal links. */
  footer?: ReactNode
  className?: string
  /** Optional marker for tests (`data-orb-mobile-shell-marker`). */
  marker?: string
}

/**
 * Shared ORB Residential mobile shell — top bar, content, optional actions/footer,
 * consistent safe-area spacing and viewport height across Safari/Chrome/Firefox.
 */
export function OrbMobileShell({
  children,
  appBar,
  contentClassName = '',
  primaryAction,
  footer,
  className = '',
  marker
}: OrbMobileShellProps) {
  return (
    <div
      className={`${ORB_MOBILE_SHELL_CLASS} ${ORB_MOBILE_VIEWPORT_CLASS} flex min-h-0 w-full max-w-[100vw] flex-col overflow-x-hidden ${className}`}
      data-orb-mobile-shell="true"
      data-orb-mobile-shell-marker={marker}
    >
      {appBar ? (
        <header className="orb-mobile-shell__bar shrink-0" data-orb-mobile-shell-bar>
          {appBar}
        </header>
      ) : null}
      <div
        className={`orb-mobile-shell__content min-h-0 flex-1 overflow-y-auto overscroll-contain ${contentClassName}`}
        data-orb-mobile-shell-content
      >
        {children}
      </div>
      {primaryAction ? (
        <div
          className={`orb-mobile-shell__actions shrink-0 ${ORB_MOBILE_SAFE_AREA_CLASS}`}
          data-orb-mobile-shell-actions
        >
          {primaryAction}
        </div>
      ) : null}
      {footer ? (
        <footer
          className={`orb-mobile-shell__footer shrink-0 ${ORB_MOBILE_SAFE_AREA_CLASS}`}
          data-orb-mobile-shell-footer
        >
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
