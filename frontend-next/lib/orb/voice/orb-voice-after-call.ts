/**
 * Safe after-call content for ORB Voice — derived from transcript only; never invented.
 */

import { REFLECTIVE_DEBRIEF_QUESTIONS } from '../dictate/orb-dictate-types.ts'
import type { VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

export type OrbVoiceAfterCallContent = {
  summary: string | null
  recordingHints: string[]
  followUpQuestions: string[]
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

function userTurns(turns: VoiceTurn[]): VoiceTurn[] {
  return turns.filter((t) => t.role === 'user' && t.text.trim())
}

/** First user message excerpt — safe summary when no backend summary exists. */
function excerptSummary(turns: VoiceTurn[]): string | null {
  const users = userTurns(turns)
  if (!users.length) return null
  const combined = users
    .map((t) => t.text.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!combined) return null
  if (combined.length <= 220) return combined
  return `${combined.slice(0, 217)}…`
}

/** Pull short hints from user turns — observable phrases only, no inference. */
function recordingHintsFromTurns(turns: VoiceTurn[]): string[] {
  const users = userTurns(turns)
  if (!users.length) return []
  const hints: string[] = []
  const keywords = [
    'incident',
    'safeguard',
    'missing',
    'injury',
    'behaviour',
    'handover',
    'debrief',
    'concern',
    'risk',
    'child',
    'young person',
    ...MANAGEMENT_OVERSIGHT_KEYWORDS
  ]
  for (const turn of users) {
    const lower = turn.text.toLowerCase()
    const matched = keywords.filter((k) => lower.includes(k))
    if (matched.length) {
      const excerpt = turn.text.trim().slice(0, 120)
      hints.push(excerpt.length < turn.text.trim().length ? `${excerpt}…` : excerpt)
    }
  }
  if (!hints.length && users[0]) {
    const first = users[0].text.trim()
    hints.push(first.length > 100 ? `${first.slice(0, 97)}…` : first)
  }
  return hints.slice(0, 3)
}

export function buildOrbVoiceAfterCallContent(
  turns: VoiceTurn[],
  voiceSummary?: string | null,
  options?: { summaryPending?: boolean }
): OrbVoiceAfterCallContent {
  const hasTranscript = turns.some((t) => (t.role === 'user' || t.role === 'assistant') && t.text.trim())
  const summaryPending = Boolean(options?.summaryPending) && !voiceSummary?.trim()
  const summary = voiceSummary?.trim() || excerptSummary(turns)
  const recordingHints = recordingHintsFromTurns(turns)
  const followUpQuestions = hasTranscript ? [...REFLECTIVE_DEBRIEF_QUESTIONS].slice(0, 4) : []

  return {
    summary,
    recordingHints,
    followUpQuestions,
    hasTranscript,
    summaryPending
  }
}

/** Whether urgent safeguarding language appears — encourage escalation copy only. */
export function orbVoiceNeedsEscalationPrompt(text: string): boolean {
  const lower = text.toLowerCase()
  return URGENT_ESCALATION_PATTERNS.some((p) => lower.includes(p))
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
