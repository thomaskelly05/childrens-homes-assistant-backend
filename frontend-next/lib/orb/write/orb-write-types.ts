import type { OrbDictateNoteType, OrbDictateQualityChecks } from '@/lib/orb/dictate/orb-dictate-types'
import type { OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

export type OrbWriteDocumentVersion = {
  id: string
  label: string
  body: string
  created_at: string
  event: 'generated' | 'edited' | 'ai_suggestion' | 'restored'
}

export type OrbWriteDocument = {
  id: string
  title: string
  record_type: OrbDictateNoteType
  record_type_id?: string
  record_type_label: string
  document_headings?: string[]
  body: string
  transcript: string
  template_id: string
  summary: string
  quality_checks: OrbDictateQualityChecks
  accepted_suggestions: OrbDictateBrainSuggestion[]
  participants: OrbDictateParticipant[]
  segments: OrbDictateTranscriptSegment[]
  review_required_statement: string
  created_at: string
  updated_at: string
  versions: OrbWriteDocumentVersion[]
  word_count: number
  is_draft: boolean
  is_finalised: boolean
}

export const ORB_WRITE_REVIEW_STATEMENT =
  'This document requires adult review before saving or exporting as a formal record. The adult remains responsible for the final record.'

export const ORB_WRITE_PRIVACY_NOTICE =
  'No child profile data is stored in ORB Dictate. Audio and transcript remain session-based until saved/exported by the adult.'

export const ORB_WRITE_SAFETY_COPY = {
  review: 'Review required before saving or exporting.',
  judgement: 'ORB supports professional judgement. It does not replace it.',
  responsibility:
    'Adult remains responsible for the final record. ORB can improve wording, but staff must verify accuracy.'
} as const
