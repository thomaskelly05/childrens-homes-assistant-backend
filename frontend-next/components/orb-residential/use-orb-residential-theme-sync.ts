'use client'

import { useEffect } from 'react'

import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { applyOrbResidentialTheme } from '@/lib/orb/orb-residential-theme'

/**
 * Re-applies residential theme when this subtree mounts (login, front door, errors).
 * Does not strip document theme on unmount — `applyOrbResidentialTheme` is the authority.
 */
export function useOrbResidentialThemeSync() {
  const { appearanceMode, resolvedTheme } = useOrbAppearance()

  useEffect(() => {
    applyOrbResidentialTheme({ selectedAppearance: appearanceMode, resolvedTheme })
  }, [appearanceMode, resolvedTheme])
}

/** @deprecated Use `useOrbResidentialThemeSync`. */
export const useOrbResidentialThemeLock = useOrbResidentialThemeSync
