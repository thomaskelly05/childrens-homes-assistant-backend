import { runReviewEngine } from '@/lib/indicare-lab/review-board/review-engine'
import { isShadowReviewEnabled } from '@/lib/indicare-lab/review-events/review-event-config'
import { redactReviewEventFields } from '@/lib/indicare-lab/review-events/review-event-redaction'
import { storeShadowReviewEvent } from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ReviewSource, ReviewTaskType } from '@/lib/indicare-lab/review-events/types'

/** Minimum meaningful answer length before creating a shadow review event. */
const MIN_ANSWER_LENGTH = 40

export type OrbShadowReviewMetadata = {
  noteType?: string
  recordType?: string
  intent?: string
  mode?: string
  conversationId?: string
  sourceSurface?: string
  [key: string]: unknown
}

export type CreateShadowReviewEventInput = {
  source: ReviewSource
  taskType?: ReviewTaskType
  prompt?: string
  draftAnswer: string
  context?: string
  metadata?: OrbShadowReviewMetadata
}

export type ShadowReviewEventResult =
  | { ok: true; eventId: string; skipped: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; skipped: true; reason: string }

const INCIDENT_KEYWORDS = [
  'incident',
  'safeguarding',
  'allegation',
  'injury',
  'restraint',
  'missing',
  'abscond',
  'assault',
  'abuse'
] as const

const DAILY_RECORD_KEYWORDS = [
  'daily log',
  'daily record',
  'daily note',
  'shift note',
  'daily entry'
] as const

const SUPERVISION_KEYWORDS = [
  'supervision',
  'supervisory',
  'staff debrief',
  'reflective practice'
] as const

const REG44_KEYWORDS = ['reg 44', 'reg44', 'regulation 44', 'independent visitor'] as const
const REG45_KEYWORDS = ['reg 45', 'reg45', 'regulation 45'] as const
const CARE_PLAN_KEYWORDS = ['care plan', 'support plan', 'placement plan', 'risk assessment'] as const

const NOTE_TYPE_TO_TASK: Record<string, ReviewTaskType> = {
  daily_record: 'daily-log',
  incident_record: 'incident-record',
  chronology_entry: 'incident-record',
  handover_note: 'handover-note',
  keywork_summary: 'daily-log',
  manager_oversight_note: 'handover-note',
  safeguarding_concern_record: 'safeguarding-record',
  missing_episode_note: 'incident-record',
  staff_debrief: 'handover-note',
  supervision_reflection: 'handover-note',
  learning_note: 'daily-log',
  action_plan: 'behaviour-record',
  reg44_prep_note: 'daily-log',
  ofsted_evidence_summary: 'daily-log',
  team_meeting: 'handover-note',
  investigation_meeting: 'incident-record',
  strategy_multi_agency_prep: 'safeguarding-record',
  meeting_notes: 'handover-note',
  professional_consultation: 'communication-draft',
  home_visit_note: 'daily-log',
  assessment_notes: 'behaviour-record',
  supervision_discussion: 'handover-note',
  multi_agency_discussion: 'safeguarding-record',
  strategy_safeguarding_discussion: 'safeguarding-record'
}

function containsAny(text: string, terms: readonly string[]): boolean {
  const lower = text.toLowerCase()
  return terms.some((term) => lower.includes(term))
}

/**
 * Infer review task type from metadata and combined prompt/answer text.
 * Maps conservatively to existing ReviewTaskType values.
 */
