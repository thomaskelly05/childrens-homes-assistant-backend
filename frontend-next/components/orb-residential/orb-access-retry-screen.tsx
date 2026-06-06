'use client'

import { useCallback } from 'react'

import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'

/** Safe terminal state when ORB access cannot be verified — never shows product chrome. */
export function OrbAccessRetryScreen({
  message,
  detail,
  onRetry,
  onBackToSignIn,
  onManageBilling,
  showManageBilling = false
}: {
  message: string
  detail?: string | null
  onRetry?: () => void
  onBackToSignIn?: () => void
  onManageBilling?: () => void
  showManageBilling?: boolean
}) {
  const { resolvedTheme } = useOrbAppearance()
  const themeClass = resolvedTheme === 'light' ? 'orb-login-root--light' : 'orb-login-root--dark'

  const handleBackToSignIn = useCallback(() => {
    onBackToSignIn?.()
  }, [onBackToSignIn])

  return (
    <div
      className={`orb-residential-root orb-auth-loading-root ${themeClass} flex min-h-[100dvh] min-h-[100svh] items-center justify-center overflow-y-auto`}
      data-orb-access-retry
      data-orb-residential="true"
      style={{
        ...getOrbThemeCssVariables(resolvedTheme),
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      role="status"
      aria-live="polite"
    >
      <div className="orb-auth-loading-inner my-auto flex max-w-sm flex-col items-center gap-4 px-6 py-8 text-center">
        <OrbHeroSphere className="scale-[0.55] sm:scale-[0.65]" />
        <p className="text-sm font-medium text-[var(--orb-text,#f8fafc)]">{message}</p>
        {detail ? <p className="text-xs text-[var(--orb-muted,#94a3b8)]">{detail}</p> : null}
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry ? (
            <button
              type="button"
              className="orb-login-submit rounded-2xl px-5 py-2.5 text-sm font-semibold"
              data-orb-access-retry-action
              onClick={onRetry}
            >
              Try again
            </button>
          ) : null}
          {showManageBilling && onManageBilling ? (
            <button
              type="button"
              className="rounded-2xl border border-[var(--orb-line)]/40 px-5 py-2.5 text-sm font-semibold text-[var(--orb-text,#f8fafc)]"
              data-orb-access-manage-billing
              onClick={onManageBilling}
            >
              Manage billing
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-2xl border border-[var(--orb-line)]/40 px-5 py-2.5 text-sm font-semibold text-[var(--orb-text,#f8fafc)]"
            data-orb-access-back-to-sign-in
            onClick={handleBackToSignIn}
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}
