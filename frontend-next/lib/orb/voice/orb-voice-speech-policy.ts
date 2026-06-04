/**
 * Context-aware ORB Voice speech policy — auto-speak vs text-first.
 */

import {
  shouldBlockAutoSpokenReply,
  type IndicareAnswerQualityGate,
  type IndicareIntelligenceCoreView
} from '@/lib/orb/indicare-intelligence-core'
import { buildOrbSpokenSummary, type OrbSpokenSummaryResult } from '@/lib/orb/voice/orb-spoken-summary'
import type { OrbSpokenAnswerLength } from '@/lib/orb/voice/orb-voice-types'

export const SAFEGUARDING_CRITICAL_SPOKEN_BLOCKED_MESSAGE =
  'Spoken reply paused for privacy/safeguarding. ORB has shown the answer on screen.'

const HIGH_RISK_TOPIC_TERMS = [
  'allegation',
  'self-harm',
  'self harm',
  'exploitation',
  'missing from care',
  'missing person',
  'lado',
  'serious injury',
  'restraint',
  'medication error'
] as const

export type OrbVoiceProviderTrustSettings = {
  premiumTtsEnabled?: boolean
  transcriptStorage?: boolean
  externalAiEnabled?: boolean
  sensitiveSpokenRepliesAllowed?: boolean
}

export type ResolveOrbVoiceSpeechInput = {
  writtenAnswer: string
  userMessageHint?: string
  voiceRepliesEnabled: boolean
  privacyMode?: boolean
  lowSensoryMode?: boolean
  sensitiveSpokenRepliesEnabled?: boolean
  expertDepth?: string
  careRelevanceScore?: number
  qualityGate?: IndicareAnswerQualityGate | null
  core?: IndicareIntelligenceCoreView | null
  mode?: string
  urgentSafeguarding?: boolean
  spokenAnswerLength?: OrbSpokenAnswerLength
  providerTrust?: OrbVoiceProviderTrustSettings
  manualSpeak?: boolean
}

export type OrbVoiceSpeechDecision = {
  allowAutoSpeak: boolean
  allowManualSpeak: boolean
  blockedReason: string | null
  spokenText: string | null
  summary: OrbSpokenSummaryResult | null
  expertDepth: string
  textOnlyPreferred: boolean
}

function normaliseDepth(depth?: string): string {
  return (depth || 'general_light').trim().toLowerCase()
}

function haystackIncludesHighRiskTopic(written: string, hint?: string): boolean {
  const haystack = `${hint || ''}\n${written}`.toLowerCase()
  return HIGH_RISK_TOPIC_TERMS.some((term) => haystack.includes(term))
}

function depthBlocksAutoSpeak(depth: string): boolean {
  if (depth === 'safeguarding_critical') return true
  if (depth === 'residential_deep') return true
  return false
}

function depthAllowsShortSpoken(depth: string, manualSpeak: boolean): boolean {
  if (depth === 'residential_deep' && manualSpeak) return true
  return !depthBlocksAutoSpeak(depth)
}

export function resolveOrbVoiceSpeechDecision(input: ResolveOrbVoiceSpeechInput): OrbVoiceSpeechDecision {
  const depth = normaliseDepth(input.expertDepth ?? input.core?.expert_depth)
  const manualSpeak = Boolean(input.manualSpeak)
  const blocked = shouldBlockAutoSpokenReply({
    voiceRepliesEnabled: input.voiceRepliesEnabled,
    privacyMode: input.privacyMode,
    lowSensoryMode: input.lowSensoryMode,
    expertDepth: depth,
    mode: input.mode,
    urgentSafeguarding: input.urgentSafeguarding
  })

  const highRiskTopic = haystackIncludesHighRiskTopic(input.writtenAnswer, input.userMessageHint)
  const sensitiveAllowed =
    Boolean(input.sensitiveSpokenRepliesEnabled) &&
    Boolean(input.providerTrust?.sensitiveSpokenRepliesAllowed ?? input.providerTrust?.externalAiEnabled)

  const textOnlyPreferred =
    blocked ||
    depth === 'safeguarding_critical' ||
    (highRiskTopic && !sensitiveAllowed) ||
    Boolean(input.privacyMode) ||
    Boolean(input.lowSensoryMode)

  let blockedReason: string | null = null
  if (!input.voiceRepliesEnabled && !manualSpeak) {
    blockedReason = 'Voice replies are off — read ORB’s text answer below.'
  } else if (depth === 'safeguarding_critical') {
    blockedReason = SAFEGUARDING_CRITICAL_SPOKEN_BLOCKED_MESSAGE
  } else if (input.privacyMode || input.lowSensoryMode) {
    blockedReason = 'Spoken reply paused in privacy mode — text answer shown below.'
  } else if (highRiskTopic && !sensitiveAllowed) {
    blockedReason =
      'Spoken reply paused for privacy/safeguarding. ORB has shown the answer on screen.'
  } else if (depth === 'residential_deep' && !manualSpeak) {
    blockedReason = 'Text-first for this topic — use Speak again if you need a short summary.'
  } else if (blocked) {
    blockedReason = 'Spoken reply paused for review — text answer shown below.'
  }

  const summary =
    input.writtenAnswer.trim() &&
    (manualSpeak || !textOnlyPreferred || depthAllowsShortSpoken(depth, manualSpeak))
      ? buildOrbSpokenSummary({
          writtenAnswer: input.writtenAnswer,
          userMessageHint: input.userMessageHint,
          expertDepth: depth,
          careRelevanceScore: input.careRelevanceScore ?? input.core?.care_relevance_score,
          qualityGate: input.qualityGate,
          core: input.core,
          spokenAnswerLength: input.spokenAnswerLength
        })
      : null

  const spokenText = summary?.summary?.trim() || null
  const allowAutoSpeak =
    Boolean(spokenText) &&
    !textOnlyPreferred &&
    !depthBlocksAutoSpeak(depth) &&
    !(highRiskTopic && !sensitiveAllowed) &&
    input.voiceRepliesEnabled

  const allowManualSpeak =
    Boolean(spokenText) &&
    input.voiceRepliesEnabled &&
    !(depth === 'safeguarding_critical' && !sensitiveAllowed) &&
    !(input.privacyMode && !manualSpeak) &&
    !(input.lowSensoryMode && !manualSpeak)

  return {
    allowAutoSpeak,
    allowManualSpeak,
    blockedReason: allowAutoSpeak ? null : blockedReason,
    spokenText,
    summary,
    expertDepth: depth,
    textOnlyPreferred
  }
}
