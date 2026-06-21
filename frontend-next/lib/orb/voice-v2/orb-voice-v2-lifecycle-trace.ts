export type OrbVoiceV2LifecycleEvent =
  | 'voice_v2_start_click'
  | 'voice_v2_audio_unlock_start'
  | 'voice_v2_audio_unlock_done'
  | 'voice_v2_get_user_media_start'
  | 'voice_v2_get_user_media_success'
  | 'voice_v2_get_user_media_error'
  | 'voice_v2_recorder_created'
  | 'voice_v2_recorder_started'
  | 'voice_v2_state_transition'
  | 'voice_v2_microphone_timeout'

export function traceOrbVoiceV2Lifecycle(
  event: OrbVoiceV2LifecycleEvent,
  payload: Record<string, string | number | boolean | null | undefined> = {}
): void {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  console.debug('[orb-voice-v2]', { event, ...payload })
}
