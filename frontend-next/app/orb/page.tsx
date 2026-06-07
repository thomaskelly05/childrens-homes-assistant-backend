import { Suspense } from 'react'

import { OrbShell } from '@/components/orb/orb-shell'
import { OrbVisualDebugPanel } from '@/components/orb-residential/orb-visual-debug-panel'
import { OrbClientFlightRecorder } from '@/components/orb-standalone/orb-client-flight-recorder'

export default function OrbPage() {
  return (
    <>
      <OrbShell />
      <Suspense fallback={null}>
        <OrbVisualDebugPanel />
      </Suspense>
      <OrbClientFlightRecorder />
    </>
  )
}
