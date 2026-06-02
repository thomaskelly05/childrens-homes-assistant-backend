export type OrbClientDebugArea = 'voice' | 'dictate' | 'composer' | 'backend' | 'browser'

type OrbClientDebugEvent = {
  area: OrbClientDebugArea
  event: string
  detail?: Record<string, unknown>
}

const MAX_EVENTS = 160
const STORAGE_KEY = 'orb-client-flight-recorder'

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('debugVoice') === '1' || window.localStorage.getItem('orb-debug-voice') === '1'
}

function safeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.includes('bearer ') || lower.includes('eyj')) return '[hidden]'
    return value.slice(0, 800)
  }
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => safeValue(item, depth + 1))
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 60)) {
      const lower = key.toLowerCase()
      output[key] = lower.includes('token') || lower.includes('secret') || lower.includes('cookie') || lower.includes('authorization')
        ? '[hidden]'
        : safeValue(item, depth + 1)
    }
    return output
  }
  return String(value).slice(0, 500)
}

function safeDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> {
  return (safeValue(detail ?? {}) as Record<string, unknown>) ?? {}
}

export function emitOrbClientDebug(event: OrbClientDebugEvent): void {
  if (!isEnabled()) return
  try {
    const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown[]
    const entry = {
      at: new Date().toISOString(),
      ms: Math.round(performance.now()),
      area: event.area,
      event: event.event,
      detail: safeDetail(event.detail),
      url: window.location.pathname + window.location.search
    }
    const next = [...current, entry].slice(-MAX_EVENTS)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('orb-client-debug', { detail: entry }))
    // eslint-disable-next-line no-console
    console.info('[ORB_DEBUG]', entry)
  } catch {
    // ignore diagnostics failures
  }
}

export function getOrbClientDebugEvents(): unknown[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown[]
  } catch {
    return []
  }
}

export function clearOrbClientDebugEvents(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

/** Voice-only flight recorder entries (newest last in storage; returned newest first). */
export function getOrbVoiceDebugEventsOnly(): unknown[] {
  const events = getOrbClientDebugEvents().filter((entry) => {
    if (!entry || typeof entry !== 'object') return false
    return (entry as { area?: string }).area === 'voice'
  })
  return [...events].reverse()
}

/** Clear flight recorder and reset in-memory voice diag transport/response counters. */
export function clearOrbVoiceDebugEvents(): void {
  clearOrbClientDebugEvents()
}

export async function copyOrbClientDebugEvents(): Promise<string | true> {
  const text = JSON.stringify(getOrbClientDebugEvents(), null, 2)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  return text
}

if (typeof window !== 'undefined') {
  const debugWindow = window as typeof window & {
    ORB_DEBUG_EVENTS?: () => unknown[]
    ORB_DEBUG_COPY?: () => Promise<string | true>
    ORB_DEBUG_CLEAR?: () => void
  }
  debugWindow.ORB_DEBUG_EVENTS = getOrbClientDebugEvents
  debugWindow.ORB_DEBUG_COPY = copyOrbClientDebugEvents
  debugWindow.ORB_DEBUG_CLEAR = clearOrbClientDebugEvents
}
