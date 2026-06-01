'use client'

import { Suspense, useCallback } from 'react'

import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'
import { OrbResidentialErrorBoundary } from '@/components/orb-residential/orb-residential-error-boundary'
import { OrbSafetyModal } from '@/components/orb-residential/orb-safety-modal'
import { useOrbResidentialThemeLock } from '@/components/orb-residential/use-orb-residential-theme-lock'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'

function OrbResidentialExperienceInner() {
  const account = useOrbAccountState()
  useOrbResidentialThemeLock()

  const handleSafetyAccepted = useCallback(() => {
    void account.refresh()
  }, [account])

  const showSafetyModal = account.isSignedIn && account.safetyAccepted === false

  return (
    <div className="orb-residential-root min-h-[100dvh] bg-[var(--orb-bg,#05070d)] text-[var(--orb-foreground,#f7faff)]" data-orb-residential="true">
      <OrbResidentialErrorBoundary>
        <OrbCareCompanion residentialSurface />
      </OrbResidentialErrorBoundary>
      {showSafetyModal ? <OrbSafetyModal onAccepted={handleSafetyAccepted} /> : null}
    </div>
  )
}

export function OrbResidentialExperience() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-[#050b18] text-sm text-slate-400">
          Loading ORB…
        </div>
      }
    >
      <OrbResidentialExperienceInner />
    </Suspense>
  )
}
