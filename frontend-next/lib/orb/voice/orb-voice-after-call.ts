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
}

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
    'young person'
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

export function buildOrbVoiceAfterCallContent(turns: VoiceTurn[], voiceSummary?: string | null): OrbVoiceAfterCallContent {
  const hasTranscript = turns.some((t) => (t.role === 'user' || t.role === 'assistant') && t.text.trim())
  const summary = voiceSummary?.trim() || excerptSummary(turns)
  const recordingHints = recordingHintsFromTurns(turns)
  const followUpQuestions = hasTranscript ? [...REFLECTIVE_DEBRIEF_QUESTIONS].slice(0, 4) : []

  return {
    summary,
    recordingHints,
    followUpQuestions,
    hasTranscript
  }
}

/** Whether urgent safeguarding language appears — encourage escalation copy only. */
export function orbVoiceNeedsEscalationPrompt(text: string): boolean {
  const lower = text.toLowerCase()
  const patterns = [
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
  ]
  return patterns.some((p) => lower.includes(p))
}
