'use client'

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { OrbAccessRetryScreen } from '@/components/orb-residential/orb-access-retry-screen'
import { OrbSafetyAcceptance } from '@/components/orb-residential/orb-safety-acceptance'
import { OrbAuthDebugPanel } from '@/components/orb-residential/orb-auth-debug-panel'
import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { OrbAccountStateProvider, useOrbAccountState } from '@/contexts/orb-account-context'
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
import { deriveOrbGateState, gateDecisionLabel, type OrbGateState } from '@/lib/orb/orb-auth-state-machine'
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
import { peekOrbOAuthRedirect } from '@/lib/orb/orb-oauth-redirect-state'
import { AuthApiError } from '@/lib/auth/api'

export type OrbAuthGateMode = 'product' | 'billing'

const ACCESS_FALLBACK_MESSAGE =
  'We could not verify your ORB access. Try again or manage billing.'
const ACCESS_UNAVAILABLE_MESSAGE = 'ORB access is temporarily unavailable. Please try again shortly.'

function buildReturnUrl(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname
}

function resolveStaleVerdictSession(payload: OrbFrontDoorVerdictPayload): void {
  if (!payload.clear_session && payload.verdict !== 'unauthenticated') return
  clearStaleOrbSessionState('verdict_401')
  resetOrbFrontDoorVerdictCache()
}

