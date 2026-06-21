import type { OrbVoiceV2PermissionState, OrbVoiceV2State } from './orb-voice-v2-types.ts'

export type OrbVoiceV2StartClickTrace = {
  event: 'voice_v2_start_click'
  currentState: OrbVoiceV2State
  buttonDisabled: boolean
  audioUnlocked: boolean
  hasMicPermissionKnown: boolean
}

export function traceOrbVoiceV2StartClick(input: {
  currentState: OrbVoiceV2State
  buttonDisabled: boolean
  audioUnlocked: boolean
  permissionState: OrbVoiceV2PermissionState
}): OrbVoiceV2StartClickTrace {
  const payload: OrbVoiceV2StartClickTrace = {
    event: 'voice_v2_start_click',
    currentState: input.currentState,
    buttonDisabled: input.buttonDisabled,
    audioUnlocked: input.audioUnlocked,
    hasMicPermissionKnown: input.permissionState !== 'ready' && input.permissionState !== 'microphone_prompt'
  }
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('[orb-voice-v2]', payload)
  }
  return payload
}
