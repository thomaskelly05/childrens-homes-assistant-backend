/** Phase 4B — human conversation convergence: copy, Katherine voice, session memory. */

import type { VoiceTurn } from './orb-voice-types.ts'
import { frameMessageForOrbVoice } from './orb-voice-prompt.ts'
import {
  orbVoiceReflectiveModeById,
  type OrbVoiceReflectiveModeId
} from './orb-voice-reflective-modes.ts'
import type { OrbSpokenAnswerLength } from './orb-voice-types.ts'

export const ORB_KATHERINE_VOICE_ID = 'katherine' as const
export const ORB_KATHERINE_VOICE_LABEL = 'Katherine' as const
export const ORB_KATHERINE_VOICE_DESCRIPTION =
  'ORB voice: Katherine — British, calm and professional' as const

export const ORB_VOICE_LISTENING_LABEL = 'Listening…' as const
export const ORB_VOICE_STOP_LABEL = 'Stop' as const
export const ORB_VOICE_SPEAKING_LABEL = 'ORB is responding…' as const
export const ORB_VOICE_STOP_ORB = 'Stop ORB' as const
export const ORB_VOICE_PAUSE_CONVERSATION = 'Pause conversation' as const
export const ORB_VOICE_RESET_CONVERSATION = 'Reset conversation' as const
export const ORB_VOICE_SLOW_THINKING_MESSAGE =
  'ORB is still thinking. You can pause or continue typing instead.' as const
export const ORB_VOICE_TTS_SPOKEN_FALLBACK =
  'ORB could not speak the response, but the written reply is shown below.' as const

export type OrbVoiceSessionMemory = {
  modeId: OrbVoiceReflectiveModeId
  turnCount: number
  adultTurnCount: number
  orbTurnCount: number
  mentionedPeople: string[]
  suggestedTemplateId?: string
  unresolvedQuestions: string[]
  summaryRequested: boolean
}

export function resolveTtsVoiceProfileId(profileId: string): string {
  if (
    profileId === ORB_KATHERINE_VOICE_ID ||
    profileId === 'orb_british_female' ||
    profileId === 'orb_british_female_warm'
  ) {
    return ORB_KATHERINE_VOICE_ID
  }
  return profileId
}

export function buildVoiceSessionMemory(input: {
  modeId: OrbVoiceReflectiveModeId
  turns: VoiceTurn[]
  summaryRequested?: boolean
}): OrbVoiceSessionMemory {
  const adultTurns = input.turns.filter((t) => t.role === 'user')
  const orbTurns = input.turns.filter((t) => t.role === 'assistant')
  const combined = input.turns.map((t) => t.text).join('\n')
  const people = new Set<string>()
  for (const match of combined.matchAll(/\b(?:with|called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g)) {
    if (match[1]) people.add(match[1].trim())
  }
  const unresolvedQuestions = orbTurns
    .flatMap((t) => t.text.split('\n'))
    .filter((line) => line.includes('?'))
    .slice(-4)

  return {
    modeId: input.modeId,
    turnCount: input.turns.length,
    adultTurnCount: adultTurns.length,
    orbTurnCount: orbTurns.length,
    mentionedPeople: [...people],
    suggestedTemplateId: orbVoiceReflectiveModeById(input.modeId).suggestedTemplateId,
    unresolvedQuestions,
    summaryRequested: Boolean(input.summaryRequested)
  }
}

export function buildVoiceBrainMessage(
  userText: string,
  input: {
    reflectiveModeId: OrbVoiceReflectiveModeId
    spokenAnswerLength: OrbSpokenAnswerLength
    voiceProfileId?: string
    sessionMemory?: OrbVoiceSessionMemory
  }
): string {
  const mode = orbVoiceReflectiveModeById(input.reflectiveModeId)
  const memoryNote = input.sessionMemory
    ? [
        `Reflective topic: ${mode.label}.`,
        input.sessionMemory.adultTurnCount > 1
          ? `This is turn ${input.sessionMemory.adultTurnCount} in the current voice session.`
          : '',
        input.sessionMemory.mentionedPeople.length
          ? `People mentioned so far: ${input.sessionMemory.mentionedPeople.join(', ')}.`
          : ''
      ]
        .filter(Boolean)
        .join(' ')
    : `Reflective topic: ${mode.label}.`

  const framed = frameMessageForOrbVoice(userText, {
    mode: mode.voiceModeId,
    spokenAnswerLength: input.spokenAnswerLength,
    voiceProfileId: input.voiceProfileId
  })

  return `${framed}\n\n${memoryNote}`.trim()
}

export function stripForSpokenReply(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
