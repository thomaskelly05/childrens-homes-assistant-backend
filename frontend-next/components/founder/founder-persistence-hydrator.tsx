'use client'

import { useEffect, useState } from 'react'

import { FounderDegradedBanner } from '@/components/founder/founder-degraded-banner'
import {
  getLastFounderBootstrap,
  hydrateAllFounderPersistence
} from '@/lib/founder/persistence/founder-persistence-sync'
import { isFounderPersistenceDevFallback } from '@/lib/founder/persistence/persistence-config'

export function FounderPersistenceHydrator() {
  const [degraded, setDegraded] = useState(false)

  useEffect(() => {
    void hydrateAllFounderPersistence()
      .then((bootstrap) => {
        const errors = bootstrap.sectionErrors ?? {}
        setDegraded(Object.keys(errors).length > 0)
      })
      .catch(() => {
        setDegraded(true)
      })
  }, [])

  const bootstrap = getLastFounderBootstrap()
  const showBusy =
    degraded || Boolean(bootstrap?.sectionErrors && Object.keys(bootstrap.sectionErrors).length > 0)

  return (
    <>
      <FounderDegradedBanner show={showBusy} />
      {isFounderPersistenceDevFallback() ? (
        <p className="mx-auto mb-4 max-w-[1200px] rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-200">
          Using local founder store. Production persistence unavailable.
        </p>
      ) : null}
    </>
  )
}
