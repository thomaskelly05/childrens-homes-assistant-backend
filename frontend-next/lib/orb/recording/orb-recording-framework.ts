/**
 * ORB Residential recording framework — single frontend source for record types.
 * JSON: `orb-recording-framework.json`. Supplements: `orb-therapeutic-writing.ts`, `orb-recording-section-prompts.ts`.
 * Backend mirror: `assistant/knowledge/orb_recording_framework.json` + `services/orb_recording_framework_service.py`.
 */

import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import {
  buildSectionPromptBody,
  ORB_PRIMARY_RECORD_TYPE_IDS,
  ORB_REFLECTIVE_CAPTURE_PROMPTS,
  ORB_RESIDENTIAL_RECORDING_STRUCTURE,
  ORB_STRUCTURED_FORMAT_RULES,
  ORB_THERAPEUTIC_RECORDING_PRINCIPLES,
  sectionPromptsForRecordType
} from '@/lib/orb/recording/orb-recording-section-prompts'
import {
  buildTherapeuticWritingPromptBlock,
  structuredFormatHintForRecordType,
  therapeuticWritingForRecordType
} from '@/lib/orb/recording/orb-therapeutic-writing'
import type {
  OrbRecordingBrainFrameworkContext,
  OrbRecordingFrameworkPayload,
  OrbRecordingRecordType,
  OrbRecordingRecordTypeId,
  OrbRecordingSuggestedOutput
} from '@/lib/orb/recording/orb-recording-types'

import frameworkData from '@/lib/orb/recording/orb-recording-framework.json'

const payload = frameworkData as OrbRecordingFrameworkPayload

export const ORB_RECORDING_FRAMEWORK_VERSION = payload.version

function mergeTherapeuticWriting(recordTypes: OrbRecordingRecordType[]): OrbRecordingRecordType[] {
  return recordTypes.map((row) => {
    const supplement = therapeuticWritingForRecordType(row.id)
    if (!supplement) return row
    return { ...row, writing_framework: supplement }
  })
}

export const ORB_RECORDING_RECORD_TYPES: readonly OrbRecordingRecordType[] = mergeTherapeuticWriting(
  payload.record_types
)

import { ORB_RECOMMENDED_RECORD_TYPE_IDS } from '@/lib/orb/orb-navigation-convergence'

export { ORB_RECOMMENDED_RECORD_TYPE_IDS, ORB_PRIMARY_RECORD_TYPE_IDS, ORB_THERAPEUTIC_RECORDING_PRINCIPLES, ORB_RESIDENTIAL_RECORDING_STRUCTURE, ORB_REFLECTIVE_CAPTURE_PROMPTS, ORB_STRUCTURED_FORMAT_RULES }

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
  const wf = recordType.writing_framework
  const therapeuticChecks = wf?.quality_checks?.slice(0, 3) ?? []
  const safeguardingChecks = [
    ...(recordType.safeguarding_checks ?? []).slice(0, 2),
    ...(wf?.safeguarding_checks ?? []).slice(0, 2)
  ]
  const seen = new Set<string>()
  const dedupedSafeguarding = safeguardingChecks.filter((check) => {
    const key = check.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return {
    record_type_id: recordType.id,
    record_type_label: recordType.label,
    required_sections: recordType.required_sections,
    orb_will_check: [
      ...orbRecordingChecksSummary(recordType),
      ...therapeuticChecks,
      ...dedupedSafeguarding.slice(0, 2)
    ].slice(0, 8),
    missing_evidence_checks: recordType.missing_evidence_checks,
    safeguarding_checks: dedupedSafeguarding,
    child_voice_checks: recordType.child_voice_checks,
    manager_oversight_checks: recordType.manager_oversight_checks,
    suggested_outputs: orbRecordingSuggestedOutputs(recordType.id),
    suggested_follow_up_actions: recordType.suggested_follow_up_actions,
    recording_quality_guidance: wf?.writing_guidance ?? recordType.professional_language_guidance
  }
}

/** Full prompt block for Chat, Dictate, Write and Voice — same residential brain. */
export function buildOrbRecordingBrainPromptBlock(recordType: OrbRecordingRecordType): string {
  const context = buildOrbRecordingBrainContext(recordType)
  const formatHint = structuredFormatHintForRecordType(recordType.id)
  const lines = [
    `Record type: ${context.record_type_label} (${context.record_type_id})`,
    '',
    'Residential recording structure (use flexibly):',
    ...ORB_RESIDENTIAL_RECORDING_STRUCTURE.map((step) => `• ${step}`),
    '',
    'Residential recording principles:',
    ...ORB_THERAPEUTIC_RECORDING_PRINCIPLES.map((principle) => `• ${principle}`),
    '',
    'ORB will check:',
    ...context.orb_will_check.map((check) => `• ${check}`),
    '',
    buildTherapeuticWritingPromptBlock(recordType.id),
    '',
    `Structured format preference: ${formatHint}`,
    ...ORB_STRUCTURED_FORMAT_RULES.map((rule) => `• ${rule}`),
    '',
    'Required sections:',
    ...context.required_sections.map((section) => `• ${section}`)
  ]
  return lines.join('\n').trim()
}

/** Template groups for ORB Write template picker — mirrors recording framework categories. */
export const ORB_WRITE_TEMPLATE_PICKER_GROUPS: Array<{
  id: string
  label: string
  categories: string[]
}> = [
  { id: 'recording', label: 'Recording', categories: ['recording', 'therapeutic', 'education', 'health'] },
  { id: 'safeguarding', label: 'Safeguarding', categories: ['safeguarding'] },
  { id: 'management', label: 'Management', categories: ['leadership', 'care_planning', 'multi_agency'] },
  { id: 'guidance', label: 'Guidance / policy', categories: ['regulatory'] },
  { id: 'briefings', label: 'Briefings / summaries', categories: ['leadership', 'regulatory', 'multi_agency'] }
]

export function orbWriteTemplatePickerRecordTypes(search = ''): OrbRecordingRecordType[] {
  const needle = search.trim().toLowerCase()
  return ORB_RECORDING_RECORD_TYPES.filter((r) => {
    if (!needle) return true
    const hay = `${r.label} ${r.purpose} ${r.when_to_use} ${r.category}`.toLowerCase()
    return hay.includes(needle)
  })
}

export function buildOrbWriteTemplateSectionBody(
  recordType: OrbRecordingRecordType,
  template?: { sections?: Array<{ title: string; prompts?: string[]; required?: boolean }> }
): string {
  const frameworkBody = buildSectionPromptBody(recordType.id)
  if (frameworkBody && !template?.sections?.length) return frameworkBody

  const sections = template?.sections
  if (sections?.length) {
    return sections
      .map((section) => {
        const prompt =
          section.prompts?.[0] ?? `Add ${section.title.toLowerCase()} from your notes.`
        return `## ${section.title}\n\n*${prompt}*\n`
      })
      .join('\n')
      .trim()
  }
  return structureOrbWriteDocumentBody({ recordType, body: '' })
}

export function structureOrbWriteDocumentBody(opts: {
  recordType: OrbRecordingRecordType
  body: string
  missingNotes?: string[]
}): string {
  const body = opts.body.trim()
  if (/^##\s+/m.test(body)) return body

  const sectionPrompts = sectionPromptsForRecordType(opts.recordType.id)
  const headings = opts.recordType.final_document_headings
  let structured = headings
    .map((h) => {
      const prompt = sectionPrompts?.find((s) => s.title === h)?.prompt
      return prompt ? `## ${h}\n\n*${prompt}*\n` : `## ${h}\n\n`
    })
    .join('')
    .trimEnd()
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
