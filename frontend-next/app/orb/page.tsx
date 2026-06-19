import { Suspense } from 'react'

import { OrbShell } from '@/components/orb/orb-shell'
import { OrbDevToolsMount } from '@/components/orb-standalone/orb-dev-tools-mount'

export default function OrbPage() {
  return (
    <>
      <OrbShell />
      <Suspense fallback={null}>
        <OrbDevToolsMount />
      </Suspense>
    </>
  )
}
