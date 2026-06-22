/** Safe realtime lifecycle traces — never log transcript or care content. */

export type OrbVoiceRealtimeTraceEvent =
  | 'orb_voice_realtime_mode_selected'
  | 'orb_voice_realtime_session_started'
  | 'orb_voice_realtime_partial_received'
  | 'orb_voice_realtime_final_received'
  | 'orb_voice_realtime_fallback'

export function traceOrbVoiceRealtime(
  event: OrbVoiceRealtimeTraceEvent,
  payload: Record<string, string | number | boolean | null | undefined> = {}
): void {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  console.debug('[orb-voice-v2]', { event, ...payload })
}
