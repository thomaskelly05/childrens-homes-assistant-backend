export type OrbAccessibilityPreferences = {
  neurodiverseMode: boolean
  dyslexiaMode: boolean
  lowVisionMode: boolean
  hearingAccessibility: boolean
  motorAccessibility: boolean
  emotionalRegulationMode: boolean
  captions: boolean
  transcript: boolean
  reducedMotion: boolean
  highContrast: boolean
  largerText: boolean
  simplifiedLayout: boolean
  focusMode: boolean
  largeTapTargets: boolean
  voiceFirstNavigation: boolean
}

export const ORB_ACCESSIBILITY_STORAGE_KEY = 'indicare.orb.accessibility.v1'

export const defaultOrbAccessibilityPreferences: OrbAccessibilityPreferences = {
  neurodiverseMode: false,
  dyslexiaMode: false,
  lowVisionMode: false,
  hearingAccessibility: false,
  motorAccessibility: false,
  emotionalRegulationMode: false,
  captions: false,
  transcript: false,
  reducedMotion: false,
  highContrast: false,
  largerText: false,
  simplifiedLayout: false,
  focusMode: false,
  largeTapTargets: true,
  voiceFirstNavigation: true
}

export function loadOrbAccessibilityPreferences(): OrbAccessibilityPreferences {
  if (typeof window === 'undefined') return defaultOrbAccessibilityPreferences
  try {
    const stored = window.localStorage.getItem(ORB_ACCESSIBILITY_STORAGE_KEY)
    if (!stored) return defaultOrbAccessibilityPreferences
    return { ...defaultOrbAccessibilityPreferences, ...JSON.parse(stored) as Partial<OrbAccessibilityPreferences> }
  } catch {
    return defaultOrbAccessibilityPreferences
  }
}

export function saveOrbAccessibilityPreferences(preferences: OrbAccessibilityPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ORB_ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences))
}

