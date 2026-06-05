import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

/** Residential record types surfaced as the primary Dictate hero flow. */
export const ORB_DICTATE_HERO_OUTPUT_TYPES: readonly OrbDictateNoteType[] = [
  'daily_record',
  'incident_record',
  'missing_episode_note',
  'safeguarding_concern_record',
  'chronology_entry',
  'handover_note',
  'manager_oversight_note',
  'action_plan'
] as const

export const ORB_DICTATE_HERO_OUTPUT_HINTS: Partial<Record<OrbDictateNoteType, string>> = {
  daily_record: 'Shift events and presentation',
  incident_record: 'Behaviour, injury or serious events',
  missing_episode_note: 'Missing and return conversation',
  handover_note: 'Safe shift handover',
  safeguarding_concern_record: 'Concern with escalation',
  chronology_entry: 'Safeguarding file chronology',
  manager_oversight_note: 'Manager review and actions',
  action_plan: 'Follow-up actions and owners'
}

export function isHeroDictateOutputType(noteType: string): noteType is OrbDictateNoteType {
  return (ORB_DICTATE_HERO_OUTPUT_TYPES as readonly string[]).includes(noteType)
}
