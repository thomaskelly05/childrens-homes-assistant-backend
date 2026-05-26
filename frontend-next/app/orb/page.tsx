import { Suspense } from 'react'

import { OrbMinimalChat } from '@/components/orb-standalone/orb-minimal-chat'

export default function OrbStandalonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05070d] px-6 py-10 text-sm font-black text-slate-400">Loading ORB…</div>}>
      <OrbMinimalChat />
    </Suspense>
  )
}
