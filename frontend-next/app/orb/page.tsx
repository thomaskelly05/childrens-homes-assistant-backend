import { Suspense } from 'react'

import { OrbResidentialChatHome } from '@/components/orb-residential/orb-residential-chat-home'

export default function OrbPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050b18] text-sm text-slate-400">
          Loading ORB…
        </div>
      }
    >
      <OrbResidentialChatHome />
    </Suspense>
  )
}
