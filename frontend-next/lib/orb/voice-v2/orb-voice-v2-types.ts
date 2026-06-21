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

export type OrbVoiceV2RespondResult = {
  reply: string
  safetyBoundaryApplied: boolean
  promptTier: 'voice_fast'
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
  audioStored: false
  selectedVoice: 'katherine'
  ttsProvider: string | null
  adultReviewStatus: 'generated_for_adult_review'
}
