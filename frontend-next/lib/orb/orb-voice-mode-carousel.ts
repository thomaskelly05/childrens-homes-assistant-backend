/** Phase 3A — Voice station style and reasoning mode copy. */

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
  description: string
}> = [
  {
    id: 'calm',
    label: 'Calm',
    profileId: 'calm_female',
    description: 'A steady voice for slowing things down and thinking clearly.'
  },
  {
    id: 'warm',
    label: 'Warm',
    profileId: 'soft_supportive',
    description: 'A supportive voice for reflective conversations and reassurance.'
  },
  {
    id: 'direct',
    label: 'Direct',
    profileId: 'concise_shift',
    description: 'A focused voice for clear next steps and concise summaries.'
  },
  {
    id: 'reflective',
    label: 'Reflective',
    profileId: 'soft_supportive',
    description: 'A thoughtful voice for supervision, learning and deeper reflection.'
  }
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
    description: 'Explore what happened before deciding what needs recording.'
  },
  {
    id: 'safeguarding_thinking',
    label: 'Safeguarding thinking',
    voiceModeId: 'safeguarding_support',
    description:
      'Separate facts, observations, worries and possible next steps. Follow local policy where needed.'
  },
  {
    id: 'supervision_prep',
    label: 'Supervision prep',
    voiceModeId: 'reflective_practice',
    description: 'Turn thoughts into reflective points for supervision or management discussion.'
  },
  {
    id: 'clear_summary',
    label: 'Clear summary',
    voiceModeId: 'recording_support',
    description: 'Create a concise summary of what was discussed and what may need follow-up.'
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
  const style = ORB_VOICE_STYLE_OPTIONS.find((option) => option.id === styleId)
  const reasoning = ORB_VOICE_REASONING_OPTIONS.find((option) => option.id === reasoningId)
  return {
    headline: `${style?.label ?? 'Calm'} voice · ${reasoning?.label ?? 'Talk it through'}`,
    description:
      reasoning?.description ??
      'ORB will help you slow down, separate fact from interpretation and consider what may need oversight.'
  }
}
