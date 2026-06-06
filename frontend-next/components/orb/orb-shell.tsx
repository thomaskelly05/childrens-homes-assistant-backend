'use client'

import { Suspense, useCallback } from 'react'

import { OrbAuthGate } from '@/components/orb-residential/orb-auth-gate'
import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'
import { OrbResidentialErrorBoundary } from '@/components/orb-residential/orb-residential-error-boundary'
import { OrbSafetyModal } from '@/components/orb-residential/orb-safety-modal'
import { useOrbResidentialThemeSync } from '@/components/orb-residential/use-orb-residential-theme-sync'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import { getOrbThemeCssVariables, ORB_SHELL_ROOT_CLASS } from '@/lib/orb/orb-theme'

function OrbShellInner() {
  const account = useOrbAccountState()
  const { resolvedTheme, appearanceMode } = useOrbAppearance()
  useOrbResidentialThemeSync()

  const handleSafetyAccepted = useCallback(() => {
    void account.refresh()
  }, [account])

  const showSafetyModal = account.isSignedIn && account.safetyAccepted === false
  const themeClass = resolvedTheme === 'light' ? 'orb-theme-light' : 'orb-theme-dark'

  return (
    <OrbAuthGate mode="product">
      <div
        className={`${ORB_SHELL_ROOT_CLASS} ${themeClass}`}
        data-orb-shell="true"
        data-orb-residential="true"
        data-orb-theme={resolvedTheme}
        data-orb-appearance-mode={appearanceMode}
        style={getOrbThemeCssVariables(resolvedTheme)}
      >
        <OrbResidentialErrorBoundary>
          <OrbCareCompanion residentialSurface />
        </OrbResidentialErrorBoundary>
        {showSafetyModal ? <OrbSafetyModal onAccepted={handleSafetyAccepted} /> : null}
      </div>
    </OrbAuthGate>
  )
}

/** Canonical wrapper for the standalone `/orb` experience (theme, safety gate, main companion). */
export function OrbShell() {
  return (
    <Suspense
      fallback={
        <div
          className="orb-residential-root flex h-[100dvh] items-center justify-center bg-[var(--orb-page-bg,#f7fbff)] text-sm text-[var(--orb-text-muted,#52657a)]"
          data-orb-auth-loading
        >
          Loading…
        </div>
      }
    >
      <OrbShellInner />
    </Suspense>
  )
}
