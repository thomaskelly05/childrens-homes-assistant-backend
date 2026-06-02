'use client'

import type { ReactNode } from 'react'

const DEFAULT_DISCLAIMER =
  'ORB Residential can make mistakes. It does not access IndiCare OS records unless you choose to connect them.'

const DEFAULT_COPYRIGHT = 'ORB Residential · © 2026 IndiCare'

/**
 * Single main chat footer — disclaimer + copyright once (no CSS ::after duplicates).
 */
export function OrbFooter({
  disclaimer = DEFAULT_DISCLAIMER,
  copyright = DEFAULT_COPYRIGHT,
  className = '',
  children
}: {
  disclaimer?: string
  copyright?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <footer
      className={`orb-main-footer text-center ${className}`.trim()}
      data-orb-footer="main"
      data-orb-residential-footer
    >
      <p className="text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-composer-disclaimer>
        {disclaimer}
      </p>
      {copyright ? (
        <p className="mt-1 text-[10px] leading-4 text-[var(--orb-muted)]/80" data-orb-residential-copyright>
          {copyright}
        </p>
      ) : null}
      {children}
    </footer>
  )
}
