/** ORB Voice — shared types for conversational voice in ORB Residential. */

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

export type OrbVoicePresetId =
  | 'orb_british_female'
  | 'orb_british_calm'
  | 'orb_british_professional'
  | 'system_fallback'

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

export const ORB_VOICE_PRESETS: Array<{ id: OrbVoicePresetId; label: string }> = [
  { id: 'orb_british_female', label: 'ORB British Female' },
  { id: 'orb_british_calm', label: 'ORB British Calm' },
  { id: 'orb_british_professional', label: 'ORB British Professional' },
  { id: 'system_fallback', label: 'System voice fallback' }
]

export const ORB_VOICE_SETTINGS_STORAGE_KEY = 'orb-voice-settings'
export const ORB_VOICE_SETTINGS_LEGACY_KEY = 'orb-standalone-voice-settings'

export const ORB_VOICE_GREETING =
  "Hello. I'm ORB. How can I help you today?"
