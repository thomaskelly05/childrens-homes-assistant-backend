'use client'

const STORAGE_KEY = 'orb-developer-mode'

/** When true, show internal reasoning / cognition debug UI. Off by default for ORB Residential. */
export function isOrbDeveloperMode(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NEXT_PUBLIC_ORB_DEVELOPER_MODE === '1') return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Residential calm chat — hide debug panels and action clutter unless developer mode is on. */
export function isOrbResidentialCalmActiveChat(residentialSurface: boolean): boolean {
  return residentialSurface && !isOrbDeveloperMode()
}

export function setOrbDeveloperMode(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
