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

type LatencyEntry = { mark: OrbVoiceLatencyMark; at: number }

let enabled = false
const marks: LatencyEntry[] = []

export function setOrbVoiceLatencyLogging(active: boolean) {
  enabled = active
  if (!active) marks.length = 0
}

export function resetOrbVoiceLatencyMarks() {
  marks.length = 0
}

export function markOrbVoiceLatency(mark: OrbVoiceLatencyMark) {
  if (!enabled) return
  if (marks.some((m) => m.mark === mark)) return
  marks.push({ mark, at: performance.now() })
}

export function getOrbVoiceLatencySnapshot(): Record<string, number | null> {
  const find = (mark: OrbVoiceLatencyMark) => marks.find((m) => m.mark === mark)?.at ?? null
  const start = find('start_tap')
  const delta = (mark: OrbVoiceLatencyMark) => {
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
    after_call_ready_ms: delta('after_call_ready')
  }
}

export function logOrbVoiceLatencyIfEnabled(debugLog: (detail: Record<string, unknown>) => void) {
  if (!enabled || marks.length < 2) return
  debugLog({ event: 'voice_latency_snapshot', ...getOrbVoiceLatencySnapshot() })
}
