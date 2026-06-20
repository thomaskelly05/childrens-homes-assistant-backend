'use client'

import { useCallback, useEffect, useState } from 'react'

import { useOrbAppearanceContext } from '@/components/orb-standalone/orb-appearance-provider'
import {
  ORB_APPEARANCE_STORAGE_KEY,
  ORB_RESIDENTIAL_LOCKED_THEME,
  msUntilNextOrbSystemThemeBoundary,
  readOrbAppearanceMode,
  resolveOrbResidentialTheme,
  resolveOrbTheme,
  writeOrbAppearanceMode,
  type OrbAppearanceMode
} from '@/lib/orb/orb-appearance'
import { applyOrbResidentialTheme } from '@/lib/orb/orb-residential-theme'

function isOrbResidentialRoute(): boolean {
  if (typeof document === 'undefined') return false
  return (
    document.documentElement.getAttribute('data-orb-residential') === '1' ||
    document.querySelector('[data-orb-residential-surface="true"]') != null ||
    window.location.pathname.startsWith('/orb')
  )
}

function useOrbAppearanceStandalone(skip: boolean) {
  const residential = isOrbResidentialRoute()
  const [appearanceMode, setAppearanceModeState] = useState<OrbAppearanceMode>(() =>
    readOrbAppearanceMode({ residential })
  )
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    residential ? resolveOrbResidentialTheme() : resolveOrbTheme(readOrbAppearanceMode({ residential: false }))
  )

  useEffect(() => {
    if (skip) return
    const onResidential = isOrbResidentialRoute()
    const stored = readOrbAppearanceMode({ residential: onResidential })
    setAppearanceModeState(stored)
    setResolvedTheme(onResidential ? resolveOrbResidentialTheme() : resolveOrbTheme(stored))
  }, [skip])

  useEffect(() => {
    if (skip) return
    if (isOrbResidentialRoute()) {
      setResolvedTheme(resolveOrbResidentialTheme())
      return
    }

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
  }, [skip, appearanceMode])

  useEffect(() => {
    if (skip) return
    const onResidential = isOrbResidentialRoute()
    applyOrbResidentialTheme({
      selectedAppearance: onResidential ? ORB_RESIDENTIAL_LOCKED_THEME : appearanceMode,
      resolvedTheme: onResidential ? ORB_RESIDENTIAL_LOCKED_THEME : resolvedTheme
    })
  }, [skip, appearanceMode, resolvedTheme])

  const setAppearanceMode = useCallback(
    (mode: OrbAppearanceMode) => {
      if (skip || isOrbResidentialRoute()) return
      writeOrbAppearanceMode(mode)
      setAppearanceModeState(mode)
      setResolvedTheme(resolveOrbTheme(mode))
    },
    [skip]
  )

  const themeLocked = isOrbResidentialRoute()

  return {
    appearanceMode: themeLocked ? ORB_RESIDENTIAL_LOCKED_THEME : appearanceMode,
    resolvedTheme: themeLocked ? ORB_RESIDENTIAL_LOCKED_THEME : resolvedTheme,
    setAppearanceMode,
    storageKey: ORB_APPEARANCE_STORAGE_KEY,
    residentialThemeLocked: themeLocked
  }
}

/** Appearance hook — uses `OrbAppearanceProvider` on `/orb` when present. */
export function useOrbAppearance() {
  const context = useOrbAppearanceContext()
  const skipStandalone = context != null
  const standalone = useOrbAppearanceStandalone(skipStandalone)
  return context ?? standalone
}
