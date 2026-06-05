export type OrbDictatePanelPreset =
  | '70-30'
  | '50-50'
  | '30-70'
  | 'full-transcript'
  | 'full-brain'
  | 'full-preview'

export type OrbDictatePanelLayout = {
  leftPercent: number
  rightPercent: number
  showPreview: boolean
  previewPercent: number
  preset: OrbDictatePanelPreset
}

const STORAGE_KEY = 'orb-dictate-panel-layout-v1'

export const PANEL_PRESET_LAYOUTS: Record<OrbDictatePanelPreset, OrbDictatePanelLayout> = {
  '70-30': { leftPercent: 70, rightPercent: 30, showPreview: false, previewPercent: 0, preset: '70-30' },
  '50-50': { leftPercent: 50, rightPercent: 50, showPreview: false, previewPercent: 0, preset: '50-50' },
  '30-70': { leftPercent: 30, rightPercent: 70, showPreview: false, previewPercent: 0, preset: '30-70' },
  'full-transcript': { leftPercent: 100, rightPercent: 0, showPreview: false, previewPercent: 0, preset: 'full-transcript' },
  'full-brain': { leftPercent: 0, rightPercent: 100, showPreview: false, previewPercent: 0, preset: 'full-brain' },
  'full-preview': { leftPercent: 0, rightPercent: 0, showPreview: true, previewPercent: 100, preset: 'full-preview' }
}

export const DEFAULT_PANEL_LAYOUT: OrbDictatePanelLayout = PANEL_PRESET_LAYOUTS['50-50']

export function loadOrbDictatePanelLayout(): OrbDictatePanelLayout {
  if (typeof window === 'undefined') return DEFAULT_PANEL_LAYOUT
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PANEL_LAYOUT
    const parsed = JSON.parse(raw) as Partial<OrbDictatePanelLayout>
    if (typeof parsed.leftPercent !== 'number') return DEFAULT_PANEL_LAYOUT
    return {
      leftPercent: clamp(parsed.leftPercent ?? 50, 15, 85),
      rightPercent: clamp(parsed.rightPercent ?? 50, 15, 85),
      showPreview: Boolean(parsed.showPreview),
      previewPercent: clamp(parsed.previewPercent ?? 30, 20, 50),
      preset: (parsed.preset as OrbDictatePanelPreset) ?? '50-50'
    }
  } catch {
    return DEFAULT_PANEL_LAYOUT
  }
}

export function saveOrbDictatePanelLayout(layout: OrbDictatePanelLayout): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* ignore quota errors */
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
