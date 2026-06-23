/** SSE block parser for standalone ORB streaming (no network/auth dependencies). */

export type StandaloneOrbStreamStatus = {
  type?: string
  stage: string
  message?: string
  expert_depth?: string
}

export type StandaloneOrbStreamPrelude = {
  text: string
  kind?: string
  category?: string
}

export type StandaloneOrbStreamEvent =
  | { event: 'prelude'; prelude: StandaloneOrbStreamPrelude }
  | { event: 'token'; delta: string }
  | { event: 'status'; status: StandaloneOrbStreamStatus }
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
  if (eventName === 'prelude') {
    const record = parsed as StandaloneOrbStreamPrelude
    if (typeof record.text === 'string' && record.text.trim()) {
      return { event: 'prelude', prelude: record }
    }
    return null
  }
  if (eventName === 'token') {
    const record = parsed as { delta?: string }
    if (typeof record.delta === 'string') {
      return { event: 'token', delta: record.delta }
    }
    return null
  }
  if (eventName === 'status') {
    const record = parsed as StandaloneOrbStreamStatus
    if (typeof record.stage === 'string') {
      return { event: 'status', status: record }
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
