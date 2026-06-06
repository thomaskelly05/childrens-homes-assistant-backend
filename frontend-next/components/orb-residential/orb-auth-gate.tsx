'use client'

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { OrbAccessRetryScreen } from '@/components/orb-residential/orb-access-retry-screen'
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
import {
  getOrbAccessLoadingRemainingMs,
  hasOrbAccessLoadingDeadlinePassed,
  markOrbAccessLoadingStart,
  resetOrbAccessLoadingDeadline
} from '@/lib/orb/orb-access-loading-deadline'
import {
  getOrbAuthLoadingRemainingMs,
  hasOrbAuthLoadingDeadlinePassed,
  markOrbAuthLoadingStart,
  resetOrbAuthLoadingDeadline
} from '@/lib/orb/orb-auth-loading-deadline'
import { recordOrbAuthDebugEvent } from '@/lib/orb/orb-auth-debug-events'
import {
  deriveOrbGateState,
  gateDecisionLabel,
  type OrbGateState
} from '@/lib/orb/orb-auth-state-machine'
import {
  ORB_ACCESS_GATE_FALLBACK_MS,
  ORB_AUTH_GATE_FALLBACK_MS,
  isOrbSurfacePath,
  sanitizeOrbReturnUrl
} from '@/lib/orb/orb-front-door-routing'
import {
  clearOrbRouteLoopGuard,
  isOrbRouteLoopBroken,
  wrapOrbRouter
} from '@/lib/orb/orb-route-loop-guard'
import { clearStaleOrbSessionState } from '@/lib/orb/orb-stale-session-clear'

export type OrbAuthGateMode = 'product' | 'billing'

const AUTH_FALLBACK_MESSAGE = 'We could not confirm your session. Please sign in.'
const ACCESS_FALLBACK_MESSAGE =
  'We could not verify your ORB access. Try again or manage billing.'
