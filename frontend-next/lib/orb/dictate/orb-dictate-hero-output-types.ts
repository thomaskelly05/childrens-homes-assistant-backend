import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

/** Residential record types surfaced as the primary Dictate hero flow. */
export const ORB_DICTATE_HERO_OUTPUT_TYPES: readonly OrbDictateNoteType[] = [
  'daily_record',
  'incident_record',
  'missing_episode_note',
  'keywork_summary',
  'handover_note',
  'staff_debrief',
  'supervision_reflection',
  'safeguarding_concern_record',
  'manager_oversight_note'
] as const

export const ORB_DICTATE_HERO_OUTPUT_HINTS: Partial<Record<OrbDictateNoteType, string>> = {
  daily_record: 'Shift events and presentation',
  incident_record: 'Behaviour, injury or serious events',
  missing_episode_note: 'Missing and return conversation',
  keywork_summary: 'Planned direct work session',
  handover_note: 'Safe shift handover',
  staff_debrief: 'Team reflection after events',
  supervision_reflection: 'Supervision and learning',
  safeguarding_concern_record: 'Concern with escalation',
  manager_oversight_note: 'Manager review and actions'
}

export function isHeroDictateOutputType(noteType: string): noteType is OrbDictateNoteType {
  return (ORB_DICTATE_HERO_OUTPUT_TYPES as readonly string[]).includes(noteType)
}
