'use client'

export const ORB_SIDEBAR_COLLAPSED_KEY = 'orb-sidebar-collapsed'

export function readOrbSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ORB_SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeOrbSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false')
  } catch {
    // ignore quota / private mode
  }
}
