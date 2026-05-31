'use client'

export const ORB_SIDEBAR_PROJECTS_COLLAPSED_KEY = 'orb-sidebar-projects-collapsed'
export const ORB_SIDEBAR_RECENTS_COLLAPSED_KEY = 'orb-sidebar-recents-collapsed'
export const ORB_SIDEBAR_APPS_COLLAPSED_KEY = 'orb-sidebar-apps-collapsed'
export const ORB_SIDEBAR_ACCOUNT_COLLAPSED_KEY = 'orb-sidebar-account-collapsed'

export type OrbSidebarSectionKey =
  | 'projects'
  | 'recents'
  | 'apps'
  | 'account'

const KEY_BY_SECTION: Record<OrbSidebarSectionKey, string> = {
  projects: ORB_SIDEBAR_PROJECTS_COLLAPSED_KEY,
  recents: ORB_SIDEBAR_RECENTS_COLLAPSED_KEY,
  apps: ORB_SIDEBAR_APPS_COLLAPSED_KEY,
  account: ORB_SIDEBAR_ACCOUNT_COLLAPSED_KEY
}

/** Default expanded except account (compact). */
export function defaultOrbSidebarSectionCollapsed(section: OrbSidebarSectionKey): boolean {
  return section === 'account'
}

export function readOrbSidebarSectionCollapsed(section: OrbSidebarSectionKey): boolean {
  if (typeof window === 'undefined') return defaultOrbSidebarSectionCollapsed(section)
  try {
    const raw = window.localStorage.getItem(KEY_BY_SECTION[section])
    if (raw === null) return defaultOrbSidebarSectionCollapsed(section)
    return raw === 'true'
  } catch {
    return defaultOrbSidebarSectionCollapsed(section)
  }
}

export function writeOrbSidebarSectionCollapsed(section: OrbSidebarSectionKey, collapsed: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY_BY_SECTION[section], collapsed ? 'true' : 'false')
  } catch {
    // ignore
  }
}