function OrbAuthGateAccessPhase({
  children,
  mode,
  verdict,
  returnUrl,
  onStaleAccess,
  onBackToSignIn,
  onManageBilling,
  onSafetyAccepted,
  debugPanel
}: {
  children: ReactNode
  mode: OrbAuthGateMode
  verdict: OrbFrontDoorVerdictPayload
  returnUrl: string
  onStaleAccess: () => void
  onBackToSignIn: () => void
  onManageBilling: () => void
  onSafetyAccepted: () => void
  debugPanel: ReactNode
}) {
  const auth = useAuth()
  const account = useOrbAccountState()
  const staleAccessHandled = useRef(false)

  useEffect(() => {
    if (account.accessFailureKind !== 'unauthorized') {
      staleAccessHandled.current = false
      return
    }
    if (staleAccessHandled.current) return
    staleAccessHandled.current = true
    clearStaleOrbSessionState('access_401')
    void auth.logout().finally(() => {
      onStaleAccess()
    })
  }, [account.accessFailureKind, auth, onStaleAccess])

  // account.accessStatus === 'loading' feeds deriveOrbGateState checking_access.
  const accessStatusLoading = account.accessStatus === 'loading'
  const gateState = deriveOrbGateState({
    authStatus: auth.status,
    isSignedIn: account.isSignedIn,
    accessLoading: accessStatusLoading,
    accessFailureKind: account.accessFailureKind,
    hasConfirmedAccess: account.hasConfirmedAccess,
    adminBypass: account.adminBypass,
    safetyAccepted: account.safetyAccepted,
    safetyRequired: account.accessFailureKind === 'safety_required',
    authFallback: false,
    accessFallback: false,
    loopBroken: isOrbRouteLoopBroken(),
    contractMismatch: account.contractMismatch,
    mode
  })

  const productChildrenMounted = gateState === 'ready'
  setOrbGateState(gateState, productChildrenMounted)

  switch (gateState) {
    case 'checking_access':
      return (
        <>
          <OrbAuthLoadingScreen
            onBackToSignIn={onBackToSignIn}
            timeoutMs={ORB_ACCESS_GATE_FALLBACK_MS}
            message="Verifying your ORB access…"
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
            onLoginSuccess={onStaleAccess}
          />
          {debugPanel}
        </>
      )

    case 'safety_required':
      return (
        <>
          <OrbSafetyAcceptance
            onAccepted={() => {
              onSafetyAccepted()
              void account.retry()
            }}
            onBackToSignIn={onBackToSignIn}
          />
          {debugPanel}
        </>
      )

    case 'inactive':
      return (
        <>
          <OrbUpgradeScreen initialAccess={verdict.access ?? account.access} />
          {debugPanel}
        </>
      )

    case 'access_retry':
      return (
        <>
          <OrbAccessRetryScreen
            message={account.accessError ?? ACCESS_FALLBACK_MESSAGE}
            detail={ACCESS_UNAVAILABLE_MESSAGE}
            onRetry={() => void account.retry()}
            onBackToSignIn={onBackToSignIn}
            showManageBilling
            onManageBilling={onManageBilling}
          />
          {debugPanel}
        </>
      )

    case 'ready':
      return (
        <>
          {children}
          {debugPanel}
        </>
      )

    default:
      return (
        <>
          <OrbAuthLoadingScreen
            onBackToSignIn={onBackToSignIn}
            timeoutMs={ORB_ACCESS_GATE_FALLBACK_MS}
            message="Please wait…"
          />
          {debugPanel}
        </>
      )
  }
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
  const [verdictServiceUnavailable, setVerdictServiceUnavailable] = useState(false)
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
      setVerdictServiceUnavailable(false)
      try {
        const payload = await fetchOrbFrontDoorVerdict({ force: options?.force })
        resolveStaleVerdictSession(payload)
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
          verdict: payload.verdict,
          clear_session: Boolean(payload.clear_session)
        })
        if (payload.verdict === 'ready' && auth.status !== 'authenticated') {
          await auth.refreshSession()
        } else if (payload.clear_session || payload.verdict === 'unauthenticated') {
          if (auth.status === 'authenticated') {
            await auth.refreshSession()
          }
        }
      } catch (error) {
        if (error instanceof AuthApiError && error.status === 401) {
          clearStaleOrbSessionState('verdict_401')
          resetOrbFrontDoorVerdictCache()
          setVerdict(null)
          setVerdictError(null)
          setVerdictServiceUnavailable(false)
          markOrbFrontDoorVerdictResolved(false)
          setOrbGateState('unauthenticated', false)
          if (auth.status === 'authenticated') {
            await auth.refreshSession()
          }
          return
        }
        if (error instanceof AuthApiError && error.status === 503) {
          setVerdictError(error.message || ACCESS_UNAVAILABLE_MESSAGE)
          setVerdictServiceUnavailable(true)
          setVerdict(null)
          markOrbFrontDoorVerdictResolved(false)
          setOrbGateState('access_retry', false)
          return
        }
        const message =
          error instanceof Error ? error.message : 'ORB front-door verdict could not be loaded'
        setVerdictError(message)
        setVerdictServiceUnavailable(false)
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
      : !verdict
        ? 'unauthenticated'
        : mode === 'billing' && verdict.verdict === 'ready'
          ? 'ready'
          : mapVerdictToGateState(verdict.verdict)

  const productChildrenMounted = gateState === 'ready'
  setOrbGateState(gateState, productChildrenMounted)

  const handleVerdictRetry = useCallback(() => {
    resetOrbFrontDoorVerdictCache()
    void loadVerdict({ force: true })
  }, [loadVerdict])

  const handleLoginSuccess = useCallback(() => {
    resetOrbFrontDoorVerdictCache()
    verdictFetchedRef.current = false
    void loadVerdict({ force: true })
  }, [loadVerdict])

  const handleStaleAccessRecovery = useCallback(() => {
    resetOrbFrontDoorVerdictStore()
    resetOrbFrontDoorVerdictCache()
    verdictFetchedRef.current = false
    setVerdict(null)
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

  const handleSafetyAccepted = useCallback(() => {
    resetOrbFrontDoorVerdictCache()
    verdictFetchedRef.current = false
    void loadVerdict({ force: true })
  }, [loadVerdict])

  useEffect(() => {
    if (gateState === 'ready') {
      clearOrbRouteLoopGuard()
    }
  }, [gateState])

  const oauthFinishing = peekOrbOAuthRedirect() !== null
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
            message={oauthFinishing ? 'Finishing sign in…' : 'Checking ORB access…'}
            submessage={
              oauthFinishing
                ? 'Setting up your ORB Residential session'
                : 'Securing your ORB Residential access'
            }
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
          <OrbSafetyAcceptance onAccepted={handleSafetyAccepted} onBackToSignIn={handleBackToSignIn} />
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
            message={
              verdictServiceUnavailable
                ? ACCESS_UNAVAILABLE_MESSAGE
                : verdictError ?? ACCESS_FALLBACK_MESSAGE
            }
            detail={
              verdictServiceUnavailable
                ? 'We are reconnecting to ORB. Your session is still signed in.'
                : ACCESS_UNAVAILABLE_MESSAGE
            }
            onRetry={handleVerdictRetry}
            onBackToSignIn={handleBackToSignIn}
            showManageBilling={!verdictServiceUnavailable}
            onManageBilling={handleManageBilling}
          />
          {debugPanel}
        </>
      )

    case 'ready':
      return (
        <>
          <OrbAccountStateProvider accessProbeEnabled initialAccess={verdict?.access ?? null}>
            <OrbAuthGateAccessPhase
              mode={mode}
              verdict={verdict!}
              returnUrl={returnUrl}
              onStaleAccess={handleStaleAccessRecovery}
              onBackToSignIn={handleBackToSignIn}
              onManageBilling={handleManageBilling}
              onSafetyAccepted={handleSafetyAccepted}
              debugPanel={debugPanel}
            >
              {children}
            </OrbAuthGateAccessPhase>
          </OrbAccountStateProvider>
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
