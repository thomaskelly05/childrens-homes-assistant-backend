'use client'

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { OrbAccessRetryScreen } from '@/components/orb-residential/orb-access-retry-screen'
import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
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
import {
  ORB_ACCESS_GATE_FALLBACK_MS,
  ORB_AUTH_GATE_FALLBACK_MS,
  isOrbSurfacePath,
  sanitizeOrbReturnUrl
} from '@/lib/orb/orb-front-door-routing'

export type OrbAuthGateMode = 'product' | 'billing'

const AUTH_FALLBACK_MESSAGE = 'We could not confirm your session. Please sign in.'
const ACCESS_FALLBACK_MESSAGE =
  'We could not verify your ORB access. Try again or manage billing.'
const ACCESS_RATE_LIMIT_MESSAGE = 'Too many access checks. Please wait a moment and try again.'
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
  const account = useOrbAccountState()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionInvalidatedRef = useRef(false)
  const safetyRedirectedRef = useRef(false)
  const [accessFallback, setAccessFallback] = useState(() =>
    auth.status === 'authenticated' && account.isLoading
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

  const handleAuthRetry = useCallback(() => {
    setAuthFallback(false)
    resetOrbAuthLoadingDeadline()
    void auth.refreshSession()
  }, [auth])

  const handleAccessRetry = useCallback(() => {
    setAccessFallback(false)
    resetOrbAccessLoadingDeadline()
    void account.refresh()
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
    if (auth.status !== 'authenticated' || !account.isLoading) {
      if (auth.status !== 'authenticated') {
        resetOrbAccessLoadingDeadline()
      }
      if (!account.isLoading) {
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
  }, [account.isLoading, auth.status])

  useEffect(() => {
    if (account.accessFailureKind !== 'unauthorized' || sessionInvalidatedRef.current) return
    sessionInvalidatedRef.current = true
    resetOrbAccessLoadingDeadline()
    void auth.logout()
  }, [account.accessFailureKind, auth])

  useEffect(() => {
    if (safetyRedirectedRef.current) return
    if (!account.isSignedIn || account.isLoading || account.accessFailureKind === 'safety_required') return
    if (account.safetyAccepted !== false || !account.access) return
    const entitled =
      Boolean(account.access.trial?.active) ||
      Boolean(account.access.subscription?.active) ||
      account.adminBypass
    if (!entitled) return
    safetyRedirectedRef.current = true
    router.replace('/orb/setup')
  }, [
    account.access,
    account.adminBypass,
    account.accessFailureKind,
    account.isLoading,
    account.isSignedIn,
    account.safetyAccepted,
    router
  ])

  if (auth.status === 'loading') {
    if (authFallback) {
      return (
        <OrbLoginScreen returnUrl={returnUrl} embedded sessionError={AUTH_FALLBACK_MESSAGE} />
      )
    }
    return (
      <OrbAuthLoadingScreen
        onRetry={handleAuthRetry}
        onBackToSignIn={handleBackToSignIn}
        timeoutMs={ORB_AUTH_GATE_FALLBACK_MS}
      />
    )
  }

  if (auth.status === 'unauthenticated') {
    return <OrbLoginScreen returnUrl={returnUrl} embedded sessionError={auth.error} />
  }

  if (account.isLoading && !accessFallback) {
    return (
      <OrbAuthLoadingScreen
        onRetry={handleAccessRetry}
        onBackToSignIn={handleBackToSignIn}
        timeoutMs={ORB_ACCESS_GATE_FALLBACK_MS}
        message="Verifying your ORB access…"
        submessage="Securing your ORB Residential access"
      />
    )
  }

  if (account.accessFailureKind === 'safety_required') {
    return (
      <OrbAccessRetryScreen
        message="Safety acceptance is required before using ORB Residential."
        detail="Complete the safety statements to continue."
        onRetry={() => router.push('/orb/setup')}
        onBackToSignIn={handleBackToSignIn}
      />
    )
  }

  if (account.accessFailureKind === 'payment_required') {
    return <OrbUpgradeScreen />
  }

  if (account.accessFailureKind === 'rate_limited') {
    return (
      <OrbAccessRetryScreen
        message={ACCESS_RATE_LIMIT_MESSAGE}
        onRetry={handleAccessRetry}
        onBackToSignIn={handleBackToSignIn}
        showManageBilling
        onManageBilling={handleManageBilling}
      />
    )
  }

  if (
    accessFallback ||
    account.accessFailureKind === 'timeout' ||
    account.accessFailureKind === 'unavailable'
  ) {
    return (
      <OrbAccessRetryScreen
        message={ACCESS_FALLBACK_MESSAGE}
        detail={
          account.accessFailureKind === 'unavailable' ? ACCESS_UNAVAILABLE_MESSAGE : undefined
        }
        onRetry={handleAccessRetry}
        onBackToSignIn={handleBackToSignIn}
        showManageBilling
        onManageBilling={handleManageBilling}
      />
    )
  }

  if (
    account.isSignedIn &&
    account.safetyAccepted === false &&
    account.access &&
    (Boolean(account.access.trial?.active) ||
      Boolean(account.access.subscription?.active) ||
      account.adminBypass)
  ) {
    return (
      <OrbAccessRetryScreen
        message="Safety acceptance is required before using ORB Residential."
        detail="Complete the safety statements to continue."
        onRetry={() => router.push('/orb/setup')}
        onBackToSignIn={handleBackToSignIn}
      />
    )
  }

  if (mode === 'product' && !account.hasConfirmedAccess && !account.adminBypass) {
    return <OrbUpgradeScreen />
  }

  return <>{children}</>
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
    <Suspense fallback={<OrbAuthLoadingScreen timeoutMs={ORB_AUTH_GATE_FALLBACK_MS} />}>
      <OrbAuthGateInner mode={mode}>{children}</OrbAuthGateInner>
    </Suspense>
  )
}
