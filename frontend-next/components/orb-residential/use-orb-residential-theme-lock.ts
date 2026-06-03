'use client'

import { useEffect } from 'react'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { applyOrbDocumentTheme } from '@/lib/orb/orb-appearance'
import { ORB_RESIDENTIAL_RESOLVED_THEME } from '@/lib/orb/orb-theme'

/** Locks ORB Residential to premium dark — appearance preference is stored but not applied yet. */
export function useOrbResidentialThemeLock() {
  const { appearanceMode } = useOrbAppearance()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-orb-residential', '1')
    root.setAttribute('data-orb-appearance-mode', appearanceMode)
    root.setAttribute('data-orb-system-theme', ORB_RESIDENTIAL_RESOLVED_THEME)
    root.setAttribute('data-orb-theme', ORB_RESIDENTIAL_RESOLVED_THEME)
    root.style.colorScheme = ORB_RESIDENTIAL_RESOLVED_THEME
    applyOrbDocumentTheme(ORB_RESIDENTIAL_RESOLVED_THEME, appearanceMode)
    return () => {
      root.removeAttribute('data-orb-residential')
      root.removeAttribute('data-orb-appearance-mode')
      root.removeAttribute('data-orb-system-theme')
      root.removeAttribute('data-orb-theme')
      root.style.colorScheme = ''
    }
  }, [appearanceMode])
}
