/**
 * Canonical ORB Residential station definitions — one source for Chat, Voice, Dictate and ORB Write.
 * Surfaces import taglines/helpers from here; do not duplicate mode copy in sidebars or panels.
 */

import { ORB_DICTATE_SUBTITLE } from './orb-user-facing-names.ts'

export type OrbResidentialStationId =
  | 'chat'
  | 'orb_voice'
  | 'orb_dictate'
  | 'orb_communicate'
  | 'orb_write'

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
    tagline: 'Think it through.',
    helper: 'Think through situations before you write'
  },
  orb_voice: {
    id: 'orb_voice',
    label: 'Voice',
    tagline: 'Talk it through with ORB before you write.',
    helper: 'Talk through situations with ORB before you write'
  },
  orb_dictate: {
    id: 'orb_dictate',
    label: 'Dictate',
    tagline: ORB_DICTATE_SUBTITLE,
    helper: 'Capture rough notes, audio or voice memos for safer drafts'
  },
  orb_communicate: {
    id: 'orb_communicate',
    label: 'Communicate',
    tagline: 'Accessible explanations, visual supports and evidence of voice.',
    helper: 'Easy read, visual supports, social stories and recording prompts'
  },
  orb_write: {
    id: 'orb_write',
    label: 'ORB Write',
    tagline: 'Care documentation studio.',
    helper: 'Draft, review and finalise adult-led records'
  }
}

export function orbResidentialStation(
  id: OrbResidentialStationId
): OrbResidentialStationDefinition {
  return ORB_RESIDENTIAL_STATION_DEFINITIONS[id]
}
