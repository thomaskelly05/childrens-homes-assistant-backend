export type OrbVoiceProfileId =
  | 'calm_reflective'
  | 'safeguarding_cautious'
  | 'nighttime_handover'
  | 'child_present'
  | 'management_review'
  | 'inspection_preparation'
  | 'general_assistant'
  | 'emotional_safety'

export type OrbVoiceRoute = {
  providerRoute: 'openai_realtime_ephemeral' | 'caption_text_fallback'
  browserApiKeyExposure: false
  rawAudioLogs: false
  bargeIn: boolean
  fallbackTextMode: boolean
  responseBrevity: 'brief' | 'short' | 'concise'
}

export function planOrbVoiceRoute(profile: OrbVoiceProfileId = 'calm_reflective', realtimeConfigured = false): OrbVoiceRoute {
  const cautious = ['safeguarding_cautious', 'child_present', 'emotional_safety', 'nighttime_handover'].includes(profile)
  return {
    providerRoute: realtimeConfigured ? 'openai_realtime_ephemeral' : 'caption_text_fallback',
    browserApiKeyExposure: false,
    rawAudioLogs: false,
    bargeIn: realtimeConfigured,
    fallbackTextMode: !realtimeConfigured,
    responseBrevity: cautious ? 'short' : 'concise'
  }
}

