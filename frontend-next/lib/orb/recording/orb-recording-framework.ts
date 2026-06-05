import frameworkData from '@/lib/orb/recording/orb-recording-framework.json'

import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import type {
  OrbRecordingBrainFrameworkContext,
  OrbRecordingFrameworkPayload,
  OrbRecordingRecordType,
  OrbRecordingRecordTypeId,
  OrbRecordingSuggestedOutput
} from '@/lib/orb/recording/orb-recording-types'

const payload = frameworkData as OrbRecordingFrameworkPayload

export const ORB_RECORDING_FRAMEWORK_VERSION = payload.version

export const ORB_RECORDING_RECORD_TYPES: readonly OrbRecordingRecordType[] = payload.record_types

import { ORB_RECOMMENDED_RECORD_TYPE_IDS } from '@/lib/orb/orb-navigation-convergence'

export { ORB_RECOMMENDED_RECORD_TYPE_IDS }

export function isRecommendedRecordingType(id: string): boolean {
  return (ORB_RECOMMENDED_RECORD_TYPE_IDS as readonly string[]).includes(id)
}

export function getOrbRecordingRecordType(
  id: OrbRecordingRecordTypeId | string
): OrbRecordingRecordType | undefined {
  return ORB_RECORDING_RECORD_TYPES.find((r) => r.id === id)
}

export function getOrbRecordingRecordTypeByStudioId(
  studioTemplateId: string
): OrbRecordingRecordType | undefined {
  return ORB_RECORDING_RECORD_TYPES.find((r) => r.studio_template_id === studioTemplateId)
}

export function getOrbRecordingRecordTypeByNoteType(
  noteType: OrbDictateNoteType
): OrbRecordingRecordType | undefined {
  const withStudio = ORB_RECORDING_RECORD_TYPES.find(
    (r) => r.dictate_note_type === noteType && r.studio_template_id
  )
  if (withStudio) return withStudio
  return ORB_RECORDING_RECORD_TYPES.find((r) => r.dictate_note_type === noteType)
}

export function resolveOrbRecordingRecordType(opts: {
  recordTypeId?: string | null
  studioTemplateId?: string | null
  noteType?: OrbDictateNoteType | null
}): OrbRecordingRecordType {
  if (opts.recordTypeId) {
    const found = getOrbRecordingRecordType(opts.recordTypeId)
    if (found) return found
  }
  if (opts.studioTemplateId) {
    const found = getOrbRecordingRecordTypeByStudioId(opts.studioTemplateId)
    if (found) return found
  }
  if (opts.noteType) {
    const found = getOrbRecordingRecordTypeByNoteType(opts.noteType)
    if (found) return found
  }
  return getOrbRecordingRecordType('general_dictation') ?? ORB_RECORDING_RECORD_TYPES[0]
}

export function orbRecordingChecksSummary(recordType: OrbRecordingRecordType): string[] {
  const checks = [
    ...recordType.missing_evidence_checks.slice(0, 4),
    ...recordType.safeguarding_checks.slice(0, 2),
    ...recordType.manager_oversight_checks.slice(0, 1)
  ]
  const seen = new Set<string>()
  return checks.filter((c) => {
    const key = c.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function orbRecordingSuggestedOutputs(
  recordTypeId: OrbRecordingRecordTypeId | string
): OrbRecordingSuggestedOutput[] {
  const record = resolveOrbRecordingRecordType({ recordTypeId })
  return record.suggested_outputs
    .map((id) => getOrbRecordingRecordType(id))
    .filter((r): r is OrbRecordingRecordType => Boolean(r))
    .map((r) => ({
      id: r.id,
      label: r.label,
      dictate_note_type: r.dictate_note_type
    }))
}

export function orbRecordingStudioTemplates(): Array<{
  id: string
  label: string
  noteType: OrbDictateNoteType
  recordTypeId: OrbRecordingRecordTypeId
  description: string
}> {
  return ORB_RECORDING_RECORD_TYPES.filter((r) => r.studio_template_id).map((r) => ({
    id: r.studio_template_id as string,
    label: r.label,
    noteType: r.dictate_note_type,
    recordTypeId: r.id,
    description: r.purpose
  }))
}

export function buildOrbRecordingBrainContext(
  recordType: OrbRecordingRecordType
): OrbRecordingBrainFrameworkContext {
  return {
    record_type_id: recordType.id,
    record_type_label: recordType.label,
    required_sections: recordType.required_sections,
    orb_will_check: orbRecordingChecksSummary(recordType),
    missing_evidence_checks: recordType.missing_evidence_checks,
    safeguarding_checks: recordType.safeguarding_checks,
    child_voice_checks: recordType.child_voice_checks,
    manager_oversight_checks: recordType.manager_oversight_checks,
    suggested_outputs: orbRecordingSuggestedOutputs(recordType.id),
    suggested_follow_up_actions: recordType.suggested_follow_up_actions,
    recording_quality_guidance: recordType.professional_language_guidance
  }
}

export function structureOrbWriteDocumentBody(opts: {
  recordType: OrbRecordingRecordType
  body: string
  missingNotes?: string[]
}): string {
  const body = opts.body.trim()
  if (/^##\s+/m.test(body)) return body

  const headings = opts.recordType.final_document_headings
  let structured = headings.map((h) => `## ${h}\n\n`).join('').trimEnd()
  if (body) {
    structured += `\n\n---\n\n${body}`
  }
  if (opts.missingNotes?.length) {
    structured += `\n\n## Recording gaps to review\n\n${opts.missingNotes.map((n) => `- ${n}`).join('\n')}`
  }
  return structured
}

export function matchOrbRecordingTypesForDocument(text: string, limit = 6): OrbRecordingRecordType[] {
  const lowered = text.toLowerCase()
  const keywords: Record<string, string[]> = {
    missing_from_home_record: ['missing', 'absent', 'return conversation', 'exploitation'],
    safeguarding_concern: ['safeguarding', 'harm', 'neglect', 'dsl'],
    physical_intervention: ['restraint', 'physical intervention', 'hold'],
    incident_report: ['incident', 'behaviour', 'injury'],
    reg_44_evidence_summary: ['reg 44', 'reg44', 'independent visitor'],
    reg_45_reflection: ['reg 45', 'reg45', 'quality of care'],
    education_school_refusal: ['school', 'education', 'attendance', 'pep'],
    health_medication_note: ['medication', 'health', 'mar'],
    family_contact_record: ['contact', 'family time'],
    risk_assessment_update: ['risk assessment'],
    care_plan_update: ['care plan', 'lac review']
  }

  const scored = ORB_RECORDING_RECORD_TYPES.map((row) => {
    let score = 0
    for (const kw of keywords[row.id] ?? []) {
      if (lowered.includes(kw)) score += 2
    }
    if (lowered.includes(row.label.toLowerCase())) score += 3
    return { score, row }
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((item) => item.row)
}

export function orbRecordingCategories(): string[] {
  const cats = new Set(ORB_RECORDING_RECORD_TYPES.map((r) => r.category))
  return Array.from(cats).sort()
}
