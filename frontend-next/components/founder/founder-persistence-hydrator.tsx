'use client'

import { useEffect } from 'react'

import { hydrateAllFounderPersistence } from '@/lib/founder/persistence/founder-persistence-sync'
import { isFounderPersistenceDevFallback } from '@/lib/founder/persistence/persistence-config'

export function FounderPersistenceHydrator() {
  useEffect(() => {
    void hydrateAllFounderPersistence()
  }, [])

  if (!isFounderPersistenceDevFallback()) return null

  return (
    <p className="mx-auto mb-4 max-w-[1200px] rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-200">
      Using local founder store. Production persistence unavailable.
    </p>
  )
}
