'use client'

import { useEffect } from 'react'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { applyOrbDocumentTheme } from '@/lib/orb/orb-appearance'

/** Keeps html/body/shell data attributes aligned with resolved ORB Residential theme. */
export function useOrbResidentialThemeSync() {
  const { appearanceMode, resolvedTheme } = useOrbAppearance()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-orb-residential', '1')
    root.setAttribute('data-orb-appearance-mode', appearanceMode)
    root.setAttribute('data-orb-system-theme', resolvedTheme)
    root.setAttribute('data-orb-theme', resolvedTheme)
    root.style.colorScheme = resolvedTheme
    applyOrbDocumentTheme(resolvedTheme, appearanceMode)
    return () => {
      root.removeAttribute('data-orb-residential')
      root.removeAttribute('data-orb-appearance-mode')
      root.removeAttribute('data-orb-system-theme')
      root.removeAttribute('data-orb-theme')
      root.style.colorScheme = ''
    }
  }, [appearanceMode, resolvedTheme])
}

/** @deprecated Use `useOrbResidentialThemeSync`. */
export const useOrbResidentialThemeLock = useOrbResidentialThemeSync
