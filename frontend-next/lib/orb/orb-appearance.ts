export type OrbAppearanceMode = 'light' | 'dark' | 'system'

export const ORB_APPEARANCE_STORAGE_KEY = 'orb-appearance-mode'

/** One-time migration: PR #1334 dark default → PR #1335 light default on /orb */
export const ORB_APPEARANCE_MIGRATION_KEY = 'orb-appearance-migrated-chatgpt-light-v1'

export function resolveOrbTheme(mode: OrbAppearanceMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredAppearanceMode(): OrbAppearanceMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ORB_APPEARANCE_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Resets legacy dark/system preferences from the PR #1334 ambient UI era so /orb
 * defaults to light until the user explicitly picks dark again in Settings.
 */
export function migrateOrbAppearanceForLightDefault(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(ORB_APPEARANCE_MIGRATION_KEY) === 'done') return
    const stored = readStoredAppearanceMode()
    if (stored === 'dark' || stored === 'system') {
      window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, 'light')
    }
    window.localStorage.setItem(ORB_APPEARANCE_MIGRATION_KEY, 'done')
  } catch {
    /* ignore */
  }
}

export function readOrbAppearanceMode(): OrbAppearanceMode {
  if (typeof window === 'undefined') return 'light'
  migrateOrbAppearanceForLightDefault()
  return readStoredAppearanceMode() ?? 'light'
}

export function writeOrbAppearanceMode(mode: OrbAppearanceMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, mode)
    window.localStorage.setItem(ORB_APPEARANCE_MIGRATION_KEY, 'done')
  } catch {
    /* ignore */
  }
}

/** Apply resolved theme to document root (html/body) for global ORB tokens and panels. */
export function applyOrbDocumentTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-orb-theme', theme)
  document.body?.setAttribute('data-orb-theme', theme)
}

export function clearOrbDocumentTheme(): void {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute('data-orb-theme')
  document.body?.removeAttribute('data-orb-theme')
}

/** Inline bootstrap for /orb layout — must stay in sync with readOrbAppearanceMode + resolveOrbTheme */
export const ORB_APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var M=${JSON.stringify(ORB_APPEARANCE_MIGRATION_KEY)};var K=${JSON.stringify(ORB_APPEARANCE_STORAGE_KEY)};if(localStorage.getItem(M)!=='done'){var v=localStorage.getItem(K);if(v==='dark'||v==='system')localStorage.setItem(K,'light');localStorage.setItem(M,'done');}var mode=localStorage.getItem(K);var theme='light';if(mode==='dark')theme='dark';else if(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)theme='dark';document.documentElement.setAttribute('data-orb-theme',theme);document.body&&document.body.setAttribute('data-orb-theme',theme);}catch(e){document.documentElement.setAttribute('data-orb-theme','light');document.body&&document.body.setAttribute('data-orb-theme','light');}})();`
