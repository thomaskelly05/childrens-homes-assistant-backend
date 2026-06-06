'use client'

import { useCallback, useEffect, useState } from 'react'

import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { ORB_AUTH_LOADING_TIMEOUT_MS } from '@/lib/orb/orb-front-door-routing'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'

type OrbAuthLoadingPhase = 'checking' | 'slow' | 'retry'

/** Branded auth-check screen — never shows product chrome; times out safely. */
export function OrbAuthLoadingScreen({
  onRetry,
  onBackToSignIn,
  timeoutMs = ORB_AUTH_LOADING_TIMEOUT_MS
}: {
  onRetry?: () => void
  onBackToSignIn?: () => void
  timeoutMs?: number
} = {}) {
  const { resolvedTheme } = useOrbAppearance()
  const themeClass = resolvedTheme === 'light' ? 'orb-login-root--light' : 'orb-login-root--dark'
  const [phase, setPhase] = useState<OrbAuthLoadingPhase>('checking')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPhase((current) => (current === 'checking' ? 'slow' : current))
    }, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [timeoutMs])

  const handleRetry = useCallback(() => {
    setPhase('checking')
    onRetry?.()
    window.setTimeout(() => {
      setPhase((current) => (current === 'checking' ? 'slow' : current))
    }, timeoutMs)
  }, [onRetry, timeoutMs])

  const handleBackToSignIn = useCallback(() => {
    if (onBackToSignIn) {
      onBackToSignIn()
      return
    }
    if (typeof window !== 'undefined') {
      window.location.assign('/orb')
    }
  }, [onBackToSignIn])

  return (
    <div
      className={`orb-residential-root orb-auth-loading-root ${themeClass} flex min-h-[100dvh] min-h-[100svh] items-center justify-center`}
      data-orb-auth-loading
      data-orb-auth-loading-phase={phase}
      data-orb-residential="true"
      style={{
        ...getOrbThemeCssVariables(resolvedTheme),
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      role="status"
      aria-live="polite"
      aria-busy={phase !== 'retry'}
    >
      <div className="orb-auth-loading-inner flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        <OrbHeroSphere className="scale-[0.55] sm:scale-[0.65]" />
        {phase === 'checking' ? (
          <>
            <p className="text-sm font-medium text-[var(--orb-text,#f8fafc)]">Checking your session…</p>
            <p className="text-xs text-[var(--orb-muted,#94a3b8)]">Securing your ORB Residential access</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-[var(--orb-text,#f8fafc)]">Taking longer than expected</p>
            <p className="text-xs text-[var(--orb-muted,#94a3b8)]">
              We could not confirm your session yet. You can try again or return to sign in.
            </p>
            <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                className="orb-login-submit rounded-2xl px-5 py-2.5 text-sm font-semibold"
                data-orb-auth-loading-retry
                onClick={handleRetry}
              >
                Try again
              </button>
              <button
                type="button"
                className="rounded-2xl border border-[var(--orb-line)]/40 px-5 py-2.5 text-sm font-semibold text-[var(--orb-text,#f8fafc)]"
                data-orb-auth-loading-back
                onClick={handleBackToSignIn}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
