'use client'

import { useEffect } from 'react'

import { useMounted } from '@/hooks/use-mounted'

/**
 * Dev/test-only mount marker for hydration QA. No production UI impact.
 */
export function HydrationDiagnostic() {
  const mounted = useMounted()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (mounted) {
      // eslint-disable-next-line no-console -- intentional dev hydration signal
      console.debug('[hydration-diagnostic] client mounted')
    }
  }, [mounted])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <span
      data-testid={mounted ? 'hydration-diagnostic-mounted' : 'hydration-diagnostic-pending'}
      className="sr-only"
      aria-hidden
    />
  )
}
