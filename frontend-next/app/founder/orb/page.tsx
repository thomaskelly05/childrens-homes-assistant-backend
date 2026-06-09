import { Suspense } from 'react'

import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOrbPage } from '@/components/founder/orb-founder/founder-orb-page'

export default function FounderOrbRoute() {
  return (
    <FounderGuard>
      <Suspense fallback={null}>
        <FounderOrbPage />
      </Suspense>
    </FounderGuard>
  )
}