export function inferReviewTaskType(input: {
  taskType?: ReviewTaskType
  metadata?: OrbShadowReviewMetadata
  prompt?: string
  draftAnswer?: string
  source?: ReviewSource
}): ReviewTaskType {
  if (input.taskType) return input.taskType

  const noteType = input.metadata?.noteType ?? input.metadata?.recordType
  if (noteType && NOTE_TYPE_TO_TASK[noteType]) {
    return NOTE_TYPE_TO_TASK[noteType]
  }

  const combined = `${input.prompt ?? ''} ${input.draftAnswer ?? ''} ${input.metadata?.intent ?? ''}`

  if (containsAny(combined, INCIDENT_KEYWORDS)) return 'incident-record'
  if (containsAny(combined, DAILY_RECORD_KEYWORDS)) return 'daily-log'
  if (containsAny(combined, SUPERVISION_KEYWORDS)) return 'handover-note'
  if (containsAny(combined, REG44_KEYWORDS) || containsAny(combined, REG45_KEYWORDS)) {
    return 'daily-log'
  }
  if (containsAny(combined, CARE_PLAN_KEYWORDS)) return 'behaviour-record'
  if (containsAny(combined, ['safeguarding'])) return 'safeguarding-record'
  if (containsAny(combined, ['handover'])) return 'handover-note'
  if (containsAny(combined, ['behaviour', 'behavior'])) return 'behaviour-record'

  switch (input.source) {
    case 'orb-dictate':
      return 'dictation-draft'
    case 'orb-voice':
      return 'voice-transcript'
    case 'orb-communicate':
      return 'communication-draft'
    case 'orb-write':
      return 'dictation-draft'
    case 'orb-chat':
    default:
      return 'chat-response'
  }
}

/** Map ORB client source_surface / station identifiers to review sources. */
export function mapOrbStationToReviewSource(
  station: string | undefined
): ReviewSource | null {
  switch ((station ?? '').toLowerCase()) {
    case 'chat':
      return 'orb-chat'
    case 'voice':
    case 'orb_voice':
      return 'orb-voice'
    case 'dictate':
    case 'orb_dictate':
      return 'orb-dictate'
    case 'write':
    case 'orb_write':
      return 'orb-write'
    case 'communicate':
    case 'orb_communicate':
      return 'orb-communicate'
    default:
      return null
  }
}

function buildShadowContext(
  context: string | undefined,
  metadata?: OrbShadowReviewMetadata
): string | undefined {
  const parts: string[] = []
  if (context?.trim()) parts.push(context.trim())
  parts.push('Shadow review — internal evaluation only. Live answer unchanged.')
  if (metadata?.conversationId) parts.push(`Conversation: ${metadata.conversationId}`)
  if (metadata?.mode) parts.push(`Mode: ${metadata.mode}`)
  if (metadata?.sourceSurface) parts.push(`Surface: ${metadata.sourceSurface}`)
  return parts.join(' · ')
}

/**
 * Create an internal review event from a real ORB output without altering the live answer.
 * Never throws — failures are swallowed so user-facing responses are unaffected.
 */
export function createShadowReviewEventForOrbOutput(
  input: CreateShadowReviewEventInput
): ShadowReviewEventResult {
  try {
    if (!isShadowReviewEnabled()) {
      return { ok: true, skipped: true, reason: 'shadow_review_disabled' }
    }

    const answer = input.draftAnswer?.trim() ?? ''
    if (!answer || answer.length < MIN_ANSWER_LENGTH) {
      return { ok: true, skipped: true, reason: 'answer_too_short' }
    }

    const taskType = inferReviewTaskType({
      taskType: input.taskType,
      metadata: input.metadata,
      prompt: input.prompt,
      draftAnswer: answer,
      source: input.source
    })

    const redacted = redactReviewEventFields({
      prompt: input.prompt,
      draftAnswer: answer,
      context: buildShadowContext(input.context, input.metadata)
    })

    const event = runReviewEngine({
      source: input.source,
      taskType,
      prompt: redacted.prompt,
      draftAnswer: redacted.draftAnswer,
      context: redacted.context,
      isDevelopment: true,
      origin: 'shadow-review',
      isRedacted: redacted.isRedacted,
      fullTextStored: redacted.fullTextStored
    })

    storeShadowReviewEvent(event)

    return { ok: true, eventId: event.id, skipped: false }
  } catch {
    return { ok: false, skipped: true, reason: 'adapter_error' }
  }
}

/**
 * Fire-and-forget wrapper — safe to call from ORB response paths.
 * Does not block or modify the returned answer.
 */
export function triggerShadowReviewForOrbOutput(input: CreateShadowReviewEventInput): void {
  void createShadowReviewEventForOrbOutput(input)
}
