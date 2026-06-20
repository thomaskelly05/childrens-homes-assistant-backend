/** Mirrors `ORB_RESIDENTIAL_DEFAULT_THEME` in `orb-theme.ts`. */
const ORB_RESIDENTIAL_DEFAULT_THEME = 'light' as const

export type OrbAppearanceMode = 'light' | 'dark' | 'system'

export const ORB_APPEARANCE_STORAGE_KEY = 'orb-appearance-mode'

/** Current appearance preference version. Default is system-led unless the user explicitly chooses light/dark. */
export const ORB_APPEARANCE_MIGRATION_KEY = 'orb-appearance-system-default-v2'

/** ORB Residential (`/orb`) defaults to light for new users. */
export const ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY = 'orb-appearance-residential-light-v1'

/** Default appearance mode on `/orb` when nothing is stored. */
export const ORB_RESIDENTIAL_DEFAULT_APPEARANCE: OrbAppearanceMode = 'light'

/** Phase 1E — ORB Residential uses a fixed light interface until dark mode is fully designed. */
export const ORB_RESIDENTIAL_LOCKED_THEME = 'light' as const

export const ORB_RESIDENTIAL_THEME_LOCK_MIGRATION_KEY = 'orb-appearance-residential-theme-lock-v1'

export const ORB_RESIDENTIAL_THEME_LOCK_COPY =
  'ORB Residential currently uses a fixed light interface to support safer readability. Dark mode is being refined.'

/** Residential resolved theme — always light while theme lock is active. */
export function resolveOrbResidentialTheme(
  _mode?: OrbAppearanceMode
): typeof ORB_RESIDENTIAL_LOCKED_THEME {
  return ORB_RESIDENTIAL_LOCKED_THEME
}

export function normalizeOrbResidentialAppearanceMode(
  _mode: OrbAppearanceMode
): typeof ORB_RESIDENTIAL_LOCKED_THEME {
  return ORB_RESIDENTIAL_LOCKED_THEME
}

export function migrateOrbResidentialThemeLock(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(ORB_RESIDENTIAL_THEME_LOCK_MIGRATION_KEY) === 'done') return
    const stored = readStoredAppearanceMode()
    if (!stored || stored !== ORB_RESIDENTIAL_LOCKED_THEME) {
      window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, ORB_RESIDENTIAL_LOCKED_THEME)
    }
    window.localStorage.setItem(ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY, 'done')
    window.localStorage.setItem(ORB_RESIDENTIAL_THEME_LOCK_MIGRATION_KEY, 'done')
  } catch {
    /* ignore */
  }
}

/** System mode: light from 07:00 through 18:59 local time; dark otherwise. */
export const ORB_SYSTEM_LIGHT_START_HOUR = 7
export const ORB_SYSTEM_DARK_START_HOUR = 19

/** Resolve light/dark from local time of day (for System appearance). */
export function resolveOrbThemeFromTimeOfDay(at: Date = new Date()): 'light' | 'dark' {
  const hour = at.getHours()
  return hour >= ORB_SYSTEM_LIGHT_START_HOUR && hour < ORB_SYSTEM_DARK_START_HOUR ? 'light' : 'dark'
}

export function resolveOrbTheme(mode: OrbAppearanceMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window === 'undefined') return resolveOrbThemeFromTimeOfDay()
  return resolveOrbThemeFromTimeOfDay()
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

export function migrateOrbResidentialLightDefault(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY) === 'done') return
    const stored = readStoredAppearanceMode()
    if (!stored || stored === 'system') {
      window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, ORB_RESIDENTIAL_DEFAULT_APPEARANCE)
    }
    window.localStorage.setItem(ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY, 'done')
  } catch {
    /* ignore */
  }
}

export function readOrbAppearanceMode(options?: { residential?: boolean }): OrbAppearanceMode {
  if (typeof window === 'undefined') {
    return options?.residential ? ORB_RESIDENTIAL_LOCKED_THEME : 'system'
  }
  if (options?.residential) {
    migrateOrbResidentialThemeLock()
    migrateOrbResidentialLightDefault()
    return ORB_RESIDENTIAL_LOCKED_THEME
  }
  migrateOrbAppearanceForSystemDefault()
  return readStoredAppearanceMode() ?? 'system'
}

