export const ORB_VOICE_V2_TITLE = 'Voice' as const
export const ORB_VOICE_V2_SUBTITLE = 'Talk it through with ORB before you write.' as const
export const ORB_VOICE_V2_MODE_PROMPT = 'What are you talking through?' as const
export const ORB_VOICE_V2_TRANSCRIPT_LABEL = 'Voice conversation' as const
export const ORB_VOICE_V2_TRANSCRIPT_NOTE = 'Reflection notes — not yet a record' as const
export const ORB_VOICE_V2_SAFETY_FOOTER =
  'Voice is for reflective support. Audio is not stored. Review any summary before use.' as const
export const ORB_VOICE_V2_ADULT_REVIEW_LABEL = 'Generated for adult review' as const
export const ORB_VOICE_V2_TRANSCRIPTION_ERROR =
  'Voice could not hear that clearly. You can try again or type what you wanted to say.' as const
export const ORB_VOICE_V2_TYPE_INSTEAD = 'Type instead' as const
export const ORB_VOICE_V2_TYPE_PLACEHOLDER = 'Type what you wanted to say to ORB…' as const
export const ORB_VOICE_V2_SEND_TYPED = 'Send to ORB' as const
export const ORB_VOICE_V2_PREPARING_VOICE = 'ORB is preparing voice…' as const
export const ORB_VOICE_V2_CONTINUE_WITHOUT_VOICE = 'Continue without voice' as const
export const ORB_VOICE_V2_CONTINUE_CONVERSATION = 'Continue conversation' as const
export const ORB_VOICE_V2_MIC_DENIED =
  'Microphone permission is blocked. Check Safari settings or type instead.' as const
export const ORB_VOICE_V2_MIC_NOT_FOUND =
  'No microphone was found. Check your device or type instead.' as const
export const ORB_VOICE_V2_MIC_NOT_READABLE =
  'The microphone could not start. Try again or type instead.' as const
export const ORB_VOICE_V2_MIC_UNAVAILABLE =
  'The microphone could not start. Try again or type instead.' as const
export const ORB_VOICE_V2_MIC_TIMEOUT =
  'Microphone did not respond. Check Safari permissions or type instead.' as const
export const ORB_VOICE_V2_TRY_AGAIN = 'Try again' as const
export const ORB_VOICE_V2_LISTENING_HINT = 'Speak naturally. You can pause.' as const
export const ORB_VOICE_V2_SAFARI_AUTO_RESUME =
  'Safari needs you to tap once to continue listening.' as const
export const ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED =
  'Safari blocked automatic playback. Tap Play ORB voice to hear the reply.' as const
export const ORB_VOICE_V2_AUDIO_UNLOCK_SOFT_FAIL =
  'Audio playback may need a tap later. You can still start the conversation.' as const
export const ORB_VOICE_V2_PLAY_ORB_VOICE = 'Play ORB voice' as const
export const ORB_VOICE_V2_FALLBACK_VOICE_TURN = 'Using fallback voice for this reply.' as const
export const ORB_VOICE_V2_KATHERINE_FORCED_OPENAI =
  'Katherine is unavailable — OpenAI fallback is forced in server settings.' as const
export const ORB_VOICE_V2_KATHERINE_MISSING_ELEVENLABS =
  'Katherine is unavailable — ElevenLabs is not configured.' as const
export const ORB_VOICE_V2_KATHERINE_FALLBACK =
  'Katherine is unavailable, so ORB is using a fallback voice.' as const
export const ORB_VOICE_V2_LIVE_SPOKEN_CAP = 320

export const ORB_VOICE_V2_MODES = [
  { id: 'just_talk', label: 'Just talk it through' },
  { id: 'incident_reflection', label: 'Reflect after an incident' },
  { id: 'safeguarding_thinking', label: 'Safeguarding thinking' },
  { id: 'supervision_prep', label: 'Supervision prep' },
  { id: 'daily_reflection', label: 'Daily reflection' },
  { id: 'missing_from_home_debrief', label: 'Missing from home debrief' },
  { id: 'wording_support', label: 'Wording support' }
] as const
