'use client'

import { useEffect } from 'react'

import { applyOrbAccessibilityToDocument } from '@/lib/orb/accessibility/apply-accessibility'
import { loadOrbAccessibilityPreferences } from '@/lib/orb/accessibility/preferences'

export function OrbAccessibilityHydrator() {
  useEffect(() => {
    applyOrbAccessibilityToDocument(loadOrbAccessibilityPreferences())
  }, [])

  return null
}
