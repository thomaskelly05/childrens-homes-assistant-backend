export type OrbAppearanceMode = 'light' | 'dark' | 'system'

export const ORB_APPEARANCE_STORAGE_KEY = 'orb-appearance-mode'

export function resolveOrbTheme(mode: OrbAppearanceMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function readOrbAppearanceMode(): OrbAppearanceMode {
  if (typeof window === 'undefined') return 'light'
  try {
    const raw = window.localStorage.getItem(ORB_APPEARANCE_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'light'
}

export function writeOrbAppearanceMode(mode: OrbAppearanceMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
