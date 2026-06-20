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
  ORB_RESIDENTIAL_LOCKED_THEME,
  ORB_RESIDENTIAL_THEME_LOCK_COPY,
  msUntilNextOrbSystemThemeBoundary,
  readOrbAppearanceMode,
  resolveOrbResidentialTheme,
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
  residentialThemeLocked: boolean
  residentialThemeLockCopy: string
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
    residential ? resolveOrbResidentialTheme() : resolveOrbTheme(readOrbAppearanceMode({ residential: false }))
  )

  useEffect(() => {
    const onResidential = isOrbResidentialRoute()
    const stored = readOrbAppearanceMode({ residential: onResidential })
    setAppearanceModeState(stored)
    setResolvedTheme(onResidential ? resolveOrbResidentialTheme() : resolveOrbTheme(stored))
  }, [residential])

  useEffect(() => {
    if (residential || isOrbResidentialRoute()) {
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
  }, [appearanceMode, residential])

  useEffect(() => {
    const locked = residential || isOrbResidentialRoute()
    applyOrbResidentialTheme({
      selectedAppearance: locked ? ORB_RESIDENTIAL_LOCKED_THEME : appearanceMode,
      resolvedTheme: locked ? ORB_RESIDENTIAL_LOCKED_THEME : resolvedTheme
    })
  }, [appearanceMode, resolvedTheme, residential])

  const setAppearanceMode = useCallback(
    (mode: OrbAppearanceMode) => {
      const onResidential = residential || isOrbResidentialRoute()
      if (onResidential) return
      writeOrbAppearanceMode(mode)
      setAppearanceModeState(mode)
      setResolvedTheme(resolveOrbTheme(mode))
    },
    [residential]
  )

  const themeLocked = residential || isOrbResidentialRoute()

  const value = useMemo<OrbAppearanceContextValue>(
    () => ({
      appearanceMode: themeLocked ? ORB_RESIDENTIAL_LOCKED_THEME : appearanceMode,
      resolvedTheme: themeLocked ? ORB_RESIDENTIAL_LOCKED_THEME : resolvedTheme,
      setAppearanceMode,
      storageKey: ORB_APPEARANCE_STORAGE_KEY,
      residentialThemeLocked: themeLocked,
      residentialThemeLockCopy: ORB_RESIDENTIAL_THEME_LOCK_COPY
    }),
    [appearanceMode, resolvedTheme, setAppearanceMode, themeLocked]
  )

  return <OrbAppearanceContext.Provider value={value}>{children}</OrbAppearanceContext.Provider>
}

export function useOrbAppearanceContext(): OrbAppearanceContextValue | null {
  return useContext(OrbAppearanceContext)
}
