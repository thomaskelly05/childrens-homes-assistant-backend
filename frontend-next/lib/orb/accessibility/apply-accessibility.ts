import type { OrbAccessibilityPreferences } from './preferences'

export function orbAccessibilityClassNames(preferences: Partial<OrbAccessibilityPreferences> = {}) {
  return [
    preferences.reducedMotion ? 'orb-reduced-motion motion-reduce:transition-none' : '',
    preferences.highContrast ? 'orb-high-contrast' : '',
    preferences.largerText ? 'text-lg' : '',
    preferences.simplifiedLayout ? 'orb-simple-layout' : '',
    preferences.dyslexiaMode ? 'orb-dyslexia-mode font-sans tracking-wide' : '',
    preferences.focusMode ? 'orb-focus-mode' : '',
    preferences.lowVisionMode ? 'orb-low-vision' : '',
    preferences.motorAccessibility ? 'orb-motor-accessible' : '',
    preferences.emotionalRegulationMode ? 'orb-emotional-regulation' : '',
    preferences.neurodiverseMode ? 'orb-neurodiverse' : '',
    preferences.largeTapTargets ? '[&_button]:min-h-12' : ''
  ].filter(Boolean).join(' ')
}

export function applyOrbAccessibilityToDocument(preferences: Partial<OrbAccessibilityPreferences>) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.orbReducedMotion = preferences.reducedMotion ? 'true' : 'false'
  root.dataset.orbHighContrast = preferences.highContrast ? 'true' : 'false'
  root.dataset.orbDyslexia = preferences.dyslexiaMode ? 'true' : 'false'
  root.dataset.orbLowVision = preferences.lowVisionMode ? 'true' : 'false'
  root.dataset.orbHearing = preferences.hearingAccessibility ? 'true' : 'false'
  root.dataset.orbMotor = preferences.motorAccessibility ? 'true' : 'false'
  root.dataset.orbEmotionalRegulation = preferences.emotionalRegulationMode ? 'true' : 'false'
  root.dataset.orbSimpleLayout = preferences.simplifiedLayout ? 'true' : 'false'
  root.dataset.orbFocusMode = preferences.focusMode ? 'true' : 'false'
  root.dataset.orbCaptions = preferences.captions ? 'true' : 'false'
  root.dataset.orbTranscript = preferences.transcript ? 'true' : 'false'
  root.dataset.orbVoiceFirst = preferences.voiceFirstNavigation ? 'true' : 'false'
}

