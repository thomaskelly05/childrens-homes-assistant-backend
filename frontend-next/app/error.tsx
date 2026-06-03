'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'

import { WorkspaceRecoveryPanel } from '@/components/indicare/workspaces/workspace-recovery-panel'
import { useOrbResidentialThemeSync } from '@/components/orb-residential/use-orb-residential-theme-sync'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'

function useOrbResidentialRoute(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    const path = window.location.pathname
    return path === '/' || path.startsWith('/orb')
  }, [])
}

function OrbResidentialGlobalError({ error, reset }: { error: Error; reset?: () => void }) {
  useOrbResidentialThemeSync()
  const developerMode = isOrbDeveloperMode()

  return (
    <main
      className="orb-residential-root flex min-h-[100dvh] items-center justify-center bg-[var(--orb-page-bg,#f7fbff)] px-6 py-10 text-[var(--orb-text-primary,#0f172a)]"
      data-orb-residential-error
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-sm leading-7 text-[#a7aebd]">
          ORB could not load this workspace properly. You can start a new chat or return to ORB.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {reset ? (
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950"
              data-orb-error-start-chat
            >
              Start new chat
            </button>
          ) : (
            <Link
              href="/orb"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950"
              data-orb-error-start-chat
            >
              Start new chat
            </Link>
          )}
          <Link
            href="/orb"
            className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold"
            data-orb-error-back
          >
            Back to ORB
          </Link>
        </div>
        {developerMode ? (
          <p
            className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 font-mono text-[11px] leading-5 text-red-200"
            data-orb-error-developer-detail
          >
            {error.message}
          </p>
        ) : null}
      </div>
    </main>
  )
}

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  const isOrbRoute = useOrbResidentialRoute()

  useEffect(() => {
    console.error('[app] route error', error)
  }, [error])

  if (isOrbRoute) {
    return <OrbResidentialGlobalError error={error} reset={reset} />
  }

  const message = error.message || 'The operational workspace encountered an unexpected error.'
  const isElementTypeError = /element type is invalid|react error #130/i.test(message)

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <WorkspaceRecoveryPanel
          message={
            isElementTypeError
              ? 'A workspace section could not render safely. The interface has switched to recovery mode instead of crashing.'
              : message
          }
        />
      </div>
    </main>
  )
}
