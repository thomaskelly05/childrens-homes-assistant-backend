'use client'

import { useEffect, useState } from 'react'

const MOBILE_MAX_WIDTH_PX = 768

function readIsMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_MAX_WIDTH_PX
}

/**
 * True when viewport width is below the md breakpoint (768px).
 * Defaults to false during SSR and first paint to avoid hydration mismatch.
 */
export function useOrbMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const sync = () => setIsMobile(readIsMobileViewport())
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  return isMobile
}
