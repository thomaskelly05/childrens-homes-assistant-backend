/** Phase 3V — pure Dictate intelligence request builders (no API client imports). */

import { ORB_DICTATE_WORKING_DOC_LABEL } from './orb-dictate-capture-copy.ts'
import type { OrbDictateEditMode } from './orb-dictate-studio-actions.ts'
import type { OrbDictatePersonConfirmItem } from './orb-dictate-people-identification.ts'
import type { OrbDictateRecordingMedia } from './orb-dictate-recording-media.ts'
import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from './orb-dictate-speaker.ts'
import {
  buildTranscriptBundleFromText,
  resolveWorkingTranscript,
  type OrbDictateTranscriptBundle,
  type OrbDictateTranscriptPrivacyMode
} from './orb-dictate-transcript-privacy.ts'
import type { OrbDictateNoteType } from './orb-dictate-types.ts'
import {
  buildInitialWorkingDocument,
  isOrbDictateSectionPlaceholder,
  parseWorkingDocument,
  workingDocumentTypeLabel
} from './orb-dictate-working-document.ts'

export type OrbDictateIntelligenceSourceType = 'microphone' | 'paste' | 'upload'

export type OrbDictateIntelligenceRequest = {
  templateType: string
  originalTranscript: string
  workingTranscript: string
  redactedTranscript?: string
  currentWorkingDocument?: string
  adultInstruction?: string
  peopleToConfirm?: OrbDictatePersonConfirmItem[]
  recordingMedia?: OrbDictateRecordingMedia | null
  transcriptPrivacyMode: OrbDictateTranscriptPrivacyMode
  sourceType: OrbDictateIntelligenceSourceType
  noteType?: OrbDictateNoteType
  segments?: OrbDictateTranscriptSegment[]
  participants?: OrbDictateParticipant[]
}

export type OrbDictateSavePacket = {
  source: 'orb_dictate'
  templateType: string
  originalTranscript: string
  redactedTranscript?: string
  workingTranscript: string
  workingDocument: string
  saferDraft?: string
  peopleToConfirm?: OrbDictatePersonConfirmItem[]
  recordingMedia?: Record<string, unknown>
  transcriptPrivacyMode: OrbDictateTranscriptPrivacyMode
  adultReviewStatus: 'generated_for_adult_review'
  sourceNote: string
  createdAt: string
  updatedAt: string
}

export const ORB_DICTATE_INTELLIGENCE_SLOW_MESSAGE =
  'ORB is still working. You can continue editing while this completes.' as const

export const ORB_DICTATE_MEDIA_SAVED_LOCAL_NOTE =
  'Recording metadata saved with draft. Audio remains local-only until permanent media storage is enabled.' as const

export const ORB_DICTATE_WRITE_HANDOFF_REVIEW_NOTE =
  'Created from ORB Dictate. Review against the source transcript and recording where available.' as const

function mapContentSourceToIntelligenceSource(
  source?: 'recording' | 'paste' | 'upload' | 'speak'
): OrbDictateIntelligenceSourceType {
  if (source === 'upload') return 'upload'
  if (source === 'paste') return 'paste'
  return 'microphone'
}

export function transcriptForIntelligence(request: OrbDictateIntelligenceRequest): string {
  if (request.transcriptPrivacyMode === 'internal_working') {
    return request.originalTranscript || request.workingTranscript
  }
  return request.redactedTranscript || request.workingTranscript || request.originalTranscript
}

export function buildDictateIntelligenceRequest(input: {
  templateId: string
  transcript: string
  transcriptBundle?: OrbDictateTranscriptBundle | null
  workingDocument?: string
  adultInstruction?: string
  peopleToConfirm?: OrbDictatePersonConfirmItem[]
  recordingMedia?: OrbDictateRecordingMedia | null
  contentSource?: 'recording' | 'paste' | 'upload' | 'speak'
  noteType?: OrbDictateNoteType
  segments?: OrbDictateTranscriptSegment[]
  participants?: OrbDictateParticipant[]
}): OrbDictateIntelligenceRequest {
  const bundle = input.transcriptBundle ?? buildTranscriptBundleFromText(input.transcript.trim())
  const working = resolveWorkingTranscript(bundle)
  return {
    templateType: input.templateId,
    originalTranscript: bundle.originalTranscript || input.transcript.trim(),
    workingTranscript: working,
    redactedTranscript: bundle.redactedTranscript,
    currentWorkingDocument: input.workingDocument,
    adultInstruction: input.adultInstruction?.trim() || undefined,
    peopleToConfirm: input.peopleToConfirm,
    recordingMedia: input.recordingMedia ?? null,
    transcriptPrivacyMode: bundle.transcriptPrivacyMode,
    sourceType: mapContentSourceToIntelligenceSource(input.contentSource),
    noteType: input.noteType,
    segments: input.segments,
    participants: input.participants
  }
}

