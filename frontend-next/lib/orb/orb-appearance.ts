export type OrbAppearanceMode = 'light' | 'dark' | 'system'

export const ORB_APPEARANCE_STORAGE_KEY = 'orb-appearance-mode'

/** Current appearance preference version. Default is system-led unless the user explicitly chooses light/dark. */
export const ORB_APPEARANCE_MIGRATION_KEY = 'orb-appearance-system-default-v2'

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
 * Keep an existing explicit light/dark choice, but default new/legacy users to system.
 * This makes mobile ORB feel native: dark phone = dark ORB, light phone = light ORB.
 */
export function migrateOrbAppearanceForSystemDefault(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(ORB_APPEARANCE_MIGRATION_KEY) === 'done') return
    const stored = readStoredAppearanceMode()
    if (!stored) {
      window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, 'system')
    }
    window.localStorage.setItem(ORB_APPEARANCE_MIGRATION_KEY, 'done')
  } catch {
    /* ignore */
  }
}

export function readOrbAppearanceMode(): OrbAppearanceMode {
  if (typeof window === 'undefined') return 'system'
  migrateOrbAppearanceForSystemDefault()
  return readStoredAppearanceMode() ?? 'system'
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
export function applyOrbDocumentTheme(theme: 'light' | 'dark', appearanceMode?: OrbAppearanceMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-orb-theme', theme)
  document.body?.setAttribute('data-orb-theme', theme)
  if (appearanceMode) {
    document.documentElement.setAttribute('data-orb-appearance', appearanceMode)
    document.body?.setAttribute('data-orb-appearance', appearanceMode)
  }
}

export function clearOrbDocumentTheme(): void {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute('data-orb-theme')
  document.documentElement.removeAttribute('data-orb-appearance')
  document.body?.removeAttribute('data-orb-theme')
  document.body?.removeAttribute('data-orb-appearance')
}

/**
 * Inline bootstrap for `/orb` layout.
 * Residential ORB is dark-only at launch — appearance preference is stored for settings UI
 * but does not switch the resolved theme until the theme system is rebuilt.
 */
export const ORB_APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var M=${JSON.stringify(ORB_APPEARANCE_MIGRATION_KEY)};var K=${JSON.stringify(ORB_APPEARANCE_STORAGE_KEY)};if(localStorage.getItem(M)!=='done'&&!localStorage.getItem(K)){localStorage.setItem(K,'system');localStorage.setItem(M,'done');}var mode=localStorage.getItem(K)||'system';var theme='dark';document.documentElement.setAttribute('data-orb-residential','1');document.documentElement.setAttribute('data-orb-appearance',mode);document.documentElement.setAttribute('data-orb-appearance-mode',mode);document.documentElement.setAttribute('data-orb-theme',theme);document.documentElement.setAttribute('data-orb-system-theme',theme);document.documentElement.style.colorScheme=theme;document.body&&(document.body.setAttribute('data-orb-appearance',mode),document.body.setAttribute('data-orb-appearance-mode',mode),document.body.setAttribute('data-orb-theme',theme));}catch(e){document.documentElement.setAttribute('data-orb-residential','1');document.documentElement.setAttribute('data-orb-appearance','system');document.documentElement.setAttribute('data-orb-appearance-mode','system');document.documentElement.setAttribute('data-orb-theme','dark');document.documentElement.setAttribute('data-orb-system-theme','dark');document.documentElement.style.colorScheme='dark';document.body&&(document.body.setAttribute('data-orb-appearance','system'),document.body.setAttribute('data-orb-appearance-mode','system'),document.body.setAttribute('data-orb-theme','dark'));}})();`