/** ORB Voice — shared types for conversational voice in ORB Residential. */

import {
  DEFAULT_ORB_VOICE_PROFILE_ID,
  ORB_VOICE_PROFILES,
  type OrbVoiceProfileId
} from '@/lib/orb/voice/orb-voice-profiles'

export type OrbVoiceSessionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'speech_detected'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'error'
  | 'ended'

export type OrbVoiceModeId =
  | 'conversational'
  | 'reflective_practice'
  | 'recording_support'
  | 'inspection_readiness'
  | 'safeguarding_support'
  | 'learning_coach'

/** User-selected ORB voice profile (not raw OpenAI voice ID). */
export type OrbVoicePresetId = OrbVoiceProfileId

export type OrbSpokenAnswerLength = 'short' | 'balanced' | 'detailed'

export type VoiceTurnRole = 'user' | 'assistant' | 'system'

export type VoiceTurn = {
  id: string
  role: VoiceTurnRole
  text: string
  startedAt: string
  completedAt?: string
  interrupted?: boolean
  mode?: OrbVoiceModeId
  provider?: string
}

export type OrbVoiceSessionState = {
  status: OrbVoiceSessionStatus
  isMicEnabled: boolean
  isSpeaking: boolean
  selectedVoiceId: OrbVoicePresetId
  mode: OrbVoiceModeId
  transcript: VoiceTurn[]
  error?: string
}

export const ORB_VOICE_MODES: Array<{ id: OrbVoiceModeId; label: string; hint: string }> = [
  {
    id: 'conversational',
    label: 'Conversational',
    hint: 'Natural back-and-forth with ORB.'
  },
  {
    id: 'reflective_practice',
    label: 'Reflective practice',
    hint: 'Supervision, incidents, and professional curiosity.'
  },
  {
    id: 'recording_support',
    label: 'Recording support',
    hint: 'Turn spoken notes into professional recording wording.'
  },
  {
    id: 'inspection_readiness',
    label: 'Inspection readiness',
    hint: 'Ofsted, SCCIF, and quality standards preparation.'
  },
  {
    id: 'safeguarding_support',
    label: 'Safeguarding support',
    hint: 'Calm, procedure-aware — does not replace safeguarding procedures.'
  },
  {
    id: 'learning_coach',
    label: 'Learning coach',
    hint: 'Micro-learning and staff briefing from a topic.'
  }
]

export const ORB_VOICE_PRESETS = ORB_VOICE_PROFILES.map((p) => ({ id: p.id as OrbVoicePresetId, label: p.label }))

export { DEFAULT_ORB_VOICE_PROFILE_ID }

export const ORB_VOICE_SETTINGS_STORAGE_KEY = 'orb-voice-settings'
export const ORB_VOICE_SETTINGS_LEGACY_KEY = 'orb-standalone-voice-settings'

export const ORB_VOICE_GREETING =
  "Hello. I'm ORB. How can I help you today?"
