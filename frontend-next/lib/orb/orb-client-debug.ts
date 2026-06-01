export type OrbClientDebugArea = 'voice' | 'dictate' | 'composer' | 'backend' | 'browser'

type OrbClientDebugEvent = {
  area: OrbClientDebugArea
  event: string
  detail?: Record<string, unknown>
}

const MAX_EVENTS = 80
const STORAGE_KEY = 'orb-client-flight-recorder'

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('debugVoice') === '1' || window.localStorage.getItem('orb-debug-voice') === '1'
}

function safeDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!detail) return {}
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(detail).slice(0, 30)) {
    const lower = key.toLowerCase()
    if (lower.includes('token') || lower.includes('secret') || lower.includes('cookie')) {
      output[key] = '[hidden]'
      continue
    }
    if (typeof value === 'string') output[key] = value.slice(0, 500)
    else if (typeof value === 'number' || typeof value === 'boolean' || value == null) output[key] = value
    else output[key] = JSON.parse(JSON.stringify(value).slice(0, 1000))
  }
  return output
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

if (typeof window !== 'undefined') {
  ;(window as typeof window & { ORB_DEBUG_EVENTS?: () => unknown[]; ORB_DEBUG_CLEAR?: () => void }).ORB_DEBUG_EVENTS = getOrbClientDebugEvents
  ;(window as typeof window & { ORB_DEBUG_EVENTS?: () => unknown[]; ORB_DEBUG_CLEAR?: () => void }).ORB_DEBUG_CLEAR = clearOrbClientDebugEvents
}
