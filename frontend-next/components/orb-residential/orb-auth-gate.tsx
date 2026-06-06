'use client'

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { OrbAccessRetryScreen } from '@/components/orb-residential/orb-access-retry-screen'
import { OrbAuthDebugPanel } from '@/components/orb-residential/orb-auth-debug-panel'
import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { OrbAccountStateProvider } from '@/contexts/orb-account-context'
import { useAuth } from '@/contexts/auth-context'
import { getOrbAccessRequestCount } from '@/lib/orb/orb-access-request-cache'
import { setOrbGateState } from '@/lib/orb/orb-gate-state-store'
import { getOrbBootstrapLockDebugSnapshot } from '@/lib/orb/orb-bootstrap-lock'
import { getPasskeyStatusRequestCount } from '@/lib/auth/passkey-status-cache'
import {
  canBootstrapOrbProduct,
  getLastBlockedBootstrapReason,
  getOrbBootstrapNetworkCounts
} from '@/lib/orb/orb-product-bootstrap-guard'
import { recordOrbAuthDebugEvent } from '@/lib/orb/orb-auth-debug-events'
import { gateDecisionLabel, type OrbGateState } from '@/lib/orb/orb-auth-state-machine'
import {
  ORB_ACCESS_GATE_FALLBACK_MS,
  ORB_AUTH_GATE_FALLBACK_MS,
  sanitizeOrbReturnUrl
} from '@/lib/orb/orb-front-door-routing'
import {
  fetchOrbFrontDoorVerdict,
  mapVerdictToGateState,
  resetOrbFrontDoorVerdictCache,
  type OrbFrontDoorVerdictPayload
} from '@/lib/orb/orb-front-door-verdict-client'
import {
  markOrbFrontDoorVerdictProbeStarted,
  markOrbFrontDoorVerdictResolved,
  resetOrbFrontDoorVerdictStore
} from '@/lib/orb/orb-front-door-verdict-store'
import { getOrbBootstrapRequestCounts } from '@/lib/orb/orb-request-storm-guard'
import {
  clearOrbRouteLoopGuard,
  isOrbRouteLoopBroken,
  wrapOrbRouter
} from '@/lib/orb/orb-route-loop-guard'
import { clearStaleOrbSessionState } from '@/lib/orb/orb-stale-session-clear'

export type OrbAuthGateMode = 'product' | 'billing'

const ACCESS_FALLBACK_MESSAGE =
  'We could not verify your ORB access. Try again or manage billing.'
const ACCESS_UNAVAILABLE_MESSAGE = 'ORB access is temporarily unavailable. Please try again shortly.'

function buildReturnUrl(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname
}

