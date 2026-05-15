import type { OrbAccessibilityPreferences } from './preferences'

export function orbAccessibilityClassNames(preferences: Partial<OrbAccessibilityPreferences> = {}) {
  return [
    preferences.reducedMotion ? 'motion-reduce:transition-none' : '',
    preferences.highContrast ? 'orb-high-contrast' : '',
    preferences.largerText ? 'text-lg' : '',
    preferences.simplifiedLayout ? 'orb-simple-layout' : '',
    preferences.dyslexiaMode ? 'font-sans tracking-wide' : '',
    preferences.largeTapTargets ? '[&_button]:min-h-12' : ''
  ].filter(Boolean).join(' ')
}

export function applyOrbAccessibilityToDocument(preferences: Partial<OrbAccessibilityPreferences>) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.orbReducedMotion = preferences.reducedMotion ? 'true' : 'false'
  document.documentElement.dataset.orbHighContrast = preferences.highContrast ? 'true' : 'false'
}

