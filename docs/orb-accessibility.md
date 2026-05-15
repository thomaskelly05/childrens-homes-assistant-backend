# ORB accessibility

Accessibility is first-class. ORB supports captions, transcript mode, reduced motion, high contrast, larger text, simplified layout, focus mode, large tap targets, voice-first navigation and emotional regulation mode.

OpenDyslexic is not bundled because no licensed font files are present. Dyslexia mode uses CSS fallback behaviour: system fonts, wider tracking and calmer spacing.

Accessibility preferences live in `frontend-next/lib/orb/accessibility/preferences.ts` and are applied through `frontend-next/lib/orb/accessibility/apply-accessibility.ts`.

