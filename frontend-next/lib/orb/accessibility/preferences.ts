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

