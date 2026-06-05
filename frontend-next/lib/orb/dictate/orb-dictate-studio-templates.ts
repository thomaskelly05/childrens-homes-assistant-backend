import type { OrbDictateMode } from '@/lib/orb/dictate/orb-dictate-speaker'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import {
  orbRecordingSuggestedOutputs,
  orbRecordingStudioTemplates,
  resolveOrbRecordingRecordType
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'

export type OrbDictateStudioTemplate = {
  id: string
  label: string
  noteType: OrbDictateNoteType
  recordTypeId: OrbRecordingRecordTypeId
  mode?: OrbDictateMode
  description?: string
}

/** Primary template selector options — derived from shared recording framework. */
export const ORB_DICTATE_STUDIO_TEMPLATES: readonly OrbDictateStudioTemplate[] =
  orbRecordingStudioTemplates().map((t) => ({
    id: t.id,
    label: t.label,
    noteType: t.noteType,
    recordTypeId: t.recordTypeId,
    mode: t.id === 'general' ? ('rough_note' as OrbDictateMode) : undefined,
    description: t.description
  }))

export function suggestedOutputsForRecordType(recordTypeId: string) {
  return orbRecordingSuggestedOutputs(recordTypeId)
}

/** @deprecated Use suggestedOutputsForRecordType — kept for import compatibility */
export const ORB_DICTATE_SUGGESTED_OUTPUTS = suggestedOutputsForRecordType('daily_record').map((o) => ({
  id: o.id,
  label: `Create ${o.label}`,
  noteType: o.dictate_note_type,
  recordTypeId: o.id
}))

export function templateById(id: string): OrbDictateStudioTemplate | undefined {
  return ORB_DICTATE_STUDIO_TEMPLATES.find((t) => t.id === id)
}

export function templateLabelForNoteType(noteType: OrbDictateNoteType): string {
  const match = ORB_DICTATE_STUDIO_TEMPLATES.find((t) => t.noteType === noteType)
  if (match) return match.label
  return resolveOrbRecordingRecordType({ noteType }).label
}

export function recordTypeIdForStudioTemplate(templateId: string): OrbRecordingRecordTypeId {
  return templateById(templateId)?.recordTypeId ?? resolveOrbRecordingRecordType({ studioTemplateId: templateId }).id
}
