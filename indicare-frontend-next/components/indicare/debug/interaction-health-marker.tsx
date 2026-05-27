'use client'

import { useEffect } from 'react'

import { getTapDebugEnabled } from '@/lib/interaction/mobile-tap-debug'

const STORAGE_KEY = 'indicare:last-click-testid'

/**
 * Dev/test-only: records the last clicked element data-testid for QA forensics.
 */
export function InteractionHealthMarker() {
  useEffect(() => {
    if (!getTapDebugEnabled() && process.env.NODE_ENV === 'production') return

    function onPointerUp(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const clickable = target.closest('[data-testid]')
      const testId = clickable?.getAttribute('data-testid')
      if (!testId) return
      try {
        sessionStorage.setItem(STORAGE_KEY, testId)
        document.documentElement.setAttribute('data-last-click-testid', testId)
      } catch {
        /* ignore */
      }
    }

    document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true })
    return () => document.removeEventListener('pointerup', onPointerUp, { capture: true })
  }, [])

  if (process.env.NODE_ENV === 'production' && !getTapDebugEnabled()) return null

  return (
    <span
      data-testid="interaction-health-marker"
      className="sr-only"
      aria-hidden
    />
  )
}

export function getLastClickedTestId(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
