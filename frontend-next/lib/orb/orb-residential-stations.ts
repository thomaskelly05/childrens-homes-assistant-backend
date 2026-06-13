/**
 * Canonical ORB Residential station definitions — one source for Chat, Voice, Dictate and ORB Write.
 * Surfaces import taglines/helpers from here; do not duplicate mode copy in sidebars or panels.
 */

export type OrbResidentialStationId = 'chat' | 'orb_voice' | 'orb_dictate' | 'orb_write'

export type OrbResidentialStationDefinition = {
  id: OrbResidentialStationId
  label: string
  /** Concise product definition shown in panel subtitles and mobile tools. */
  tagline: string
  /** Slightly longer helper for sidebar and navigation chrome. */
  helper: string
}

export const ORB_RESIDENTIAL_STATION_DEFINITIONS: Record<
  OrbResidentialStationId,
  OrbResidentialStationDefinition
> = {
  chat: {
    id: 'chat',
    label: 'Chat',
    tagline: 'Ask, reflect and prepare.',
    helper: 'Ask, reflect and plan'
  },
  orb_voice: {
    id: 'orb_voice',
    label: 'Voice',
    tagline: 'Talk it through.',
    helper: 'Talk through situations with ORB'
  },
  orb_dictate: {
    id: 'orb_dictate',
    label: 'Dictate',
    tagline: 'Capture rough notes.',
    helper: 'Structure rough speech into records'
  },
  orb_write: {
    id: 'orb_write',
    label: 'ORB Write',
    tagline: 'Review and finalise.',
    helper: 'Edit, approve and export documents'
  }
}

export function orbResidentialStation(
  id: OrbResidentialStationId
): OrbResidentialStationDefinition {
  return ORB_RESIDENTIAL_STATION_DEFINITIONS[id]
}