export function writeOrbAppearanceMode(mode: OrbAppearanceMode, options?: { residential?: boolean }): void {
  if (typeof window === 'undefined') return
  const normalized = options?.residential ? ORB_RESIDENTIAL_LOCKED_THEME : mode
  try {
    window.localStorage.setItem(ORB_APPEARANCE_STORAGE_KEY, normalized)
    window.localStorage.setItem(ORB_APPEARANCE_MIGRATION_KEY, 'done')
    window.localStorage.setItem(ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY, 'done')
    window.localStorage.setItem(ORB_RESIDENTIAL_THEME_LOCK_MIGRATION_KEY, 'done')
  } catch {
    /* ignore */
  }
}

/** @deprecated Prefer `applyOrbResidentialTheme` from `orb-residential-theme.ts`. */
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

/** Milliseconds until the next system theme boundary (07:00 or 19:00 local). */
export function msUntilNextOrbSystemThemeBoundary(at: Date = new Date()): number {
  const next = new Date(at)
  const hour = at.getHours()
  if (hour >= ORB_SYSTEM_LIGHT_START_HOUR && hour < ORB_SYSTEM_DARK_START_HOUR) {
    next.setHours(ORB_SYSTEM_DARK_START_HOUR, 0, 0, 0)
  } else if (hour < ORB_SYSTEM_LIGHT_START_HOUR) {
    next.setHours(ORB_SYSTEM_LIGHT_START_HOUR, 0, 0, 0)
  } else {
    next.setDate(next.getDate() + 1)
    next.setHours(ORB_SYSTEM_LIGHT_START_HOUR, 0, 0, 0)
  }
  return Math.max(1000, next.getTime() - at.getTime())
}

/**
 * Inline bootstrap for `/orb` layout — prevents flash and aligns html/body before React hydrates.
 */
export const ORB_APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var M=${JSON.stringify(ORB_APPEARANCE_MIGRATION_KEY)};var RM=${JSON.stringify(ORB_RESIDENTIAL_APPEARANCE_MIGRATION_KEY)};var TL=${JSON.stringify(ORB_RESIDENTIAL_THEME_LOCK_MIGRATION_KEY)};var K=${JSON.stringify(ORB_APPEARANCE_STORAGE_KEY)};var LOCK=${JSON.stringify(ORB_RESIDENTIAL_LOCKED_THEME)};function applyThemeClass(el,theme){if(!el||!el.classList)return;el.classList.remove('orb-theme-light','orb-theme-dark');el.classList.add(theme==='light'?'orb-theme-light':'orb-theme-dark');}if(localStorage.getItem(M)!=='done'&&!localStorage.getItem(K)){localStorage.setItem(K,'system');localStorage.setItem(M,'done');}var stored=localStorage.getItem(K);if(localStorage.getItem(TL)!=='done'||!stored||stored!=='light'){localStorage.setItem(K,LOCK);localStorage.setItem(RM,'done');localStorage.setItem(TL,'done');}var mode=LOCK;var theme=LOCK;document.documentElement.setAttribute('data-orb-residential','1');document.documentElement.setAttribute('data-orb-visual-system','v2');document.documentElement.setAttribute('data-orb-appearance',mode);document.documentElement.setAttribute('data-orb-appearance-mode',mode);document.documentElement.setAttribute('data-orb-theme',theme);document.documentElement.setAttribute('data-orb-system-theme',theme);document.documentElement.setAttribute('data-orb-theme-locked',theme);document.documentElement.style.colorScheme=theme;applyThemeClass(document.documentElement,theme);document.body&&(document.body.setAttribute('data-orb-appearance',mode),document.body.setAttribute('data-orb-appearance-mode',mode),document.body.setAttribute('data-orb-theme',theme),document.body.setAttribute('data-orb-theme-locked',theme),applyThemeClass(document.body,theme));}catch(e){var fb=${JSON.stringify(ORB_RESIDENTIAL_LOCKED_THEME)};document.documentElement.setAttribute('data-orb-residential','1');document.documentElement.setAttribute('data-orb-visual-system','v2');document.documentElement.setAttribute('data-orb-appearance',fb);document.documentElement.setAttribute('data-orb-appearance-mode',fb);document.documentElement.setAttribute('data-orb-theme',fb);document.documentElement.setAttribute('data-orb-system-theme',fb);document.documentElement.setAttribute('data-orb-theme-locked',fb);document.documentElement.style.colorScheme=fb;document.documentElement.classList.add('orb-theme-'+fb);document.body&&(document.body.setAttribute('data-orb-appearance',fb),document.body.setAttribute('data-orb-appearance-mode',fb),document.body.setAttribute('data-orb-theme',fb),document.body.setAttribute('data-orb-theme-locked',fb),document.body.classList.add('orb-theme-'+fb));}})();`
