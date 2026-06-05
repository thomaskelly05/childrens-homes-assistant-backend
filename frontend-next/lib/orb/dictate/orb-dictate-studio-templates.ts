import type { OrbDictateMode } from '@/lib/orb/dictate/orb-dictate-speaker'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export type OrbDictateStudioTemplate = {
  id: string
  label: string
  noteType: OrbDictateNoteType
  mode?: OrbDictateMode
  description?: string
}

/** Primary template selector options visible at top of Dictate studio. */
export const ORB_DICTATE_STUDIO_TEMPLATES: readonly OrbDictateStudioTemplate[] = [
  { id: 'general', label: 'General Dictation', noteType: 'daily_record', mode: 'rough_note', description: 'Rough notes to professional wording' },
  { id: 'daily_record', label: 'Daily Record', noteType: 'daily_record', description: 'Shift events and presentation' },
  { id: 'incident', label: 'Incident Report', noteType: 'incident_record', description: 'Behaviour, injury or serious events' },
  { id: 'missing', label: 'Missing From Home', noteType: 'missing_episode_note', description: 'Missing and return conversation' },
  { id: 'safeguarding', label: 'Safeguarding Concern', noteType: 'safeguarding_concern_record', description: 'Concern with escalation' },
  { id: 'physical_intervention', label: 'Physical Intervention', noteType: 'incident_record', description: 'Restraint or physical intervention' },
  { id: 'keywork', label: 'Key Work Session', noteType: 'keywork_summary', description: 'Planned direct work session' },
  { id: 'manager', label: 'Manager Summary', noteType: 'manager_oversight_note', description: 'Manager review and actions' },
  { id: 'chronology', label: 'Chronology Entry', noteType: 'chronology_entry', description: 'Timeline sequence entry' }
] as const

export const ORB_DICTATE_SUGGESTED_OUTPUTS: readonly { id: string; label: string; noteType: OrbDictateNoteType }[] = [
  { id: 'daily', label: 'Create Daily Record', noteType: 'daily_record' },
  { id: 'incident', label: 'Create Incident Report', noteType: 'incident_record' },
  { id: 'missing', label: 'Create Missing From Home Record', noteType: 'missing_episode_note' },
  { id: 'safeguarding', label: 'Create Safeguarding Concern', noteType: 'safeguarding_concern_record' },
  { id: 'chronology', label: 'Create Chronology Entry', noteType: 'chronology_entry' },
  { id: 'handover', label: 'Create Handover', noteType: 'handover_note' },
  { id: 'manager', label: 'Create Manager Summary', noteType: 'manager_oversight_note' },
  { id: 'final', label: 'Create Final Document', noteType: 'daily_record' }
] as const

export function templateById(id: string): OrbDictateStudioTemplate | undefined {
  return ORB_DICTATE_STUDIO_TEMPLATES.find((t) => t.id === id)
}

export function templateLabelForNoteType(noteType: OrbDictateNoteType): string {
  const match = ORB_DICTATE_STUDIO_TEMPLATES.find((t) => t.noteType === noteType)
  return match?.label ?? noteType.replace(/_/g, ' ')
}
