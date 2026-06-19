/**
 * Server transcription (record-and-send) UI copy — Safari / Firefox.
 */

import type { OrbVoiceLaunchUiState } from './orb-voice-launch-mode'
import type { OrbWebVoiceEngineState } from './engine/orb-web-voice-engine-types'

export const ORB_VOICE_SERVER_NO_TRANSCRIPT_HEADLINE = 'No speech was captured.'
export const ORB_VOICE_SERVER_NO_TRANSCRIPT_DETAIL =
  'Try again, use Dictate, or use Chat.'

export const ORB_VOICE_SERVER_NO_TRANSCRIPT_SAFARI =
  'Safari could not capture speech in this session. You can try again, use Dictate, or type in Chat.'

export function isOrbServerTranscriptionTransport(transport: string | null | undefined): boolean {
  return transport === 'server_transcription'
}

export function orbVoiceServerTranscriptionHeadline(
  state: OrbVoiceLaunchUiState,
  engineState?: OrbWebVoiceEngineState
): string {
  if (engineState === 'transcribing') return 'Processing your voice…'
  switch (state) {
    case 'ready':
      return 'Ready to record'
    case 'starting':
      return 'Opening microphone…'
    case 'listening':
      return 'Recording…'
    case 'transcribing':
      return 'Processing your voice…'
    case 'thinking':
      return 'ORB is thinking…'
    case 'speaking':
      return 'ORB is responding.'
    case 'unavailable':
      return 'Voice is not available in this browser.'
    case 'error':
      return ORB_VOICE_SERVER_NO_TRANSCRIPT_HEADLINE
    default:
      return 'Ready to record'
  }
}

export function orbVoiceServerTranscriptionPrimaryLabel(
  state: OrbVoiceLaunchUiState
): string {
  if (state === 'listening') return 'Stop and send'
  if (state === 'transcribing' || state === 'thinking' || state === 'speaking') return 'Please wait…'
  if (state === 'unavailable' || state === 'error') return 'Use Dictate or type'
  return 'Start recording'
}

export function orbVoiceServerTranscriptionDetailLine(
  engineState: OrbWebVoiceEngineState
): string | null {
  switch (engineState) {
    case 'listening':
    case 'capturing':
      return 'Speak naturally, then tap Stop and send.'
    case 'transcribing':
      return 'Sending your recording for transcription…'
    case 'thinking':
      return 'ORB is structuring what you shared.'
    default:
      return null
  }
}
