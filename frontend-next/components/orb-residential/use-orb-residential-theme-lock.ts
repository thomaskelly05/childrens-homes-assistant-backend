'use client'

import { useEffect } from 'react'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'

/** Marks ORB Residential surface for scoped CSS without forcing dark mode. */
export function useOrbResidentialThemeLock() {
  const { resolvedTheme, appearanceMode } = useOrbAppearance()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-orb-residential', '1')
    root.setAttribute('data-orb-appearance-mode', appearanceMode)
    root.setAttribute('data-orb-system-theme', resolvedTheme)
    root.style.colorScheme = resolvedTheme
    document.body.classList.add('orb-residential-root')
    return () => {
      root.removeAttribute('data-orb-residential')
      root.removeAttribute('data-orb-appearance-mode')
      root.removeAttribute('data-orb-system-theme')
      root.style.colorScheme = ''
      document.body.classList.remove('orb-residential-root')
    }
  }, [appearanceMode, resolvedTheme])
}
