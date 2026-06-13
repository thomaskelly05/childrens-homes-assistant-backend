/**
 * Safe after-call content for ORB Voice — derived from transcript only; never invented.
 */

import {
  buildOrbVoiceAfterCallSections,
  orbVoiceTextHasSafetyConcern
} from './orb-voice-conversation-engine.ts'
import type { VoiceTurn } from './orb-voice-types'

export type OrbVoiceAfterCallContent = {
  summary: string | null
  childVoicePresentation: string | null
  adultResponse: string | null
  recordingHints: string[]
  missingInformation: string[]
  followUpQuestions: string[]
  suggestedRecordTypeId: string | null
  suggestedRecordTypeLabel: string | null
  hasTranscript: boolean
  summaryPending: boolean
}

const MANAGEMENT_OVERSIGHT_KEYWORDS = [
  'restraint',
  'missing from home',
  'missing from',
  'self-harm',
  'self harm',
  'disclosure',
  'allegation',
  'injury',
  'police',
  'ambulance',
  'bullying',
  'exploitation',
  'medication',
  'significant incident'
] as const

const URGENT_ESCALATION_PATTERNS = [
  'immediate risk',
  'abuse',
  'disclosure',
  'missing child',
  'missing from',
  'self-harm',
  'self harm',
  'serious injury',
  'exploitation',
  'emergency'
] as const

export function buildOrbVoiceAfterCallContent(
  turns: VoiceTurn[],
  voiceSummary?: string | null,
  options?: { summaryPending?: boolean }
): OrbVoiceAfterCallContent {
  const sections = buildOrbVoiceAfterCallSections(turns, voiceSummary, options)
  return {
    summary: sections.summary,
    childVoicePresentation: sections.childVoicePresentation,
    adultResponse: sections.adultResponse,
    recordingHints: sections.recordingHints,
    missingInformation: sections.missingInformation,
    followUpQuestions: sections.followUpQuestions,
    suggestedRecordTypeId: sections.suggestedRecordTypeId,
    suggestedRecordTypeLabel: sections.suggestedRecordTypeLabel,
    hasTranscript: sections.hasTranscript,
    summaryPending: sections.summaryPending
  }
}

/** Whether urgent safeguarding language appears — encourage escalation copy only. */
export function orbVoiceNeedsEscalationPrompt(text: string): boolean {
  const lower = text.toLowerCase()
  return URGENT_ESCALATION_PATTERNS.some((p) => lower.includes(p)) || orbVoiceTextHasSafetyConcern(text)
}

/** Calm management oversight prompt — keyword match only; ORB does not decide. */
export function orbVoiceNeedsManagementOversight(text: string): boolean {
  const lower = text.toLowerCase()
  return MANAGEMENT_OVERSIGHT_KEYWORDS.some((p) => lower.includes(p))
}

export function orbVoiceManagementOversightTopics(text: string): string[] {
  const lower = text.toLowerCase()
  return MANAGEMENT_OVERSIGHT_KEYWORDS.filter((p) => lower.includes(p)).slice(0, 4)
}
