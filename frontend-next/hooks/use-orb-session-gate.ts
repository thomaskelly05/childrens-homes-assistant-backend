'use client'

import { useEffect, useState } from 'react'

import {
  getOrbSessionGateSnapshot,
  subscribeOrbSessionGate,
  type OrbBackendSyncState
} from '@/lib/orb/orb-session-gate'

export function useOrbSessionGate(): {
  backendSyncState: OrbBackendSyncState
  shouldSkipAuthenticatedFetch: boolean
} {
  const [backendSyncState, setBackendSyncState] = useState<OrbBackendSyncState>(
    () => getOrbSessionGateSnapshot().backendSyncState
  )

  useEffect(() => {
    return subscribeOrbSessionGate(() => {
      setBackendSyncState(getOrbSessionGateSnapshot().backendSyncState)
    })
  }, [])

  return {
    backendSyncState,
    shouldSkipAuthenticatedFetch: backendSyncState === 'offline' || backendSyncState === 'degraded'
  }
}
