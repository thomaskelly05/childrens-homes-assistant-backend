'use client'

import { Suspense, useCallback } from 'react'

import { OrbAuthGate } from '@/components/orb-residential/orb-auth-gate'
import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'
import { OrbResidentialErrorBoundary } from '@/components/orb-residential/orb-residential-error-boundary'
import { OrbSafetyModal } from '@/components/orb-residential/orb-safety-modal'
import { useOrbResidentialThemeSync } from '@/components/orb-residential/use-orb-residential-theme-sync'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { useOrbAccountState } from '@/contexts/orb-account-context'
import { getOrbThemeCssVariables, ORB_SHELL_ROOT_CLASS } from '@/lib/orb/orb-theme'

/** ORB product chrome — only mounts when OrbAuthGate reaches `ready`. */
function OrbProductShell() {
  const account = useOrbAccountState()
  const { resolvedTheme, appearanceMode } = useOrbAppearance()
  useOrbResidentialThemeSync()

  const handleSafetyAccepted = useCallback(() => {
    void account.refresh()
  }, [account])

  const showSafetyModal = account.isSignedIn && account.safetyAccepted === false
  const themeClass = resolvedTheme === 'light' ? 'orb-theme-light' : 'orb-theme-dark'

  return (
    <div
      className={`${ORB_SHELL_ROOT_CLASS} ${themeClass}`}
      data-orb-shell="true"
      data-orb-residential="true"
      data-orb-product-mounted="true"
      data-orb-theme={resolvedTheme}
      data-orb-appearance-mode={appearanceMode}
      style={getOrbThemeCssVariables(resolvedTheme)}
    >
      <OrbResidentialErrorBoundary>
        <OrbCareCompanion residentialSurface />
      </OrbResidentialErrorBoundary>
      {showSafetyModal ? <OrbSafetyModal onAccepted={handleSafetyAccepted} /> : null}
    </div>
  )
}

/** Canonical wrapper for the standalone `/orb` experience (theme, safety gate, main companion). */
export function OrbShell() {
  return (
    <Suspense fallback={<OrbAuthLoadingScreen />}>
      <OrbAuthGate mode="product">
        <OrbProductShell />
      </OrbAuthGate>
    </Suspense>
  )
}
