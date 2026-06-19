'use client'

import { Suspense } from 'react'

import { OrbVisualDebugPanel } from '@/components/orb-residential/orb-visual-debug-panel'
import { OrbClientFlightRecorder } from '@/components/orb-standalone/orb-client-flight-recorder'
import { canMountOrbDevTools } from '@/lib/orb/orb-production-debug'

/** Engineering debug surfaces — never mounted in production unless NEXT_PUBLIC_ORB_DEBUG=1. */
export function OrbDevToolsMount() {
  if (!canMountOrbDevTools()) return null
  return (
    <>
      <OrbVisualDebugPanel />
      <OrbClientFlightRecorder />
    </>
  )
}

export function OrbDevToolsMountSuspense() {
  return (
    <Suspense fallback={null}>
      <OrbDevToolsMount />
    </Suspense>
  )
}
