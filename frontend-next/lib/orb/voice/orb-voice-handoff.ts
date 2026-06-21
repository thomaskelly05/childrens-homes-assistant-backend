/** Phase 4A — Voice handoff metadata for Dictate, Write and saved reflections. */

import type { OrbVoiceReflectiveModeId } from './orb-voice-reflective-modes.ts'

export type OrbVoiceHandoffPayload = {
  source: 'orb_voice'
  mode: OrbVoiceReflectiveModeId
  conversationTranscript: string
  summary: string
  adultReviewStatus: 'generated_for_adult_review'
  sourceNote?: string
  suggestedTemplateId?: string
  createdAt: string
}

export function buildOrbVoiceHandoffPayload(input: {
  mode: OrbVoiceReflectiveModeId
  conversationTranscript: string
  summary: string
  suggestedTemplateId?: string
  sourceNote?: string
}): OrbVoiceHandoffPayload {
  return {
    source: 'orb_voice',
    mode: input.mode,
    conversationTranscript: input.conversationTranscript.trim(),
    summary: input.summary.trim(),
    adultReviewStatus: 'generated_for_adult_review',
    sourceNote: input.sourceNote ?? 'Created from ORB Voice reflection',
    suggestedTemplateId: input.suggestedTemplateId,
    createdAt: new Date().toISOString()
  }
}
