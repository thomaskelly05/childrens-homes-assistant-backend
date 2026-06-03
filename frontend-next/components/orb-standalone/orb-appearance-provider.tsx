'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

import {
  ORB_APPEARANCE_STORAGE_KEY,
  msUntilNextOrbSystemThemeBoundary,
  readOrbAppearanceMode,
  resolveOrbTheme,
  writeOrbAppearanceMode,
  type OrbAppearanceMode
} from '@/lib/orb/orb-appearance'
import { applyOrbResidentialTheme } from '@/lib/orb/orb-residential-theme'

export type OrbAppearanceContextValue = {
  appearanceMode: OrbAppearanceMode
  resolvedTheme: 'light' | 'dark'
  setAppearanceMode: (mode: OrbAppearanceMode) => void
  storageKey: string
  residentialThemeLocked: false
}

const OrbAppearanceContext = createContext<OrbAppearanceContextValue | null>(null)

function isOrbResidentialRoute(): boolean {
  if (typeof document === 'undefined') return true
  return (
    document.documentElement.getAttribute('data-orb-residential') === '1' ||
    document.querySelector('[data-orb-residential-surface="true"]') != null ||
    window.location.pathname.startsWith('/orb')
  )
}

export function OrbAppearanceProvider({
  children,
  residential = true
}: {
  children: ReactNode
  residential?: boolean
}) {
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
  }, [residential])

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
    applyOrbResidentialTheme({ selectedAppearance: appearanceMode, resolvedTheme })
  }, [appearanceMode, resolvedTheme])

  const setAppearanceMode = useCallback((mode: OrbAppearanceMode) => {
    writeOrbAppearanceMode(mode)
    setAppearanceModeState(mode)
    setResolvedTheme(resolveOrbTheme(mode))
  }, [])

  const value = useMemo<OrbAppearanceContextValue>(
    () => ({
      appearanceMode,
      resolvedTheme,
      setAppearanceMode,
      storageKey: ORB_APPEARANCE_STORAGE_KEY,
      residentialThemeLocked: false
    }),
    [appearanceMode, resolvedTheme, setAppearanceMode]
  )

  return <OrbAppearanceContext.Provider value={value}>{children}</OrbAppearanceContext.Provider>
}

export function useOrbAppearanceContext(): OrbAppearanceContextValue | null {
  return useContext(OrbAppearanceContext)
}
