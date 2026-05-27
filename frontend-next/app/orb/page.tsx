import { Suspense } from 'react'

import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'

export default function OrbStandalonePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-sm text-slate-400">
          Loading ORB…
        </div>
      }
    >
      <OrbCareCompanion />
    </Suspense>
  )
}
