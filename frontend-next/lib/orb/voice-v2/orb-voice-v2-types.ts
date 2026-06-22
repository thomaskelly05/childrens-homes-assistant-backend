export type OrbVoiceV2PermissionState =
  | 'ready'
  | 'microphone_prompt'
  | 'microphone_denied'
  | 'autoplay_blocked'
  | 'auto_resume_blocked'
  | 'audio_playback_blocked'

export type OrbVoiceV2State =
  | 'idle'
  | 'requesting_microphone'
  | 'listening'
  | 'speech_detected'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'summary_ready'
  | 'error'

export type OrbVoiceV2Mode =
  | 'incident_reflection'
  | 'safeguarding_thinking'
  | 'supervision_prep'
  | 'daily_reflection'
  | 'missing_from_home_debrief'
  | 'wording_support'
  | 'just_talk'

export type OrbVoiceV2Turn = {
  id: string
  role: 'adult' | 'orb'
  text: string
}

export type OrbVoiceV2BrainTier = 'voice_fast' | 'voice_specialist' | 'voice_safeguarding'

export type OrbVoiceV2Intent =
  | 'incident_reflection'
  | 'bullying_or_peer_conflict'
  | 'safeguarding_thinking'
  | 'missing_from_home'
  | 'restraint_or_physical_intervention'
  | 'allegation_or_complaint'
  | 'supervision_prep'
  | 'recording_wording'
  | 'manager_oversight'
  | 'daily_reflection'
  | 'general_reflection'

export type OrbVoiceV2SessionMemory = {
  possibleRecordType?: string
  keyPeopleMentioned?: string[]
  knownFacts?: string[]
  missingInfo?: string[]
  possibleFollowUp?: string[]
  lastIntent?: string
  lastBrainTier?: string
}

export type OrbVoiceV2RespondResult = {
  reply: string
  safetyBoundaryApplied: boolean
  promptTier: OrbVoiceV2BrainTier
  intent?: OrbVoiceV2Intent
  brainTier?: OrbVoiceV2BrainTier
  riskLevel?: 'low' | 'medium' | 'high'
  sessionMemory?: OrbVoiceV2SessionMemory
  suggestedProtocol?: string
}

export type OrbVoiceV2SpeakResult = {
  ok: boolean
  blob?: Blob
  provider?: string
  voiceName?: string
  fallbackUsed?: boolean
  fallbackReason?: string | null
  error?: string
}

export type OrbVoiceV2Status = {
  katherineReady: boolean
  ttsProviderEffective: string
  ttsProviderForced?: string | null
  fallbackReason?: string | null
  elevenLabsConfigured?: boolean
  katherineConfigured?: boolean
}

export type OrbVoiceV2HandoffPayload = {
  source: 'orb_voice_v2'
  mode: OrbVoiceV2Mode
  conversationTranscript: string
  summary: string
  summaryMarkdown?: string
  whatMayNeedRecording?: string
  followUpOrOversight?: string
  audioStored: false
  selectedVoice: 'katherine'
  ttsProvider: string | null
  adultReviewStatus: 'generated_for_adult_review'
  createdAt?: string
  intent?: OrbVoiceV2Intent
  sessionMemory?: OrbVoiceV2SessionMemory
}
