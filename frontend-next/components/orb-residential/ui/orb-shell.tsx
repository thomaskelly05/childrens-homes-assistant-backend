'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { orbNavyGradient, orbNavyPage } from './orb-theme'

export function OrbShell({
  children,
  showOsLink = true,
  headerRight
}: {
  children: ReactNode
  showOsLink?: boolean
  headerRight?: ReactNode
}) {
  return (
    <div className={`${orbNavyPage} ${orbNavyGradient}`} data-orb-residential-shell>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="group flex flex-col gap-0.5" data-orb-brand>
          <span className="text-sm font-semibold tracking-tight text-white">ORB Residential</span>
          <span className="text-[11px] font-medium text-sky-300/80">Powered by IndiCare Intelligence</span>
        </Link>
        <div className="flex items-center gap-3">
          {headerRight}
          {showOsLink ? (
            <Link
              href="/os"
              className="text-xs font-medium text-slate-400 transition hover:text-sky-300"
              data-orb-os-link
            >
              IndiCare OS
            </Link>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</main>
    </div>
  )
}