function OrbAuthGateInner({
  children,
  mode = 'product'
}: {
  children: ReactNode
  mode?: OrbAuthGateMode
}) {
  const auth = useAuth()
  const pathname = usePathname()
  const rawRouter = useRouter()
  const router = useMemo(() => wrapOrbRouter(rawRouter, 'orb-auth-gate'), [rawRouter])
  const searchParams = useSearchParams()
  const verdictFetchedRef = useRef(false)
  const [verdictLoading, setVerdictLoading] = useState(true)
  const [verdict, setVerdict] = useState<OrbFrontDoorVerdictPayload | null>(null)
  const [verdictError, setVerdictError] = useState<string | null>(null)
  const [backendBuild, setBackendBuild] = useState<string | null>(null)

  const returnUrl = useMemo(() => {
    const query = searchParams.toString()
    const fromPath = buildReturnUrl(pathname, query)
    const fromQuery = searchParams.get('returnUrl')
    return sanitizeOrbReturnUrl(fromQuery || fromPath)
  }, [pathname, searchParams])

  const loadVerdict = useCallback(
    async (options?: { force?: boolean }) => {
      markOrbFrontDoorVerdictProbeStarted()
      setVerdictLoading(true)
      setVerdictError(null)
      try {
        const payload = await fetchOrbFrontDoorVerdict({ force: options?.force })
        setVerdict(payload)
        setBackendBuild(payload.backend_build)
        const gate = mapVerdictToGateState(payload.verdict)
        const productReady = payload.verdict === 'ready' && payload.frontend_should_mount_product
        setOrbGateState(gate, productReady)
        markOrbFrontDoorVerdictResolved(productReady)
        recordOrbAuthDebugEvent('gate_decision', {
          from: 'boot',
          to: gate,
          decision: gateDecisionLabel(gate),
          verdict: payload.verdict
        })
        if (payload.clear_session) {
          clearStaleOrbSessionState('auth_401')
        }
        if (payload.verdict === 'ready') {
          await auth.refreshSession()
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'ORB front-door verdict could not be loaded'
        setVerdictError(message)
        setVerdict(null)
        markOrbFrontDoorVerdictResolved(false)
        setOrbGateState('access_retry', false)
      } finally {
        setVerdictLoading(false)
      }
    },
    [auth]
  )

  useEffect(() => {
    if (verdictFetchedRef.current) return
    verdictFetchedRef.current = true
    void loadVerdict()
  }, [loadVerdict])

  const gateState: OrbGateState = verdictLoading
    ? 'checking_auth'
    : verdictError
      ? 'access_retry'
      : mode === 'billing' && verdict?.verdict === 'ready'
        ? 'ready'
        : mapVerdictToGateState(verdict?.verdict ?? 'retry')

  const productChildrenMounted = gateState === 'ready'
  setOrbGateState(gateState, productChildrenMounted)

  const handleVerdictRetry = useCallback(() => {
    resetOrbFrontDoorVerdictCache()
    void loadVerdict({ force: true })
  }, [loadVerdict])

  const handleLoginSuccess = useCallback(() => {
    resetOrbFrontDoorVerdictCache()
    void loadVerdict({ force: true })
  }, [loadVerdict])

  const handleBackToSignIn = useCallback(() => {
    resetOrbFrontDoorVerdictStore()
    resetOrbFrontDoorVerdictCache()
    if (auth.status !== 'unauthenticated') {
      void auth.logout()
    }
  }, [auth])

  const handleManageBilling = useCallback(() => {
    router.push('/orb/billing')
  }, [router])

  useEffect(() => {
    if (gateState === 'ready') {
      clearOrbRouteLoopGuard()
    }
  }, [gateState])

  const bootstrapCounts = getOrbBootstrapNetworkCounts()
  const bootstrapLockDebug = getOrbBootstrapLockDebugSnapshot()
  const stormCounts = getOrbBootstrapRequestCounts()
  const debugPanel = (
    <OrbAuthDebugPanel
      pathname={pathname}
      authStatus={auth.status}
      authUserPresent={Boolean(auth.user)}
      accessStatus={verdict?.verdict ?? 'idle'}
      accessLoading={verdictLoading}
      accessError={verdictError}
      accessHttpStatus={null}
      gateState={gateState}
      childrenMounted={productChildrenMounted}
      productBootstrapAllowed={canBootstrapOrbProduct(gateState, verdict?.access ?? null)}
      productMounted={productChildrenMounted}
      accountState={verdict?.verdict ?? 'idle'}
      accessRequestCount={getOrbAccessRequestCount()}
      projectRequestCount={bootstrapCounts.projectRequestCount}
      configRequestCount={bootstrapCounts.configRequestCount}
      voiceStatusRequestCount={bootstrapCounts.voiceStatusRequestCount}
      outputsSummaryRequestCount={bootstrapCounts.outputsSummaryRequestCount}
      passkeyStatusRequestCount={getPasskeyStatusRequestCount()}
      verdictRequestCount={stormCounts.verdict}
      authMeRequestCount={stormCounts.auth_me}
      backendBuild={backendBuild}
      bootstrapLock={bootstrapLockDebug.bootstrapLock}
      blockedBootstrapCalls={bootstrapLockDebug.blockedBootstrapCalls}
      projectFetchBlocked={bootstrapLockDebug.projectFetchBlocked}
      configFetchBlocked={bootstrapLockDebug.configFetchBlocked}
      voiceFetchBlocked={bootstrapLockDebug.voiceFetchBlocked}
      outputsFetchBlocked={bootstrapLockDebug.outputsFetchBlocked}
      lastBlockedBootstrapReason={getLastBlockedBootstrapReason()}
      loopGuardBroken={isOrbRouteLoopBroken()}
    />
  )

  switch (gateState) {
    case 'checking_auth':
      return (
        <>
          <OrbAuthLoadingScreen
            onRetry={handleVerdictRetry}
            onBackToSignIn={handleBackToSignIn}
            timeoutMs={ORB_AUTH_GATE_FALLBACK_MS}
            message="Checking ORB access…"
          />
          {debugPanel}
        </>
      )

    case 'unauthenticated':
      return (
        <>
          <OrbLoginScreen
            returnUrl={returnUrl}
            embedded
            embeddedGateMode
            sessionError={verdictError ?? auth.error}
            onLoginSuccess={handleLoginSuccess}
          />
          {debugPanel}
        </>
      )

    case 'safety_required':
      return (
        <>
          <OrbAccessRetryScreen
            message="Safety acceptance is required before using ORB Residential."
            detail="Complete the safety statements to continue."
            onRetry={() => router.push('/orb/setup')}
            onBackToSignIn={handleBackToSignIn}
          />
          {debugPanel}
        </>
      )

    case 'inactive':
      return (
        <>
          <OrbUpgradeScreen initialAccess={verdict?.access ?? null} />
          {debugPanel}
        </>
      )

    case 'access_retry':
      return (
        <>
          <OrbAccessRetryScreen
            message={verdictError ?? ACCESS_FALLBACK_MESSAGE}
            detail={ACCESS_UNAVAILABLE_MESSAGE}
            onRetry={handleVerdictRetry}
            onBackToSignIn={handleBackToSignIn}
            showManageBilling
            onManageBilling={handleManageBilling}
          />
          {debugPanel}
        </>
      )

    case 'ready':
      return (
        <>
          <OrbAccountStateProvider
            accessProbeEnabled
            initialAccess={verdict?.access ?? null}
          >
            {children}
          </OrbAccountStateProvider>
          {debugPanel}
        </>
      )

    default:
      return (
        <>
          <OrbAuthLoadingScreen
            onRetry={handleVerdictRetry}
            onBackToSignIn={handleBackToSignIn}
            timeoutMs={ORB_ACCESS_GATE_FALLBACK_MS}
            message="Please wait…"
          />
          {debugPanel}
        </>
      )
  }
}

/**
 * Hard gate for ORB Residential product surfaces.
 * Uses GET /orb/front-door/verdict as the sole initial bootstrap probe.
 */
export function OrbAuthGate({
  children,
  mode = 'product'
}: {
  children: ReactNode
  mode?: OrbAuthGateMode
}) {
  return (
    <Suspense fallback={<OrbAuthLoadingScreen timeoutMs={ORB_AUTH_GATE_FALLBACK_MS} />}>
      <OrbAuthGateInner mode={mode}>{children}</OrbAuthGateInner>
    </Suspense>
  )
}
