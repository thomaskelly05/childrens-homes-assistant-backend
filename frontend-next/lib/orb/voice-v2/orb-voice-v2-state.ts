import type { OrbVoiceV2State } from './orb-voice-v2-types.ts'

export const ORB_VOICE_V2_STATUS_LABEL: Record<OrbVoiceV2State, string> = {
  idle: 'Ready',
  requesting_microphone: 'Connecting microphone…',
  listening: 'Listening…',
  speech_detected: 'Listening…',
  transcribing: 'Processing your voice…',
  thinking: 'ORB is thinking…',
  speaking: 'ORB is responding…',
  paused: 'Paused',
  summary_ready: 'Summary ready',
  error: 'Voice unavailable'
}

export function orbVoiceV2PrimaryLabel(state: OrbVoiceV2State): string {
  if (state === 'idle') return 'Start conversation'
  if (state === 'paused') return 'Resume'
  if (state === 'summary_ready') return 'Start new conversation'
  return ORB_VOICE_V2_STATUS_LABEL[state]
}

export function mapOrbVoiceV2ToCompanionState(
  state: OrbVoiceV2State
): 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'summary_ready' | 'error' {
  if (state === 'requesting_microphone' || state === 'speech_detected' || state === 'transcribing') {
    return state === 'transcribing' ? 'thinking' : 'listening'
  }
  if (state === 'listening') return 'listening'
  if (state === 'thinking') return 'thinking'
  if (state === 'speaking') return 'speaking'
  if (state === 'paused') return 'paused'
  if (state === 'summary_ready') return 'summary_ready'
  if (state === 'error') return 'error'
  return 'idle'
}

export function canOrbVoiceV2AutoListen(state: OrbVoiceV2State): boolean {
  return state === 'listening' || state === 'speech_detected'
}
