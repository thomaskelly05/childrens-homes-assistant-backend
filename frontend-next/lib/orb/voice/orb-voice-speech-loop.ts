/** Phase 4C — Voice speech detection and spoken response loop helpers. */

export type VoiceInputStatus =
  | 'idle'
  | 'requesting_microphone'
  | 'listening'
  | 'speech_detected'
  | 'transcribing'
  | 'no_speech_detected'
  | 'no_audio_captured'
  | 'transcription_unavailable'
  | 'transcript_ready'
  | 'speech_unsupported'
  | 'microphone_error'

export const ORB_VOICE_LISTENING_SPEAK_NOW =
  'Listening… speak now.' as const

export const ORB_VOICE_NO_SPEECH_DETECTED =
  'No speech was detected. Try again, check your microphone, or type your reflection instead.' as const

export const ORB_VOICE_NO_AUDIO_CAPTURED =
  'No audio was captured. Check microphone permission and try again.' as const

export const ORB_VOICE_TRANSCRIPTION_UNAVAILABLE =
  'Voice transcription is not available right now. Type your reflection instead.' as const

export const ORB_VOICE_SPEECH_UNSUPPORTED =
  'Speech detection is not available in this browser. You can type your reflection instead.' as const

export const ORB_VOICE_TTS_SPOKEN_FALLBACK =
  'ORB could not speak the response, but the written reply is shown below.' as const

export const ORB_VOICE_TYPE_INSTEAD_LABEL = 'Type instead' as const
export const ORB_VOICE_TYPE_INSTEAD_PLACEHOLDER =
  'Type what you wanted to say to ORB…' as const
export const ORB_VOICE_TYPE_INSTEAD_SEND = 'Send to ORB' as const

/** Milliseconds of silence after the last final transcript chunk before auto-submit. */
export const ORB_VOICE_AUTO_SUBMIT_DEBOUNCE_MS = 2_500

/** Listening timeout when no partial/final speech is captured. */
export const ORB_VOICE_NO_SPEECH_TIMEOUT_MS = 15_000

export type CommitVoiceTranscriptResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'unsupported' }

export function commitVoiceTranscriptOrBlock(transcript: string): CommitVoiceTranscriptResult {
  const clean = transcript.trim()
  if (!clean) return { ok: false, reason: 'empty' }
  return { ok: true, text: clean }
}

export function voiceInputStatusFromTranscriptionFailure(input: {
  noTranscriptReason?: string | null
  errorCode?: string | null
}): VoiceInputStatus {
  const reason = input.noTranscriptReason || ''
  const code = input.errorCode || ''
  if (reason === 'transcription_unavailable' || code === 'voice_transcription_unavailable') {
    return 'transcription_unavailable'
  }
  if (reason === 'empty_audio_blob' || code === 'empty_audio_blob') return 'no_audio_captured'
  if (reason === 'empty_transcript' || code === 'voice_transcription_empty') {
    return 'no_speech_detected'
  }
  if (reason === 'transcription_failed') return 'transcription_unavailable'
  return 'no_speech_detected'
}

export function voiceInputStatusLabel(status: VoiceInputStatus): string | null {
  switch (status) {
    case 'requesting_microphone':
      return 'Opening microphone…'
    case 'listening':
      return ORB_VOICE_LISTENING_SPEAK_NOW
    case 'speech_detected':
      return 'I heard that.'
    case 'transcribing':
      return 'Processing what you said…'
    case 'no_speech_detected':
      return ORB_VOICE_NO_SPEECH_DETECTED
    case 'no_audio_captured':
      return ORB_VOICE_NO_AUDIO_CAPTURED
    case 'transcription_unavailable':
      return ORB_VOICE_TRANSCRIPTION_UNAVAILABLE
    case 'transcript_ready':
      return null
    case 'speech_unsupported':
      return ORB_VOICE_SPEECH_UNSUPPORTED
    case 'microphone_error':
      return 'Voice could not start. Check microphone permission or type your reflection instead.'
    default:
      return null
  }
}