export function buildDictateEditPayload(
  request: OrbDictateIntelligenceRequest,
  instruction: string,
  mode?: OrbDictateEditMode
) {
  const transcript = transcriptForIntelligence(request)
  const peopleSummary =
    request.peopleToConfirm
      ?.filter((p) => !p.removed)
      .map((p) => `${p.label}${p.role ? ` (${p.role})` : ''}${p.confirmed ? ' [confirmed]' : ''}`)
      .join(', ') || ''

  const contextualInstruction = [
    instruction.trim(),
    `Working document type: ${workingDocumentTypeLabel(request.templateType)}`,
    peopleSummary ? `People to confirm: ${peopleSummary}` : '',
    transcript ? `Working transcript:\n${transcript}` : ''
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    document_text:
      request.currentWorkingDocument?.trim() || buildInitialWorkingDocument(transcript, request.templateType),
    instruction: contextualInstruction,
    note_type: request.noteType ?? 'daily_record',
    mode,
    template_id: request.templateType,
    transcript_privacy_mode: request.transcriptPrivacyMode,
    working_transcript: request.workingTranscript,
    original_transcript: request.originalTranscript,
    redacted_transcript: request.redactedTranscript,
    participants: request.participants,
    segments: request.segments,
    people_to_confirm: request.peopleToConfirm?.filter((p) => !p.removed)
  }
}

const MISSING_CHECKS_BY_TEMPLATE: Record<string, string[]> = {
  daily_record: [
    'Who was present and what happened today?',
    "Child's presentation and voice where known",
    'Adult support and follow-up'
  ],
  missing: [
    'What was known when the child went missing?',
    'Actions taken and who was informed',
    "Child's return, presentation and follow-up"
  ],
  incident: [
    'What happened, in order, and who was present?',
    "Child's presentation and voice",
    'Adult response, outcome and repair/follow-up'
  ],
  supervision_prep: [
    'Who was present and purpose of supervision',
    'Practice themes discussed',
    'Actions, learning or follow-up agreed'
  ],
  safeguarding: [
    'What was observed or reported',
    'Immediate safety actions and adults informed',
    'Follow-up or management oversight needed'
  ],
  handover: ['Key update and presentation/wellbeing', 'Risks, concerns and actions needed'],
  general: [
    'Who was present and purpose of the discussion',
    'Key points captured from the transcript',
    'Actions, follow-up or clarifications needed'
  ]
}

export function buildDictateMissingInfoReview(request: OrbDictateIntelligenceRequest): string[] {
  const transcript = transcriptForIntelligence(request)
  const sections = parseWorkingDocument(
    request.currentWorkingDocument || buildInitialWorkingDocument(transcript, request.templateType)
  )
  const checks = MISSING_CHECKS_BY_TEMPLATE[request.templateType] ?? MISSING_CHECKS_BY_TEMPLATE.general
  const items: string[] = []

  const peopleConfirmed = request.peopleToConfirm?.some((p) => !p.removed && p.confirmed)
  if (!peopleConfirmed && (request.peopleToConfirm?.length || /\bwith\b/i.test(transcript))) {
    items.push('Confirm who was present')
  }

  for (const check of checks) {
    if (items.length >= 6) break
    const lower = check.toLowerCase()
    const related = sections.find((section) => {
      const heading = section.heading.toLowerCase()
      return (
        (lower.includes('child') && heading.includes('child')) ||
        (lower.includes('follow') && heading.includes('follow')) ||
        (lower.includes('action') && heading.includes('action')) ||
        (lower.includes('present') && heading.includes('what happened')) ||
        (lower.includes('practice') && heading.includes('impact'))
      )
    })
    if (!related || isOrbDictateSectionPlaceholder(related.body)) {
      items.push(check)
    }
  }

  return items.slice(0, 6)
}

export function buildCleanDictateCopy(
  markdown: string,
  options?: { includeReviewNotes?: boolean; stripPlaceholders?: boolean }
): string {
  const stripPlaceholders = options?.stripPlaceholders !== false
  const sections = parseWorkingDocument(markdown)
  const lines: string[] = []

  if (options?.includeReviewNotes) {
    lines.push(ORB_DICTATE_WORKING_DOC_LABEL)
    lines.push('')
  }

  if (!sections.length) {
    const body = stripPlaceholders && isOrbDictateSectionPlaceholder(markdown.trim()) ? '' : markdown.trim()
    return body
  }

  for (const section of sections) {
    if (stripPlaceholders && isOrbDictateSectionPlaceholder(section.body)) continue
    lines.push(`## ${section.heading}`)
    lines.push('')
    lines.push(section.body.trim())
    lines.push('')
  }

  return lines.join('\n').trim()
}

export function buildDictateSavePacket(input: {
  request: OrbDictateIntelligenceRequest
  workingDocument: string
  saferDraft?: string
  recordingMedia?: Record<string, unknown>
  sourceNote?: string
}): OrbDictateSavePacket {
  const now = new Date().toISOString()
  return {
    source: 'orb_dictate',
    templateType: input.request.templateType,
    originalTranscript: input.request.originalTranscript,
    redactedTranscript: input.request.redactedTranscript,
    workingTranscript: input.request.workingTranscript,
    workingDocument: input.workingDocument,
    saferDraft: input.saferDraft,
    peopleToConfirm: input.request.peopleToConfirm,
    recordingMedia: input.recordingMedia,
    transcriptPrivacyMode: input.request.transcriptPrivacyMode,
    adultReviewStatus: 'generated_for_adult_review',
    sourceNote: input.sourceNote ?? 'Created from ORB Dictate',
    createdAt: now,
    updatedAt: now
  }
}
