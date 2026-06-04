/**
 * Safe spoken summaries for ORB Voice — written answer remains full source of truth.
 */

import type { IndicareAnswerQualityGate, IndicareIntelligenceCoreView } from '@/lib/orb/indicare-intelligence-core'
import type { OrbSpokenAnswerLength } from '@/lib/orb/voice/orb-voice-types'

const SCREEN_POINTER = "I've put the follow-up points on screen."
const SCREEN_POINTER_ALT = "I've shown the follow-up points on screen."

const TOPIC_SPOKEN_HINTS: Array<{ terms: string[]; summary: string }> = [
  {
    terms: ['missing', 'abscond', 'left the home', 'run away'],
    summary: `First, make sure they are physically safe and approach them calmly. Follow your missing-from-care procedure and speak with the manager or on-call. I've put the recording and safeguarding points on screen.`
  },
  {
    terms: ["don't care", 'dont care', 'i don\'t care', 'couldn\'t care'],
    summary: `Treat this as communication, not attitude. Check what has changed around them and record their exact words. ${SCREEN_POINTER_ALT}`
  },
  {
    terms: ['cannabis', 'drugs', 'substance'],
    summary: `Stay calm and follow your home's substance procedure. Keep them safe, record facts, and involve your manager. ${SCREEN_POINTER}`
  },
  {
    terms: ['self-harm', 'self harm', 'suicide', 'cutting'],
    summary: `Prioritise immediate safety and follow your safeguarding procedure. Do not leave them alone if risk is present. Involve your manager now. ${SCREEN_POINTER}`
  },
  {
    terms: ['restraint', 'physical intervention'],
    summary: `Follow your restraint and incident procedures. Record what happened factually and debrief with your manager. ${SCREEN_POINTER}`
  },
  {
    terms: ['medication error', 'wrong dose', 'missed medication'],
    summary: `Follow your medication error procedure and inform your manager. Record facts without speculation. ${SCREEN_POINTER}`
  },
  {
    terms: ['allegation', 'lado', 'exploitation'],
    summary: `Follow your safeguarding procedure and do not investigate alone. Record facts and inform your designated safeguarding lead or manager. ${SCREEN_POINTER}`
  }
]

function normaliseDepth(depth?: string | null): string {
  return (depth || 'general_light').trim().toLowerCase()
}

function combinedHaystack(written: string, userHint?: string): string {
  return `${userHint || ''}\n${written}`.toLowerCase()
}

function topicSpokenHint(haystack: string): string | null {
  for (const entry of TOPIC_SPOKEN_HINTS) {
    if (entry.terms.some((t) => haystack.includes(t))) return entry.summary
  }
  return null
}

function firstPracticalSentences(text: string, maxSentences: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  const take = parts.slice(0, maxSentences).join(' ')
  if (take.length > 420) return `${take.slice(0, 417).trim()}…`
  return take
}

function lengthBudget(length: OrbSpokenAnswerLength): number {
  if (length === 'short') return 2
  if (length === 'detailed') return 4
  return 3
}

export type BuildOrbSpokenSummaryInput = {
  writtenAnswer: string
  userMessageHint?: string
  expertDepth?: string
  careRelevanceScore?: number
  qualityGate?: IndicareAnswerQualityGate | null
  core?: IndicareIntelligenceCoreView | null
  spokenAnswerLength?: OrbSpokenAnswerLength
}

export type OrbSpokenSummaryResult = {
  summary: string | null
  usedTopicHint: boolean
  truncatedFromWritten: boolean
}

/** Build a shorter, calmer spoken line from the full written answer. */
export function buildOrbSpokenSummary(input: BuildOrbSpokenSummaryInput): OrbSpokenSummaryResult {
  const written = input.writtenAnswer.trim()
  if (!written) return { summary: null, usedTopicHint: false, truncatedFromWritten: false }

  const haystack = combinedHaystack(written, input.userMessageHint)
  const topic = topicSpokenHint(haystack)
  if (topic) {
    return { summary: topic, usedTopicHint: true, truncatedFromWritten: false }
  }

  const depth = normaliseDepth(input.expertDepth ?? input.core?.expert_depth)
  const length = input.spokenAnswerLength ?? 'balanced'
  const maxSentences =
    depth === 'residential_deep' || depth === 'safeguarding_critical'
      ? 2
      : lengthBudget(length)

  const practical = firstPracticalSentences(written, maxSentences)
  if (!practical) return { summary: null, usedTopicHint: false, truncatedFromWritten: false }

  const needsPointer = practical.length < written.length * 0.55
  const summary = needsPointer ? `${practical} ${SCREEN_POINTER}` : practical
  return { summary, usedTopicHint: false, truncatedFromWritten: needsPointer }
}
