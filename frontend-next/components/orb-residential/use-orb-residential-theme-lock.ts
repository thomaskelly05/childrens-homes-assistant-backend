'use client'

import { useEffect } from 'react'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'

/** Locks ORB Residential to premium dark — html attribute + body class for scoped CSS. */
export function useOrbResidentialThemeLock() {
  const { setAppearanceMode } = useOrbAppearance()

  useEffect(() => {
    setAppearanceMode('dark')
    document.documentElement.setAttribute('data-orb-theme', 'dark')
    document.documentElement.setAttribute('data-orb-residential', '1')
    document.documentElement.style.colorScheme = 'dark'
    document.body.classList.add('orb-residential-root')
    return () => {
      document.documentElement.removeAttribute('data-orb-residential')
      document.documentElement.removeAttribute('data-orb-theme')
      document.documentElement.style.colorScheme = ''
      document.body.classList.remove('orb-residential-root')
    }
  }, [setAppearanceMode])
}
