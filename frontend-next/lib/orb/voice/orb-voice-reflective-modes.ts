/** Phase 4A — reflective voice topic modes for ORB Voice. */

import type { OrbVoiceModeId } from './orb-voice-types.ts'

export type OrbVoiceReflectiveModeId =
  | 'incident_reflection'
  | 'safeguarding_thinking'
  | 'supervision_prep'
  | 'daily_reflection'
  | 'missing_debrief'
  | 'wording_support'
  | 'just_talk'

export type OrbVoiceReflectiveMode = {
  id: OrbVoiceReflectiveModeId
  label: string
  hint: string
  voiceModeId: OrbVoiceModeId
  suggestedTemplateId?: string
}

export const ORB_VOICE_REFLECTIVE_MODES: OrbVoiceReflectiveMode[] = [
  {
    id: 'incident_reflection',
    label: 'Reflect after an incident',
    hint: 'Talk through what happened before you write it up.',
    voiceModeId: 'reflective_practice',
    suggestedTemplateId: 'incident'
  },
  {
    id: 'safeguarding_thinking',
    label: 'Safeguarding thinking',
    hint: 'Organise concerns — ORB does not make safeguarding decisions.',
    voiceModeId: 'safeguarding_support',
    suggestedTemplateId: 'safeguarding'
  },
  {
    id: 'supervision_prep',
    label: 'Supervision prep',
    hint: 'Prepare themes and learning for supervision.',
    voiceModeId: 'reflective_practice',
    suggestedTemplateId: 'supervision_prep'
  },
  {
    id: 'daily_reflection',
    label: 'Daily reflection',
    hint: 'Reflect on the day and what may need recording.',
    voiceModeId: 'reflective_practice',
    suggestedTemplateId: 'daily_record'
  },
  {
    id: 'missing_debrief',
    label: 'Missing from home debrief',
    hint: 'Debrief after a missing episode before formal recording.',
    voiceModeId: 'reflective_practice',
    suggestedTemplateId: 'missing'
  },
  {
    id: 'wording_support',
    label: 'Wording support',
    hint: 'Practise calm, professional wording.',
    voiceModeId: 'recording_support',
    suggestedTemplateId: 'general'
  },
  {
    id: 'just_talk',
    label: 'Just talk it through',
    hint: 'Open reflection with no fixed template.',
    voiceModeId: 'conversational',
    suggestedTemplateId: 'general'
  }
]

export const ORB_VOICE_REFLECTIVE_MODE_DEFAULT: OrbVoiceReflectiveModeId = 'just_talk'

export function orbVoiceReflectiveModeById(id: OrbVoiceReflectiveModeId): OrbVoiceReflectiveMode {
  return ORB_VOICE_REFLECTIVE_MODES.find((m) => m.id === id) ?? ORB_VOICE_REFLECTIVE_MODES.at(-1)!
}

export function isSafeguardingReflectiveMode(modeId: OrbVoiceReflectiveModeId): boolean {
  return modeId === 'safeguarding_thinking' || modeId === 'incident_reflection' || modeId === 'missing_debrief'
}
