import type { OrbDictateGenerateResult, OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import type { OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'
import {
  resolveOrbRecordingRecordType,
  structureOrbWriteDocumentBody
} from '@/lib/orb/recording/orb-recording-framework'
import {
  ORB_WRITE_REVIEW_STATEMENT,
  type OrbWriteDocument,
  type OrbWriteDocumentVersion
} from '@/lib/orb/write/orb-write-types'

const HANDOFF_KEY = 'orb-write-session-handoff-v1'

export type OrbWriteHandoffPayload = {
  transcript: string
  template_id: string
  note_type: OrbDictateNoteType
  record_type_id?: string
  brain_analysis_summary?: string
  accepted_suggestions: OrbDictateBrainSuggestion[]
  adult_edits?: string
  timestamp: string
  generate_result?: OrbDictateGenerateResult
  participants: OrbDictateParticipant[]
  segments: OrbDictateTranscriptSegment[]
}

export function saveOrbWriteHandoff(payload: OrbWriteHandoffPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload))
  } catch {
    /* session quota */
  }
}

export function loadOrbWriteHandoff(): OrbWriteHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrbWriteHandoffPayload
  } catch {
    return null
  }
}

export function clearOrbWriteHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

export function handoffToOrbWriteDocument(
  payload: OrbWriteHandoffPayload,
  recordTypeLabel?: string
): OrbWriteDocument {
  const result = payload.generate_result
  const recordType = resolveOrbRecordingRecordType({
    recordTypeId: payload.record_type_id,
    studioTemplateId: payload.template_id,
    noteType: payload.note_type
  })
  const rawBody =
    payload.adult_edits?.trim() ||
    result?.professional_note ||
    `## Draft\n\n${payload.transcript}\n\n*Review and edit before use.*`
  const missingNotes = payload.accepted_suggestions
    .filter((s) => s.category === 'missing' && (s.status === 'accepted' || s.status === 'applied'))
    .map((s) => s.detail)
  const body = structureOrbWriteDocumentBody({
    recordType,
    body: rawBody,
    missingNotes: missingNotes.length ? missingNotes : undefined
  })
  const now = payload.timestamp || new Date().toISOString()
  const version: OrbWriteDocumentVersion = {
    id: 'v_initial',
    label: 'From Dictate',
    body,
    created_at: now,
    event: 'generated'
  }
  return {
    id: `write_${Date.now()}`,
    title: result?.title ?? recordType.label,
    record_type: payload.note_type,
    record_type_id: recordType.id,
    record_type_label: recordTypeLabel ?? recordType.label,
    document_headings: recordType.pdf_heading_order,
    body,
    transcript: payload.transcript,
    template_id: payload.template_id,
    summary: result?.summary ?? payload.brain_analysis_summary ?? '',
    quality_checks: result?.quality_checks ?? {
      child_voice: 'review',
      safeguarding: 'review',
      manager_oversight: 'missing',
      impact: 'weak',
      recording_quality: 'needs_review'
    },
    accepted_suggestions: payload.accepted_suggestions,
    participants: payload.participants,
    segments: payload.segments,
    review_required_statement: ORB_WRITE_REVIEW_STATEMENT,
    created_at: now,
    updated_at: now,
    versions: [version],
    word_count: body.trim().split(/\s+/).filter(Boolean).length,
    is_draft: true,
    is_finalised: false
  }
}
