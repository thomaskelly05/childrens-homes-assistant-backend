'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  ORB_APPEARANCE_STORAGE_KEY,
  applyOrbDocumentTheme,
  readOrbAppearanceMode,
  resolveOrbTheme,
  writeOrbAppearanceMode,
  type OrbAppearanceMode
} from '@/lib/orb/orb-appearance'

function isOrbResidentialRoute(): boolean {
  if (typeof document === 'undefined') return false
  return (
    document.documentElement.getAttribute('data-orb-residential') === '1' ||
    document.querySelector('[data-orb-residential-surface="true"]') != null
  )
}

export function useOrbAppearance() {
  const residential = isOrbResidentialRoute()
  const [appearanceMode, setAppearanceModeState] = useState<OrbAppearanceMode>(() =>
    readOrbAppearanceMode({ residential })
  )
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveOrbTheme(readOrbAppearanceMode({ residential }))
  )

  useEffect(() => {
    const stored = readOrbAppearanceMode({ residential: isOrbResidentialRoute() })
    setAppearanceModeState(stored)
    setResolvedTheme(resolveOrbTheme(stored))
  }, [])

  useEffect(() => {
    if (appearanceMode !== 'system') {
      setResolvedTheme(resolveOrbTheme(appearanceMode))
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setResolvedTheme(media.matches ? 'dark' : 'light')
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [appearanceMode])

  useEffect(() => {
    applyOrbDocumentTheme(resolvedTheme, appearanceMode)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-orb-appearance-mode', appearanceMode)
      document.documentElement.setAttribute('data-orb-system-theme', resolvedTheme)
      if (isOrbResidentialRoute()) {
        document.documentElement.setAttribute('data-orb-residential', '1')
      }
    }
  }, [appearanceMode, resolvedTheme])

  const setAppearanceMode = useCallback((mode: OrbAppearanceMode) => {
    writeOrbAppearanceMode(mode)
    setAppearanceModeState(mode)
    setResolvedTheme(resolveOrbTheme(mode))
  }, [])

  return {
    appearanceMode,
    resolvedTheme,
    setAppearanceMode,
    storageKey: ORB_APPEARANCE_STORAGE_KEY,
    residentialThemeLocked: false
  }
}
