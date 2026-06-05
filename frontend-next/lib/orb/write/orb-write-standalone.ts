import type { OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import type { OrbDictateGenerateResult, OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import {
  resolveOrbRecordingRecordType,
  structureOrbWriteDocumentBody
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import {
  ORB_WRITE_REVIEW_STATEMENT,
  type OrbWriteDocument,
  type OrbWriteDocumentVersion
} from '@/lib/orb/write/orb-write-types'

const LOCAL_DRAFT_KEY = 'orb-write-local-draft-v1'

export type OrbWriteLocalDraft = {
  title: string
  record_type: OrbDictateNoteType
  record_type_id: string
  body: string
  updated_at: string
  source: 'orb_write'
}

export function createOrbWriteDocumentFromGenerate(opts: {
  roughText: string
  recordType: OrbRecordingRecordType
  generateResult: OrbDictateGenerateResult
  acceptedSuggestions?: OrbDictateBrainSuggestion[]
  analysisSummary?: string
}): OrbWriteDocument {
  const now = new Date().toISOString()
  const missingNotes = (opts.acceptedSuggestions ?? [])
    .filter((s) => s.category === 'missing' && (s.status === 'accepted' || s.status === 'applied'))
    .map((s) => s.detail)
  const body = structureOrbWriteDocumentBody({
    recordType: opts.recordType,
    body: opts.generateResult.professional_note,
    missingNotes: missingNotes.length ? missingNotes : undefined
  })
  const version: OrbWriteDocumentVersion = {
    id: 'v_generated',
    label: 'Generated draft',
    body,
    created_at: now,
    event: 'generated'
  }
  return {
    id: `write_${Date.now()}`,
    title: opts.generateResult.title || opts.recordType.label,
    record_type: opts.recordType.dictate_note_type,
    record_type_id: opts.recordType.id,
    record_type_label: opts.recordType.label,
    document_headings: opts.recordType.pdf_heading_order,
    body,
    transcript: opts.roughText,
    template_id: opts.recordType.studio_template_id ?? 'general',
    summary: opts.generateResult.summary || opts.analysisSummary || '',
    quality_checks: opts.generateResult.quality_checks,
    accepted_suggestions: opts.acceptedSuggestions ?? [],
    participants: [],
    segments: [],
    review_required_statement: ORB_WRITE_REVIEW_STATEMENT,
    created_at: now,
    updated_at: now,
    versions: [version],
    word_count: body.trim().split(/\s+/).filter(Boolean).length,
    is_draft: true,
    is_finalised: false
  }
}

export function createOrbWriteDocumentFromSavedDraft(draft: OrbWriteLocalDraft): OrbWriteDocument {
  const recordType = resolveOrbRecordingRecordType({
    recordTypeId: draft.record_type_id,
    noteType: draft.record_type
  })
  const now = draft.updated_at || new Date().toISOString()
  const version: OrbWriteDocumentVersion = {
    id: 'v_restored',
    label: 'Restored draft',
    body: draft.body,
    created_at: now,
    event: 'restored'
  }
  return {
    id: `write_${Date.now()}`,
    title: draft.title || recordType.label,
    record_type: draft.record_type,
    record_type_id: recordType.id,
    record_type_label: recordType.label,
    document_headings: recordType.pdf_heading_order,
    body: draft.body,
    transcript: '',
    template_id: recordType.studio_template_id ?? 'general',
    summary: '',
    quality_checks: {
      child_voice: 'review',
      safeguarding: 'review',
      manager_oversight: 'missing',
      impact: 'weak',
      recording_quality: 'needs_review'
    },
    accepted_suggestions: [],
    participants: [],
    segments: [],
    review_required_statement: ORB_WRITE_REVIEW_STATEMENT,
    created_at: now,
    updated_at: now,
    versions: [version],
    word_count: draft.body.trim().split(/\s+/).filter(Boolean).length,
    is_draft: true,
    is_finalised: false
  }
}

export function saveOrbWriteLocalDraft(doc: OrbWriteDocument): void {
  if (typeof window === 'undefined') return
  const draft: OrbWriteLocalDraft = {
    title: doc.title,
    record_type: doc.record_type,
    record_type_id: doc.record_type_id ?? resolveOrbRecordingRecordType({ noteType: doc.record_type }).id,
    body: doc.body,
    updated_at: new Date().toISOString(),
    source: 'orb_write'
  }
  try {
    window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota */
  }
}

export function loadOrbWriteLocalDraft(): OrbWriteLocalDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrbWriteLocalDraft
  } catch {
    return null
  }
}

export function hasOrbWriteLocalDraft(): boolean {
  return Boolean(loadOrbWriteLocalDraft())
}

/** Blank structured document from ORB Recording Framework — no Dictate handoff required. */
export function createBlankOrbWriteDocumentFromRecordType(
  recordType: OrbRecordingRecordType
): OrbWriteDocument {
  const now = new Date().toISOString()
  const body = structureOrbWriteDocumentBody({ recordType, body: '' })
  const version: OrbWriteDocumentVersion = {
    id: 'v_blank_template',
    label: 'Structured template',
    body,
    created_at: now,
    event: 'generated'
  }
  return {
    id: `write_${Date.now()}`,
    title: recordType.label,
    record_type: recordType.dictate_note_type,
    record_type_id: recordType.id,
    record_type_label: recordType.label,
    document_headings: recordType.pdf_heading_order,
    body,
    transcript: '',
    template_id: recordType.studio_template_id ?? 'general',
    summary: '',
    quality_checks: {
      child_voice: 'review',
      safeguarding: 'review',
      manager_oversight: 'missing',
      impact: 'weak',
      recording_quality: 'needs_review'
    },
    accepted_suggestions: [],
    participants: [],
    segments: [],
    review_required_statement: ORB_WRITE_REVIEW_STATEMENT,
    created_at: now,
    updated_at: now,
    versions: [version],
    word_count: 0,
    is_draft: true,
    is_finalised: false
  }
}
