/** Phase 4A — Voice handoff metadata for Dictate, Write and saved reflections. */

import {
  ORB_KATHERINE_VOICE_LABEL,
  type OrbVoiceSessionMemory
} from './orb-voice-human-conversation.ts'
import type { OrbVoiceReflectiveModeId } from './orb-voice-reflective-modes.ts'

export type OrbVoiceHandoffPayload = {
  source: 'orb_voice'
  mode: OrbVoiceReflectiveModeId
  conversationTranscript: string
  summary: string
  selectedVoice: typeof ORB_KATHERINE_VOICE_LABEL | string
  adultReviewStatus: 'generated_for_adult_review'
  audioStored: false
  ttsProvider?: string
  ttsFallbackUsed?: boolean
  sourceNote?: string
  suggestedTemplateId?: string
  sessionMemory?: OrbVoiceSessionMemory
  createdAt: string
}

export function buildOrbVoiceHandoffPayload(input: {
  mode: OrbVoiceReflectiveModeId
  conversationTranscript: string
  summary: string
  suggestedTemplateId?: string
  sourceNote?: string
  sessionMemory?: OrbVoiceSessionMemory
  selectedVoice?: string
}): OrbVoiceHandoffPayload {
  return {
    source: 'orb_voice',
    mode: input.mode,
    conversationTranscript: input.conversationTranscript.trim(),
    summary: input.summary.trim(),
    selectedVoice: input.selectedVoice ?? ORB_KATHERINE_VOICE_LABEL,
    adultReviewStatus: 'generated_for_adult_review',
    audioStored: false,
    sourceNote: input.sourceNote ?? 'Created from ORB Voice reflection',
    suggestedTemplateId: input.suggestedTemplateId,
    sessionMemory: input.sessionMemory,
    createdAt: new Date().toISOString()
  }
}
