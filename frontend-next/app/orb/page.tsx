import { Suspense } from 'react'

import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'

export default function OrbPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] text-sm text-[#6B7280]">
          Loading ORB…
        </div>
      }
    >
      <OrbCareCompanion />
    </Suspense>
  )
}
