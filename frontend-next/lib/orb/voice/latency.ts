export function orbLatencyStrategy(options: { realtimeConfigured: boolean; networkQuality?: 'good' | 'normal' | 'poor' }) {
  if (options.realtimeConfigured && options.networkQuality !== 'poor') {
    return { route: 'realtime_voice', fallback: 'caption_text', targetAckMs: 350, streamFirstToken: true }
  }
  return { route: 'caption_text', fallback: 'browser_tts_optional', targetAckMs: 700, streamFirstToken: false }
}

export type OrbVoiceLatencyMark =
  | 'start_tap'
  | 'preparing'
  | 'listening'
  | 'first_transcript'
  | 'first_response'
  | 'after_call_ready'

export type OrbComposerLatencyMark = 'plus_tap' | 'plus_menu_open'

export type OrbDictateLatencyMark =
  | 'dictate_tap'
  | 'dictate_permission_requested'
  | 'dictate_stream_ready'

export type OrbInteractionLatencyMark =
  | OrbVoiceLatencyMark
  | OrbComposerLatencyMark
  | OrbDictateLatencyMark
  | 'voice_mic_permission_requested'
  | 'voice_stream_ready'
  | 'voice_backend_connected'

type LatencyEntry = { mark: OrbInteractionLatencyMark; at: number }

let enabled = false
const marks: LatencyEntry[] = []

export function setOrbVoiceLatencyLogging(active: boolean) {
  enabled = active
  if (!active) marks.length = 0
}

/** Dev-only interaction latency logging (composer, dictate, voice). */
export function setOrbInteractionLatencyLogging(active: boolean) {
  setOrbVoiceLatencyLogging(active)
}

export function resetOrbVoiceLatencyMarks() {
  marks.length = 0
}

export function resetOrbInteractionLatencyMarks() {
  marks.length = 0
}

export function markOrbVoiceLatency(mark: OrbVoiceLatencyMark) {
  markOrbInteractionLatency(mark)
}

export function markOrbInteractionLatency(mark: OrbInteractionLatencyMark) {
  if (!enabled) return
  if (marks.some((m) => m.mark === mark)) return
  marks.push({ mark, at: performance.now() })
}

export function getOrbVoiceLatencySnapshot(): Record<string, number | null> {
  const find = (mark: OrbInteractionLatencyMark) => marks.find((m) => m.mark === mark)?.at ?? null
  const start = find('start_tap')
  const delta = (mark: OrbInteractionLatencyMark) => {
    const t = find(mark)
    if (start == null || t == null) return null
    return Math.round(t - start)
  }
  return {
    start_tap_ms: start,
    preparing_ms: delta('preparing'),
    listening_ms: delta('listening'),
    first_transcript_ms: delta('first_transcript'),
    first_response_ms: delta('first_response'),
    after_call_ready_ms: delta('after_call_ready'),
    voice_mic_permission_requested_ms: delta('voice_mic_permission_requested'),
    voice_stream_ready_ms: delta('voice_stream_ready'),
    voice_backend_connected_ms: delta('voice_backend_connected')
  }
}

export function getOrbInteractionLatencySnapshot(): Record<string, number | null> {
  const find = (mark: OrbInteractionLatencyMark) => marks.find((m) => m.mark === mark)?.at ?? null
  const delta = (from: OrbInteractionLatencyMark, to: OrbInteractionLatencyMark) => {
    const a = find(from)
    const b = find(to)
    if (a == null || b == null) return null
    return Math.round(b - a)
  }
  return {
    ...getOrbVoiceLatencySnapshot(),
    plus_tap_ms: find('plus_tap'),
    plus_menu_open_ms: delta('plus_tap', 'plus_menu_open'),
    dictate_tap_ms: find('dictate_tap'),
    dictate_permission_requested_ms: delta('dictate_tap', 'dictate_permission_requested'),
    dictate_stream_ready_ms: delta('dictate_tap', 'dictate_stream_ready')
  }
}

export function logOrbVoiceLatencyIfEnabled(debugLog: (detail: Record<string, unknown>) => void) {
  if (!enabled || marks.length < 2) return
  debugLog({ event: 'voice_latency_snapshot', ...getOrbVoiceLatencySnapshot() })
}

export function logOrbInteractionLatencyIfEnabled(debugLog: (detail: Record<string, unknown>) => void) {
  if (!enabled || marks.length < 2) return
  debugLog({ event: 'interaction_latency_snapshot', ...getOrbInteractionLatencySnapshot() })
}
