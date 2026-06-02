'use client'

import { useEffect, useState } from 'react'

const MOBILE_MAX_WIDTH_PX = 768
const TABLET_MAX_WIDTH_PX = 1024

function readViewportWidth(): number {
  if (typeof window === 'undefined') return TABLET_MAX_WIDTH_PX + 1
  return window.innerWidth
}

export type OrbResponsiveMode = 'mobile' | 'desktop'

export type OrbResponsiveSnapshot = {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  mode: OrbResponsiveMode
}

function snapshotFromWidth(width: number): OrbResponsiveSnapshot {
  const isMobile = width < MOBILE_MAX_WIDTH_PX
  const isTablet = width >= MOBILE_MAX_WIDTH_PX && width < TABLET_MAX_WIDTH_PX
  const isDesktop = width >= TABLET_MAX_WIDTH_PX
  return {
    isMobile,
    isTablet,
    isDesktop,
    mode: isMobile ? 'mobile' : 'desktop'
  }
}

/**
 * Runtime mobile/desktop branch for ORB app panels — mount one interactive branch only.
 * Defaults to desktop during SSR/first paint to avoid hydration mismatch with CSS-only hides.
 */
export function useOrbResponsiveMode(): OrbResponsiveSnapshot {
  const [snapshot, setSnapshot] = useState<OrbResponsiveSnapshot>(() =>
    snapshotFromWidth(readViewportWidth())
  )

  useEffect(() => {
    const sync = () => setSnapshot(snapshotFromWidth(window.innerWidth))
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  return snapshot
}

/** @deprecated Use useOrbResponsiveMode().isMobile */
export function useOrbMobileViewport(): boolean {
  return useOrbResponsiveMode().isMobile
}
