'use client'

export const ORB_DICTATE_FOCUS_MODE_KEY = 'orb-dictate-focus-mode-v1'

export function readOrbDictateFocusMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ORB_DICTATE_FOCUS_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeOrbDictateFocusMode(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_DICTATE_FOCUS_MODE_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore quota / private mode
  }
}
