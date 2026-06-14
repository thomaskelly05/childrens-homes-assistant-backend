/**
 * Calm Voice-station copy when browser speech recognition fails but Voice may still work.
 */

export const ORB_VOICE_SPEECH_NOTICE_CALM =
  'Browser speech recognition is optional for Voice. You can still start a voice session, open Dictate, or type.'

export const ORB_VOICE_SPEECH_NOTICE_DICTATE =
  'Dictate turns speech into records. Voice is for spoken ORB conversation.'

export function isOrbSpeechRecognitionErrorMessage(message: string | null | undefined): boolean {
  if (!message?.trim()) return false
  const lower = message.trim().toLowerCase()
  return (
    lower.includes('speech recognition') ||
    lower.includes('browser speech') ||
    lower.includes('could not start') ||
    lower.includes('not stable in this browser')
  )
}

export function orbVoiceCalmSpeechNotice(error: string | null | undefined): string | null {
  if (!isOrbSpeechRecognitionErrorMessage(error)) return null
  return ORB_VOICE_SPEECH_NOTICE_CALM
}

export function orbVoiceStationHeadline(input: {
  preferredHeadline: string
  speechError: string | null | undefined
  realtimeAvailable: boolean
  sessionLive: boolean
}): { headline: string; speechNotice: string | null } {
  const calm = orbVoiceCalmSpeechNotice(input.speechError)
  if (!calm) {
    return { headline: input.preferredHeadline, speechNotice: null }
  }

  if (input.sessionLive) {
    return { headline: input.preferredHeadline, speechNotice: calm }
  }

  if (input.realtimeAvailable) {
    return {
      headline: input.preferredHeadline,
      speechNotice: calm
    }
  }

  return {
    headline: input.preferredHeadline,
    speechNotice: calm
  }
}
