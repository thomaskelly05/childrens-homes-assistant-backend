'use client'

import { useEffect } from 'react'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'

/** Marks ORB Residential surface for scoped CSS without overriding user appearance choice. */
export function useOrbResidentialThemeLock() {
  const { resolvedTheme } = useOrbAppearance()

  useEffect(() => {
    document.documentElement.setAttribute('data-orb-residential', '1')
    document.documentElement.style.colorScheme = resolvedTheme
    document.body.classList.add('orb-residential-root')
    return () => {
      document.documentElement.removeAttribute('data-orb-residential')
      document.documentElement.style.colorScheme = ''
      document.body.classList.remove('orb-residential-root')
    }
  }, [resolvedTheme])
}
