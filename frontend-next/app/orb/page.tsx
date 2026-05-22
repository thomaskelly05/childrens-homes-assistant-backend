import { Suspense } from 'react'

import { OrbCareCompanion } from '@/components/orb-standalone/orb-care-companion'

export default function OrbStandalonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05070d] px-6 py-10 text-sm font-black text-slate-400">Loading ORB Care Companion…</div>}>
      <OrbCareCompanion />
    </Suspense>
  )
}
