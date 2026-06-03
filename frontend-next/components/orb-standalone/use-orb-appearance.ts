'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  ORB_APPEARANCE_STORAGE_KEY,
  applyOrbDocumentTheme,
  msUntilNextOrbSystemThemeBoundary,
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

    const sync = () => setResolvedTheme(resolveOrbTheme('system'))
    sync()

    const scheduleNext = () => {
      const delay = msUntilNextOrbSystemThemeBoundary()
      return window.setTimeout(() => {
        sync()
        timerId = scheduleNext()
      }, delay)
    }

    let timerId = scheduleNext()
    const minuteTick = window.setInterval(sync, 60_000)

    return () => {
      window.clearTimeout(timerId)
      window.clearInterval(minuteTick)
    }
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
