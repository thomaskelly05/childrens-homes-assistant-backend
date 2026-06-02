'use client'

import { Suspense, useCallback } from 'react'

import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'
import { OrbResidentialErrorBoundary } from '@/components/orb-residential/orb-residential-error-boundary'
import { OrbSafetyModal } from '@/components/orb-residential/orb-safety-modal'
import { useOrbResidentialThemeLock } from '@/components/orb-residential/use-orb-residential-theme-lock'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import { ORB_SHELL_ROOT_CLASS, orbResidentialRootStyle } from '@/lib/orb/orb-theme'

function OrbShellInner() {
  const account = useOrbAccountState()
  useOrbResidentialThemeLock()

  const handleSafetyAccepted = useCallback(() => {
    void account.refresh()
  }, [account])

  const showSafetyModal = account.isSignedIn && account.safetyAccepted === false

  return (
    <div
      className={ORB_SHELL_ROOT_CLASS}
      data-orb-residential="true"
      style={orbResidentialRootStyle('dark')}
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
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-[#050b18] text-sm text-slate-400">
          Loading ORB…
        </div>
      }
    >
      <OrbShellInner />
    </Suspense>
  )
}
