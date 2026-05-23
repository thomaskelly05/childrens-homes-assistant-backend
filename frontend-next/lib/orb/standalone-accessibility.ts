export type StandaloneOrbAccessibilityPreferences = {
  dyslexiaMode: boolean
  lowSensoryMode: boolean
  largeText: boolean
  compactMode: boolean
  highContrast: boolean
  reducedMotion: boolean
  simplifiedReading: boolean
}

export const STANDALONE_ORB_A11Y_STORAGE_KEY = 'indicare.orb.standalone.a11y.v1'

export const defaultStandaloneOrbAccessibility: StandaloneOrbAccessibilityPreferences = {
  dyslexiaMode: false,
  lowSensoryMode: false,
  largeText: false,
  compactMode: false,
  highContrast: false,
  reducedMotion: false,
  simplifiedReading: false
}

export function loadStandaloneOrbAccessibility(): StandaloneOrbAccessibilityPreferences {
  if (typeof window === 'undefined') return defaultStandaloneOrbAccessibility
  try {
    const raw = window.localStorage.getItem(STANDALONE_ORB_A11Y_STORAGE_KEY)
    if (!raw) return defaultStandaloneOrbAccessibility
    return { ...defaultStandaloneOrbAccessibility, ...JSON.parse(raw) }
  } catch {
    return defaultStandaloneOrbAccessibility
  }
}

export function saveStandaloneOrbAccessibility(prefs: StandaloneOrbAccessibilityPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STANDALONE_ORB_A11Y_STORAGE_KEY, JSON.stringify(prefs))
}

export function standaloneOrbAccessibilityClassNames(
  prefs: Partial<StandaloneOrbAccessibilityPreferences>
): string {
  return [
    prefs.dyslexiaMode ? 'orb-dyslexia-mode' : '',
    prefs.lowSensoryMode ? 'orb-low-sensory' : '',
    prefs.largeText ? 'orb-large-text' : '',
    prefs.compactMode ? 'orb-compact-mode' : '',
    prefs.highContrast ? 'orb-high-contrast' : '',
    prefs.reducedMotion ? 'orb-reduced-motion' : '',
    prefs.simplifiedReading ? 'orb-simplified-reading' : ''
  ]
    .filter(Boolean)
    .join(' ')
}
