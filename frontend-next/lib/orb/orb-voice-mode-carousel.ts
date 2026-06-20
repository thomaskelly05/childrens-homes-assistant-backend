/** Phase 2A — Voice station style and reasoning mode carousel copy. */

import type { OrbVoiceModeId } from '@/lib/orb/voice/orb-voice-types'
import type { OrbVoiceProfileId } from '@/lib/orb/voice/orb-voice-profiles'

export type OrbVoiceStyleId = 'calm' | 'warm' | 'direct' | 'reflective'

export type OrbVoiceReasoningModeId =
  | 'talk_through'
  | 'safeguarding_thinking'
  | 'supervision_prep'
  | 'clear_summary'

export const ORB_VOICE_STYLE_OPTIONS: Array<{
  id: OrbVoiceStyleId
  label: string
  profileId: OrbVoiceProfileId
}> = [
  { id: 'calm', label: 'Calm', profileId: 'calm_female' },
  { id: 'warm', label: 'Warm', profileId: 'soft_supportive' },
  { id: 'direct', label: 'Direct', profileId: 'concise_shift' },
  { id: 'reflective', label: 'Reflective', profileId: 'soft_supportive' }
]

export const ORB_VOICE_REASONING_OPTIONS: Array<{
  id: OrbVoiceReasoningModeId
  label: string
  voiceModeId: OrbVoiceModeId
  description: string
}> = [
  {
    id: 'talk_through',
    label: 'Talk it through',
    voiceModeId: 'conversational',
    description: 'ORB will help you think aloud before you write — calm, practical and child-centred.'
  },
  {
    id: 'safeguarding_thinking',
    label: 'Safeguarding thinking',
    voiceModeId: 'safeguarding_support',
    description:
      'ORB will help you slow down, separate fact from interpretation and consider what may need oversight.'
  },
  {
    id: 'supervision_prep',
    label: 'Supervision prep',
    voiceModeId: 'reflective_practice',
    description: 'ORB will help you reflect on practice, evidence gaps and what to bring to supervision.'
  },
  {
    id: 'clear_summary',
    label: 'Clear summary',
    voiceModeId: 'recording_support',
    description: 'ORB will help you shape spoken notes into clearer recording language for adult review.'
  }
]

export function resolveVoiceStyleProfileId(styleId: OrbVoiceStyleId): OrbVoiceProfileId {
  return ORB_VOICE_STYLE_OPTIONS.find((option) => option.id === styleId)?.profileId ?? 'calm_female'
}

export function resolveVoiceReasoningModeId(modeId: OrbVoiceReasoningModeId): OrbVoiceModeId {
  return (
    ORB_VOICE_REASONING_OPTIONS.find((option) => option.id === modeId)?.voiceModeId ?? 'conversational'
  )
}

export function describeVoiceModeSelection(styleId: OrbVoiceStyleId, reasoningId: OrbVoiceReasoningModeId): {
  headline: string
  description: string
} {
  const style = ORB_VOICE_STYLE_OPTIONS.find((option) => option.id === styleId)?.label ?? 'Calm'
  const reasoning = ORB_VOICE_REASONING_OPTIONS.find((option) => option.id === reasoningId)
  return {
    headline: `${style} voice · ${reasoning?.label ?? 'Talk it through'}`,
    description: reasoning?.description ?? ORB_VOICE_REASONING_OPTIONS[0].description
  }
}
