/** Dev/production-safe ORB chat latency marks — metadata only, no prompt or child content. */

export type OrbChatLatencyMark =
  | 'send_clicked'
  | 'thinking_visible'
  | 'request_started'
  | 'first_byte'
  | 'first_token'
  | 'final_chunk'
  | 'render_complete'

type ChatLatencyEntry = { mark: OrbChatLatencyMark; at: number; requestId?: string }

let enabled = false
const marks: ChatLatencyEntry[] = []
let activeRequestId: string | null = null

function isLatencyLoggingEnabled() {
  if (enabled) return true
  if (typeof window === 'undefined') return false
  if (process.env.NODE_ENV === 'development') return true
  try {
    return window.localStorage?.getItem('orb-cognition-debug') === '1'
  } catch {
    return false
  }
}

export function setOrbChatLatencyLogging(active: boolean) {
  enabled = active
  if (!active) {
    marks.length = 0
    activeRequestId = null
  }
}

export function resetOrbChatLatencyMarks(requestId?: string) {
  if (requestId && activeRequestId && requestId !== activeRequestId) return
  marks.length = 0
}

export function startOrbChatLatencyTrace(requestId: string) {
  activeRequestId = requestId
  marks.length = 0
}

export function markOrbChatLatency(mark: OrbChatLatencyMark, at?: number) {
  if (!isLatencyLoggingEnabled()) return
  if (marks.some((entry) => entry.mark === mark)) return
  marks.push({ mark, at: at ?? performance.now(), requestId: activeRequestId ?? undefined })
}

export function getOrbChatLatencySnapshot(): Record<string, number | string | null> {
  const find = (mark: OrbChatLatencyMark) => marks.find((entry) => entry.mark === mark)?.at ?? null
  const delta = (from: OrbChatLatencyMark, to: OrbChatLatencyMark) => {
    const start = find(from)
    const end = find(to)
    if (start == null || end == null) return null
    return Math.round(end - start)
  }
  return {
    request_id: activeRequestId,
    send_clicked_ms: find('send_clicked'),
    thinking_visible_ms: find('thinking_visible'),
    request_started_ms: find('request_started'),
    first_byte_ms: find('first_byte'),
    first_token_ms: find('first_token'),
    final_chunk_ms: find('final_chunk'),
    render_complete_ms: find('render_complete'),
    send_to_thinking_ms: delta('send_clicked', 'thinking_visible'),
    send_to_first_token_ms: delta('send_clicked', 'first_token'),
    send_to_final_ms: delta('send_clicked', 'final_chunk'),
    request_to_first_token_ms: delta('request_started', 'first_token')
  }
}

export function logOrbChatLatencySnapshot(event = 'orb_chat_latency') {
  if (!isLatencyLoggingEnabled() || marks.length < 2) return
  console.info(`[orb-timing] ${event}`, getOrbChatLatencySnapshot())
}
