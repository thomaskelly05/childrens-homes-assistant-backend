/** SSE block parser for standalone ORB streaming (no network/auth dependencies). */

export type StandaloneOrbStreamEvent =
  | { event: 'token'; delta: string }
  // Metadata is normalised by standalone-client.ts into the concrete ORB response shape.
  // Keep this permissive so typed callers can pass parser payloads through without
  // production build failures when metadata gains new dynamic fields.
  | { event: 'metadata'; payload: any }
  | { event: 'done'; ok: boolean }
  | { event: 'error'; error: string; detail?: string }

export function parseStandaloneOrbSseBlock(block: string): StandaloneOrbStreamEvent | null {
  const lines = block.split(/\r?\n/).filter(Boolean)
  let eventName = 'message'
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (!dataLines.length) return null
  const raw = dataLines.join('\n')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (eventName === 'token') {
    const record = parsed as { delta?: string }
    if (typeof record.delta === 'string') {
      return { event: 'token', delta: record.delta }
    }
    return null
  }
  if (eventName === 'metadata') {
    return { event: 'metadata', payload: parsed as any }
  }
  if (eventName === 'done') {
    const record = parsed as { ok?: boolean }
    return { event: 'done', ok: Boolean(record.ok ?? true) }
  }
  if (eventName === 'error') {
    const record = parsed as { error?: string; detail?: string }
    return {
      event: 'error',
      error: typeof record.error === 'string' ? record.error : 'provider_unavailable',
      detail: typeof record.detail === 'string' ? record.detail : undefined
    }
  }
  return null
}
