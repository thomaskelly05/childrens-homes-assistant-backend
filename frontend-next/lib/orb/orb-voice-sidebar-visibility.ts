import {
  ORB_NAV_VOICE,
  ORB_NAV_VOICE_BETA_BADGE,
  ORB_NAV_VOICE_ACCESSIBLE_LABEL,
  ORB_VISIBLE_SIDEBAR_NAV
} from './orb-user-facing-names.ts'

/** Voice stays in canonical nav; hide from residential sidebar only when explicitly disabled. */
export function isOrbVoiceSidebarVisible(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ORB_VOICE_SIDEBAR_VISIBLE === '0') {
    return false
  }
  return true
}

/** Residential sidebar nav — filtered view of {@link ORB_VISIBLE_SIDEBAR_NAV}. */
export function getOrbResidentialVisibleSidebarNav() {
  if (isOrbVoiceSidebarVisible()) {
    return ORB_VISIBLE_SIDEBAR_NAV
  }
  return ORB_VISIBLE_SIDEBAR_NAV.filter((entry) => entry.id !== 'orb_voice')
}

export type OrbResidentialSidebarNavEntry = (typeof ORB_VISIBLE_SIDEBAR_NAV)[number] & {
  badge?: string
  accessibleLabel: string
}

export function enrichOrbResidentialSidebarNavEntry(
  entry: (typeof ORB_VISIBLE_SIDEBAR_NAV)[number]
): OrbResidentialSidebarNavEntry {
  if (entry.id === 'orb_voice') {
    return {
      ...entry,
      badge: ORB_NAV_VOICE_BETA_BADGE,
      accessibleLabel: ORB_NAV_VOICE_ACCESSIBLE_LABEL
    }
  }
  return {
    ...entry,
    accessibleLabel: entry.label
  }
}

export function buildOrbResidentialVisibleSidebarNav(): OrbResidentialSidebarNavEntry[] {
  return getOrbResidentialVisibleSidebarNav().map(enrichOrbResidentialSidebarNavEntry)
}

export { ORB_NAV_VOICE, ORB_NAV_VOICE_BETA_BADGE, ORB_NAV_VOICE_ACCESSIBLE_LABEL }
