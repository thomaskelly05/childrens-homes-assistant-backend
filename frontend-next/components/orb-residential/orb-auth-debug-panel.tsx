'use client'

import { useEffect, useState } from 'react'

import {
  buildOrbAuthDebugSnapshot,
  getOrbAuthDebugEvents,
  isOrbAuthDebugEnabled
} from '@/lib/orb/orb-auth-debug-events'
import type { OrbGateState } from '@/lib/orb/orb-auth-state-machine'

export function OrbAuthDebugPanel({
  pathname,
  authStatus,
  authUserPresent,
  accessStatus,
  accessLoading,
  accessError,
  accessHttpStatus,
  gateState,
  childrenMounted = false,
  productBootstrapAllowed = false,
  productMounted = false,
  accountState = 'idle',
  accessRequestCount = 0,
  projectRequestCount = 0,
  configRequestCount = 0,
  voiceStatusRequestCount = 0,
  outputsSummaryRequestCount = 0,
  passkeyStatusRequestCount = 0,
  verdictRequestCount = 0,
  authMeRequestCount = 0,
  backendBuild = null,
  bootstrapLock = 'locked',
  blockedBootstrapCalls = [] as string[],
  projectFetchBlocked = 0,
  configFetchBlocked = 0,
  voiceFetchBlocked = 0,
  outputsFetchBlocked = 0,
  lastBlockedBootstrapReason = null,
  loopGuardBroken = false
}: {
  pathname: string
  authStatus: string
  authUserPresent: boolean
  accessStatus: string
  accessLoading: boolean
  accessError: string | null
  accessHttpStatus: number | null
  gateState: OrbGateState
  childrenMounted?: boolean
  productBootstrapAllowed?: boolean
  productMounted?: boolean
  accountState?: string
  accessRequestCount?: number
  projectRequestCount?: number
  configRequestCount?: number
  voiceStatusRequestCount?: number
  outputsSummaryRequestCount?: number
  passkeyStatusRequestCount?: number
  verdictRequestCount?: number
  authMeRequestCount?: number
  backendBuild?: string | null
  bootstrapLock?: 'locked' | 'unlocked'
  blockedBootstrapCalls?: string[]
  projectFetchBlocked?: number
  configFetchBlocked?: number
  voiceFetchBlocked?: number
  outputsFetchBlocked?: number
  lastBlockedBootstrapReason?: string | null
  loopGuardBroken?: boolean
}) {
  const [events, setEvents] = useState(getOrbAuthDebugEvents)

  useEffect(() => {
    if (!isOrbAuthDebugEnabled()) return
    const refresh = () => setEvents(getOrbAuthDebugEvents())
    window.addEventListener('orb-auth-debug', refresh)
    return () => window.removeEventListener('orb-auth-debug', refresh)
  }, [])

  if (!isOrbAuthDebugEnabled()) return null

  const snapshot = {
    ...buildOrbAuthDebugSnapshot({
      pathname,
      authStatus,
      authUserPresent,
      accessStatus,
      accessLoading,
      accessError,
      accessHttpStatus,
      gateDecision: gateState
    }),
    gateState,
    childrenMounted,
    productBootstrapAllowed,
    productMounted,
    accountState,
    accessRequestCount,
    projectRequestCount,
    configRequestCount,
    voiceStatusRequestCount,
    outputsSummaryRequestCount,
    passkeyStatusRequestCount,
    verdictRequestCount,
    authMeRequestCount,
    backendBuild,
    bootstrapLock,
    blockedBootstrapCalls,
    projectFetchBlocked,
    configFetchBlocked,
    voiceFetchBlocked,
    outputsFetchBlocked,
    lastBlockedBootstrapReason,
    loopGuard: { broken: loopGuardBroken }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] max-h-[40vh] overflow-auto border-t border-amber-500/40 bg-black/90 p-3 font-mono text-[10px] text-amber-100"
      data-orb-auth-debug-panel
    >
      <p className="font-semibold text-amber-300">ORB Auth Debug (?debugAuth=1)</p>
      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(snapshot, null, 2)}</pre>
      {events.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-amber-400">Recent events ({events.length})</summary>
          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(events.slice(-20), null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  )
}
