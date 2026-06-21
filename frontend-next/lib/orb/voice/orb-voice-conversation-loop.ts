/**
 * Phase 4F — single ORB Voice conversation loop helpers.
 */

import type { OrbVoiceSessionMemory } from './orb-voice-human-conversation.ts'
import { ORB_KATHERINE_VOICE_LABEL } from './orb-voice-human-conversation.ts'
import type { OrbVoiceReflectiveModeId } from './orb-voice-reflective-modes.ts'
import type { VoiceTurn } from './orb-voice-types.ts'
import { buildOrbVoiceHandoffPayload, type OrbVoiceHandoffPayload } from './orb-voice-handoff.ts'

export type OrbVoiceSessionTurn = {
  role: 'adult' | 'orb'
  text: string
}

export type OrbVoiceRespondPayload = {
  mode: string
  transcript: string
  sessionTurns: OrbVoiceSessionTurn[]
  sessionMemory?: OrbVoiceSessionMemory
}

export type OrbVoiceTtsMetadata = {
  provider?: string | null
  voiceName?: string | null
  fallbackUsed?: boolean
}

export function createVoiceTurnId(prefix: 'adult' | 'orb' = 'adult'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function voiceTurnsToSessionTurns(turns: VoiceTurn[]): OrbVoiceSessionTurn[] {
  return turns
    .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
    .map((turn) => ({
      role: (turn.role === 'user' ? 'adult' : 'orb') as 'adult' | 'orb',
      text: turn.text.trim()
    }))
    .filter((turn) => turn.text)
}

export function buildOrbVoiceRespondPayload(input: {
  mode: OrbVoiceReflectiveModeId
  transcript: string
  turns: VoiceTurn[]
  sessionMemory?: OrbVoiceSessionMemory
}): OrbVoiceRespondPayload {
  const trimmed = input.transcript.trim()
  const prior = voiceTurnsToSessionTurns(input.turns)
  return {
    mode: input.mode,
    transcript: trimmed,
    sessionTurns: [...prior, { role: 'adult', text: trimmed }],
    sessionMemory: input.sessionMemory
  }
}

export function createOrbVoiceSpokenTurnGuard() {
  const spokenTurnIds = new Set<string>()
  return {
    shouldSpeak(turnKey: string | null | undefined): boolean {
      if (!turnKey) return false
      if (spokenTurnIds.has(turnKey)) return false
      spokenTurnIds.add(turnKey)
      return true
    },
    reset() {
      spokenTurnIds.clear()
    },
    has(turnKey: string) {
      return spokenTurnIds.has(turnKey)
    }
  }
}

export function resolveSelectedVoiceLabel(meta: OrbVoiceTtsMetadata): string {
  if (meta.fallbackUsed) {
    return meta.voiceName?.trim() || 'Fallback voice'
  }
  if ((meta.provider || '').toLowerCase() === 'elevenlabs') {
    return ORB_KATHERINE_VOICE_LABEL
  }
  if ((meta.voiceName || '').toLowerCase().includes('katherine')) {
    return ORB_KATHERINE_VOICE_LABEL
  }
  return meta.voiceName?.trim() || ORB_KATHERINE_VOICE_LABEL
}

export function buildOrbVoiceHandoffWithTts(input: {
  mode: OrbVoiceReflectiveModeId
  conversationTranscript: string
  summary: string
  suggestedTemplateId?: string
  sessionMemory?: OrbVoiceSessionMemory
  tts?: OrbVoiceTtsMetadata
}): OrbVoiceHandoffPayload {
  const selectedVoice = resolveSelectedVoiceLabel(input.tts || {})
  const payload = buildOrbVoiceHandoffPayload({
    mode: input.mode,
    conversationTranscript: input.conversationTranscript,
    summary: input.summary,
    suggestedTemplateId: input.suggestedTemplateId,
    sessionMemory: input.sessionMemory,
    selectedVoice
  })
  return {
    ...payload,
    ttsProvider: input.tts?.provider || undefined,
    ttsFallbackUsed: Boolean(input.tts?.fallbackUsed)
  }
}

export function voiceResponseLooksReflective(reply: string): boolean {
  const trimmed = reply.trim()
  if (!trimmed) return false
  return trimmed.includes('?') || trimmed.split(/\s+/).length <= 80
}
