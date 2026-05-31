'use client'

import { Suspense, useCallback, useEffect } from 'react'

import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'
import { OrbSafetyModal } from '@/components/orb-residential/orb-safety-modal'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'

function OrbResidentialExperienceInner() {
  const account = useOrbAccountState()
  const { setAppearanceMode } = useOrbAppearance()

  useEffect(() => {
    setAppearanceMode('dark')
    document.documentElement.setAttribute('data-orb-theme', 'dark')
    document.documentElement.setAttribute('data-orb-residential', '1')
    document.body.classList.add('orb-residential-root')
    return () => {
      document.documentElement.removeAttribute('data-orb-residential')
      document.documentElement.removeAttribute('data-orb-theme')
      document.body.classList.remove('orb-residential-root')
    }
  }, [setAppearanceMode])

  const handleSafetyAccepted = useCallback(() => {
    void account.refresh()
  }, [account])

  const showSafetyModal = account.isSignedIn && account.safetyAccepted === false

  return (
    <div className="orb-residential-root min-h-[100dvh] bg-[#05070d] text-[#f7faff]" data-orb-residential="true">
      <OrbCareCompanion residentialSurface />
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
