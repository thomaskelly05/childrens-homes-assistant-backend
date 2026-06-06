'use client'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'

/** Neutral full-viewport loading — no product chrome, sidebar, or chat shell. */
export function OrbAuthLoadingScreen() {
  const { resolvedTheme } = useOrbAppearance()
  const themeClass = resolvedTheme === 'light' ? 'orb-login-root--light' : 'orb-login-root--dark'

  return (
    <div
      className={`orb-residential-root orb-auth-loading-root ${themeClass} flex min-h-[100dvh] items-center justify-center`}
      data-orb-auth-loading
      data-orb-residential="true"
      style={getOrbThemeCssVariables(resolvedTheme)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <div
          className="h-9 w-9 animate-pulse rounded-full bg-[var(--orb-line)]/40"
          aria-hidden
          data-orb-auth-loading-indicator
        />
        <p className="text-sm text-[var(--orb-muted,#94a3b8)]">Loading…</p>
      </div>
    </div>
  )
}
