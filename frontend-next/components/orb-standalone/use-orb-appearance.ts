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
    applyOrbDocumentTheme(resolvedTheme)
    return () => {
      /* Keep bootstrap theme on unmount — residential shell may still be mounted. */
    }
  }, [resolvedTheme])

  const setAppearanceMode = useCallback((mode: OrbAppearanceMode) => {
    writeOrbAppearanceMode(mode)
    setAppearanceModeState(mode)
    setResolvedTheme(resolveOrbTheme(mode))
  }, [])

  return {
    appearanceMode,
    resolvedTheme,
    setAppearanceMode,
    storageKey: ORB_APPEARANCE_STORAGE_KEY
  }
}
