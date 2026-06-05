export const ORB_WRITE_ZOOM_LEVELS = [75, 90, 100, 110, 125, 150] as const

export type OrbWriteZoomLevel = (typeof ORB_WRITE_ZOOM_LEVELS)[number]

export type OrbWriteZoomMode = 'percent' | 'fit-width'

const STORAGE_KEY = 'orb-write-zoom-v1'

export type OrbWriteZoomPreference = {
  mode: OrbWriteZoomMode
  percent: OrbWriteZoomLevel
}

const DEFAULT_PREFERENCE: OrbWriteZoomPreference = {
  mode: 'percent',
  percent: 100
}

export function readOrbWriteZoomPreference(): OrbWriteZoomPreference {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCE
    const parsed = JSON.parse(raw) as Partial<OrbWriteZoomPreference>
    const percent = ORB_WRITE_ZOOM_LEVELS.includes(parsed.percent as OrbWriteZoomLevel)
      ? (parsed.percent as OrbWriteZoomLevel)
      : 100
    const mode = parsed.mode === 'fit-width' ? 'fit-width' : 'percent'
    return { mode, percent }
  } catch {
    return DEFAULT_PREFERENCE
  }
}

export function writeOrbWriteZoomPreference(pref: OrbWriteZoomPreference): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
  } catch {
    /* quota */
  }
}

export function clampOrbWriteZoom(percent: number): OrbWriteZoomLevel {
  const sorted = [...ORB_WRITE_ZOOM_LEVELS]
  let nearest = sorted[0]
  let minDiff = Math.abs(percent - nearest)
  for (const level of sorted) {
    const diff = Math.abs(percent - level)
    if (diff < minDiff) {
      minDiff = diff
      nearest = level
    }
  }
  return nearest
}

export function nextOrbWriteZoom(current: OrbWriteZoomLevel, direction: 'in' | 'out'): OrbWriteZoomLevel {
  const idx = ORB_WRITE_ZOOM_LEVELS.indexOf(current)
  if (direction === 'in') {
    return ORB_WRITE_ZOOM_LEVELS[Math.min(idx + 1, ORB_WRITE_ZOOM_LEVELS.length - 1)]
  }
  return ORB_WRITE_ZOOM_LEVELS[Math.max(idx - 1, 0)]
}