const ACCESS_RATE_LIMIT_MESSAGE = 'Too many access checks. Please wait a moment and try again.'
const ACCESS_UNAVAILABLE_MESSAGE = 'ORB access is temporarily unavailable. Please try again shortly.'
const CONTRACT_MISMATCH_MESSAGE =
  'ORB could not verify the access contract with the server. Please try again or refresh the app.'

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
  const account = useOrbAccountState()
  const pathname = usePathname()
  const rawRouter = useRouter()
  const router = useMemo(() => wrapOrbRouter(rawRouter, 'orb-auth-gate'), [rawRouter])
  const searchParams = useSearchParams()
  const sessionInvalidatedRef = useRef(false)
  const safetyRedirectedRef = useRef(false)
  const [accessFallback, setAccessFallback] = useState(() =>
    auth.status === 'authenticated' && account.accessStatus === 'loading'
      ? hasOrbAccessLoadingDeadlinePassed(ORB_ACCESS_GATE_FALLBACK_MS)
      : false
  )
  const [authFallback, setAuthFallback] = useState(() =>
    auth.status === 'loading' ? hasOrbAuthLoadingDeadlinePassed(ORB_AUTH_GATE_FALLBACK_MS) : false
  )

  const returnUrl = useMemo(() => {
    const query = searchParams.toString()
    const fromPath = buildReturnUrl(pathname, query)
    const fromQuery = searchParams.get('returnUrl')
    return sanitizeOrbReturnUrl(fromQuery || fromPath)
  }, [pathname, searchParams])

  const safetyRequired =
    account.isSignedIn &&
    (account.accessFailureKind === 'safety_required' ||
      (account.safetyAccepted === false &&
        Boolean(
          account.access &&
            (account.access.trial?.active ||
              account.access.subscription?.active ||
              account.adminBypass)
        )))

  const gateState: OrbGateState = deriveOrbGateState({
    authStatus: auth.status,
    isSignedIn: account.isSignedIn,
    accessLoading: account.accessStatus === 'loading',
    accessFailureKind: account.accessFailureKind,
    hasConfirmedAccess: account.hasConfirmedAccess,
    adminBypass: account.adminBypass,
    safetyAccepted: account.safetyAccepted,
    safetyRequired,
    authFallback,
    accessFallback,
    loopBroken: isOrbRouteLoopBroken(),
    contractMismatch: account.contractMismatch,
    mode
  })

  const productChildrenMounted = gateState === 'ready'
  setOrbGateState(gateState, productChildrenMounted)

  const prevGateStateRef = useRef<OrbGateState>(gateState)

  useEffect(() => {
    if (prevGateStateRef.current !== gateState) {
      recordOrbAuthDebugEvent('gate_decision', {
        from: prevGateStateRef.current,
        to: gateState,
        decision: gateDecisionLabel(gateState)
      })
      prevGateStateRef.current = gateState
    }
    if (gateState === 'ready') {
      clearOrbRouteLoopGuard()
    }
  }, [gateState])

  useEffect(() => {
    recordOrbAuthDebugEvent('auth_transition', {
      status: auth.status,
      userPresent: Boolean(auth.user)
    })
  }, [auth.status, auth.user])

  useEffect(() => {
    recordOrbAuthDebugEvent('access_transition', {
      status: account.accessStatus,
      loading: account.accessStatus === 'loading',
      failureKind: account.accessFailureKind,
      httpStatus: account.accessFetchStatus
    })
  }, [
    account.accessFailureKind,
    account.accessFetchStatus,
    account.accessStatus
  ])

  const handleAuthRetry = useCallback(() => {
    setAuthFallback(false)
    resetOrbAuthLoadingDeadline()
    void auth.refreshSession()
  }, [auth])

  const handleAccessRetry = useCallback(() => {
    setAccessFallback(false)
    resetOrbAccessLoadingDeadline()
    void account.retry()
  }, [account])

  const handleBackToSignIn = useCallback(() => {
    setAccessFallback(false)
    resetOrbAccessLoadingDeadline()
    if (auth.status === 'loading') {
      setAuthFallback(true)
      return
    }
    if (auth.status !== 'unauthenticated') {
      void auth.logout()
    }
  }, [auth])

  const handleLoginSuccess = useCallback(() => {
    resetOrbAuthLoadingDeadline()
    resetOrbAccessLoadingDeadline()
    void auth.refreshSession().then(() => account.retry())
  }, [account, auth])

  const handleManageBilling = useCallback(() => {
    router.push('/orb/billing')
  }, [router])

  useEffect(() => {
    if (!isOrbSurfacePath(pathname)) {
      resetOrbAccessLoadingDeadline()
      setAccessFallback(false)
    }
  }, [pathname])

  useEffect(() => {
    if (auth.status !== 'loading') {
      resetOrbAuthLoadingDeadline()
      setAuthFallback(false)
      return
    }

    markOrbAuthLoadingStart()
    if (hasOrbAuthLoadingDeadlinePassed(ORB_AUTH_GATE_FALLBACK_MS)) {
      setAuthFallback(true)
      return
    }

    const remaining = getOrbAuthLoadingRemainingMs(ORB_AUTH_GATE_FALLBACK_MS)
    const timer = window.setTimeout(() => {
      setAuthFallback(true)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [auth.status])

  useEffect(() => {
    if (auth.status !== 'authenticated' || account.accessStatus !== 'loading') {
      if (auth.status !== 'authenticated') {
        resetOrbAccessLoadingDeadline()
      }
      if (account.accessStatus !== 'loading') {
        setAccessFallback(false)
      }
      return
    }

    markOrbAccessLoadingStart()
    if (hasOrbAccessLoadingDeadlinePassed(ORB_ACCESS_GATE_FALLBACK_MS)) {
      setAccessFallback(true)
      return
    }

    const remaining = getOrbAccessLoadingRemainingMs(ORB_ACCESS_GATE_FALLBACK_MS)
    const timer = window.setTimeout(() => {
      setAccessFallback(true)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [account.accessStatus, auth.status])

  useEffect(() => {
    if (account.accessFailureKind !== 'unauthorized' || sessionInvalidatedRef.current) return
    sessionInvalidatedRef.current = true
    resetOrbAccessLoadingDeadline()
    clearStaleOrbSessionState('access_401')
    void auth.logout()
  }, [account.accessFailureKind, auth])

  useEffect(() => {
    if (safetyRedirectedRef.current) return
    if (gateState !== 'safety_required') return
    if (!account.isSignedIn || account.accessFailureKind === 'safety_required') return
    if (account.safetyAccepted !== false || !account.access) return
    safetyRedirectedRef.current = true
    router.push('/orb/setup')
  }, [account.access, account.accessFailureKind, account.isSignedIn, account.safetyAccepted, gateState, router])

  const bootstrapCounts = getOrbBootstrapNetworkCounts()
  const bootstrapLockDebug = getOrbBootstrapLockDebugSnapshot()
  const debugPanel = (
    <OrbAuthDebugPanel
      pathname={pathname}
      authStatus={auth.status}
      authUserPresent={Boolean(auth.user)}
      accessStatus={account.accessStatus}
      accessLoading={account.accessStatus === 'loading'}
      accessError={account.accessError}
      accessHttpStatus={account.accessFetchStatus}
      gateState={gateState}
      childrenMounted={productChildrenMounted}
      productBootstrapAllowed={canBootstrapOrbProduct(gateState, account.access)}
      productMounted={productChildrenMounted}
      accountState={account.accessStatus}
      accessRequestCount={getOrbAccessRequestCount()}
      projectRequestCount={bootstrapCounts.projectRequestCount}
      configRequestCount={bootstrapCounts.configRequestCount}
      voiceStatusRequestCount={bootstrapCounts.voiceStatusRequestCount}
      outputsSummaryRequestCount={bootstrapCounts.outputsSummaryRequestCount}
      passkeyStatusRequestCount={getPasskeyStatusRequestCount()}
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
            onRetry={handleAuthRetry}
            onBackToSignIn={handleBackToSignIn}
            timeoutMs={ORB_AUTH_GATE_FALLBACK_MS}
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
            sessionError={authFallback ? AUTH_FALLBACK_MESSAGE : auth.error}
            onLoginSuccess={handleLoginSuccess}
          />
          {debugPanel}
        </>
      )

    case 'checking_access':
      return (
        <>
          <OrbAuthLoadingScreen
            onRetry={handleAccessRetry}
            onBackToSignIn={handleBackToSignIn}
            timeoutMs={ORB_ACCESS_GATE_FALLBACK_MS}
            message="Verifying your ORB access…"
            submessage="Securing your ORB Residential access"
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
          <OrbUpgradeScreen />
          {debugPanel}
        </>
      )

    case 'access_retry':
      return (
        <>
          <OrbAccessRetryScreen
            message={
              account.contractMismatch ? CONTRACT_MISMATCH_MESSAGE : ACCESS_FALLBACK_MESSAGE
            }
            detail={
              account.accessFailureKind === 'unavailable'
                ? ACCESS_UNAVAILABLE_MESSAGE
                : account.accessFailureKind === 'rate_limited'
                  ? ACCESS_RATE_LIMIT_MESSAGE
                  : undefined
            }
            onRetry={handleAccessRetry}
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
          {children}
          {debugPanel}
        </>
      )

    case 'signing_out':
    case 'error':
    case 'boot':
    default:
      return (
        <>
          <OrbAuthLoadingScreen
            onRetry={handleAuthRetry}
            onBackToSignIn={handleBackToSignIn}
            timeoutMs={ORB_AUTH_GATE_FALLBACK_MS}
            message="Please wait…"
          />
          {debugPanel}
        </>
      )
  }
}

/**
 * Hard gate for ORB Residential product surfaces.
 * Unauthenticated users see only the login screen; loading never leaks product UI.
 */
export function OrbAuthGate({
  children,
  mode = 'product'
}: {
  children: ReactNode
  mode?: OrbAuthGateMode
}) {
  return (
    <OrbAccountStateProvider>
      <Suspense fallback={<OrbAuthLoadingScreen timeoutMs={ORB_AUTH_GATE_FALLBACK_MS} />}>
        <OrbAuthGateInner mode={mode}>{children}</OrbAuthGateInner>
      </Suspense>
    </OrbAccountStateProvider>
  )
}
