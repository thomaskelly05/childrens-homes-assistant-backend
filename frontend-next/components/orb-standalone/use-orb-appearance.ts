'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  ORB_APPEARANCE_STORAGE_KEY,
  applyOrbDocumentTheme,
  clearOrbDocumentTheme,
  readOrbAppearanceMode,
  resolveOrbTheme,
  writeOrbAppearanceMode,
  type OrbAppearanceMode
} from '@/lib/orb/orb-appearance'
import { ORB_RESIDENTIAL_RESOLVED_THEME } from '@/lib/orb/orb-theme'

function isOrbResidentialRoute(): boolean {
  if (typeof document === 'undefined') return false
  return (
    document.documentElement.getAttribute('data-orb-residential') === '1' ||
    document.querySelector('[data-orb-residential-surface="true"]') != null
  )
}

export function useOrbAppearance() {
  const [appearanceMode, setAppearanceModeState] = useState<OrbAppearanceMode>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = readOrbAppearanceMode()
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
    const themeForDocument = isOrbResidentialRoute() ? ORB_RESIDENTIAL_RESOLVED_THEME : resolvedTheme
    applyOrbDocumentTheme(themeForDocument, appearanceMode)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-orb-appearance-mode', appearanceMode)
      document.documentElement.setAttribute('data-orb-system-theme', themeForDocument)
    }
    return () => {
      /* Keep bootstrap theme on unmount — residential shell may still be mounted. */
    }
  }, [appearanceMode, resolvedTheme])

  const setAppearanceMode = useCallback((mode: OrbAppearanceMode) => {
    writeOrbAppearanceMode(mode)
    setAppearanceModeState(mode)
    setResolvedTheme(resolveOrbTheme(mode))
  }, [])

  const residentialLocked = isOrbResidentialRoute()
  const effectiveResolvedTheme = residentialLocked ? ORB_RESIDENTIAL_RESOLVED_THEME : resolvedTheme

  return {
    appearanceMode,
    resolvedTheme: effectiveResolvedTheme,
    setAppearanceMode,
    storageKey: ORB_APPEARANCE_STORAGE_KEY,
    residentialThemeLocked: residentialLocked
  }
}
