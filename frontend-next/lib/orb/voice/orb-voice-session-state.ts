/**
 * Phase 4F — single ORB Voice session state machine.
 * Drives primary UI labels and recovery copy from one source of truth.
 */

import type { OrbWebVoiceEngineState } from './engine/orb-web-voice-engine-types.ts'
import {
  ORB_VOICE_BUTTON_LISTENING,
  ORB_VOICE_BUTTON_PAUSE,
  ORB_VOICE_BUTTON_SPEAKING,
  ORB_VOICE_BUTTON_START,
  ORB_VOICE_BUTTON_STOP_ORB,
  ORB_VOICE_BUTTON_THINKING,
  ORB_VOICE_END_AND_SUMMARISE
} from './orb-voice-reflective-copy.ts'
import {
  ORB_VOICE_PROCESSING_LABEL,
  ORB_VOICE_START_CONVERSATION
} from './orb-voice-free-flowing-conversation.ts'
import {
  ORB_VOICE_NO_AUDIO_CAPTURED,
  ORB_VOICE_NO_SPEECH_DETECTED,
  ORB_VOICE_TRANSCRIPTION_UNAVAILABLE,
  ORB_VOICE_SPEECH_UNSUPPORTED,
  type VoiceInputStatus
} from './orb-voice-speech-loop.ts'

/** Canonical Voice session states for UI + loop control. */
export type OrbVoiceSessionState =
  | 'idle'
  | 'requesting_microphone'
  | 'listening'
  | 'speech_detected'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'summary_ready'
  | 'microphone_error'
  | 'transcription_error'
  | 'tts_error'

export type ResolveOrbVoiceSessionStateInput = {
  engineState: OrbWebVoiceEngineState
  pending?: boolean
  speaking?: boolean
  paused?: boolean
  sessionEnded?: boolean
  inputStatus?: VoiceInputStatus | null
  conversationActive?: boolean
}

export function resolveOrbVoiceSessionState(
  input: ResolveOrbVoiceSessionStateInput
): OrbVoiceSessionState {
  if (input.sessionEnded) return 'summary_ready'
  if (input.paused) return 'paused'

  const status = input.inputStatus
  if (status === 'microphone_error') return 'microphone_error'
  if (status === 'transcription_unavailable') return 'transcription_error'
  if (status === 'no_audio_captured' || status === 'no_speech_detected') return 'transcription_error'
  if (status === 'speech_unsupported') return 'microphone_error'

  if (input.speaking || input.engineState === 'speaking') return 'speaking'
  if (input.pending || input.engineState === 'thinking') return 'thinking'
  if (input.engineState === 'transcribing' || status === 'transcribing') return 'transcribing'
  if (status === 'speech_detected') return 'speech_detected'
  if (input.engineState === 'requesting_permission' || status === 'requesting_microphone') {
    return 'requesting_microphone'
  }
  if (
    input.engineState === 'listening' ||
    input.engineState === 'capturing' ||
    status === 'listening'
  ) {
    return input.conversationActive || input.engineState !== 'idle' ? 'listening' : 'idle'
  }
  if (input.engineState === 'failed' || input.engineState === 'unsupported') {
    return 'microphone_error'
  }
  return input.conversationActive ? 'listening' : 'idle'
}

export function orbVoiceSessionPrimaryLabel(
  state: OrbVoiceSessionState,
  options?: { pushToTalk?: boolean; continuousConversation?: boolean }
): string {
  switch (state) {
    case 'idle':
      return ORB_VOICE_START_CONVERSATION
    case 'requesting_microphone':
      return 'Opening microphone…'
    case 'listening':
      return options?.pushToTalk ? 'Stop and send' : ORB_VOICE_BUTTON_LISTENING
    case 'speech_detected':
    case 'transcribing':
      return ORB_VOICE_PROCESSING_LABEL
    case 'thinking':
      return ORB_VOICE_BUTTON_THINKING
    case 'speaking':
      return ORB_VOICE_BUTTON_SPEAKING
    case 'paused':
      return 'Resume'
    case 'summary_ready':
      return ORB_VOICE_END_AND_SUMMARISE
    case 'microphone_error':
    case 'transcription_error':
    case 'tts_error':
      return 'Type instead'
    default:
      return ORB_VOICE_BUTTON_START
  }
}

export function orbVoiceSessionSecondaryLabel(state: OrbVoiceSessionState): string | null {
  if (state === 'listening' || state === 'speech_detected') return ORB_VOICE_BUTTON_PAUSE
  if (state === 'speaking') return 'Stop ORB'
  return null
}

export function orbVoiceSessionStatusLine(state: OrbVoiceSessionState): string | null {
  switch (state) {
    case 'listening':
      return 'Speak naturally. ORB will respond after a brief pause.'
    case 'speech_detected':
    case 'transcribing':
      return ORB_VOICE_PROCESSING_LABEL
    case 'thinking':
      return ORB_VOICE_BUTTON_THINKING
    case 'speaking':
      return 'ORB is responding in Katherine’s voice.'
    case 'paused':
      return 'Conversation paused. Tap Resume when you are ready.'
    case 'microphone_error':
      return ORB_VOICE_SPEECH_UNSUPPORTED
    case 'transcription_error':
      return ORB_VOICE_TRANSCRIPTION_UNAVAILABLE
    case 'summary_ready':
      return 'Review the summary before saving or handing off.'
    default:
      return null
  }
}

export function orbVoiceSessionAllowsAutoResume(state: OrbVoiceSessionState): boolean {
  return state === 'idle' || state === 'listening'
}

export function orbVoiceSessionBlocksPrimaryAction(
  state: OrbVoiceSessionState,
  options?: { continuousConversation?: boolean; pushToTalk?: boolean }
): boolean {
  if (state === 'thinking' || state === 'transcribing' || state === 'speaking') return true
  if (state === 'listening' && options?.continuousConversation && !options?.pushToTalk) return true
  return false
}

export function mapInputStatusToSessionState(status: VoiceInputStatus): OrbVoiceSessionState | null {
  switch (status) {
    case 'no_audio_captured':
      return 'transcription_error'
    case 'no_speech_detected':
      return 'transcription_error'
    case 'transcription_unavailable':
      return 'transcription_error'
    case 'microphone_error':
      return 'microphone_error'
    case 'speech_unsupported':
      return 'microphone_error'
    default:
      return null
  }
}

export const ORB_VOICE_SESSION_AUDIT = {
  station: 'components/orb-standalone/orb-voice-station.tsx',
  captureEngine: 'lib/orb/voice/engine/orb-web-voice-engine.ts',
  captureController: 'lib/orb/voice/orb-voice-capture-controller.ts',
  conversationLoop: 'lib/orb/voice/orb-voice-conversation-loop.ts',
  respondRoute: 'POST /orb/voice/respond',
  transcribeRoute: 'POST /orb/voice/transcribe/audio',
  ttsRoute: 'POST /orb/voice/tts'
} as const
