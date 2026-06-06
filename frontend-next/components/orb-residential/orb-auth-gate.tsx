'use client'

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import {
  getOrbAuthLoadingRemainingMs,
  hasOrbAuthLoadingDeadlinePassed,
  markOrbAuthLoadingStart,
  resetOrbAuthLoadingDeadline
} from '@/lib/orb/orb-auth-loading-deadline'
import {
  ORB_AUTH_GATE_FALLBACK_MS,
  ORB_AUTH_LOADING_TIMEOUT_MS,
  sanitizeOrbReturnUrl
} from '@/lib/orb/orb-front-door-routing'

export type OrbAuthGateMode = 'product' | 'billing'

const AUTH_FALLBACK_MESSAGE = 'We could not confirm your session. Please sign in.'
const ACCESS_FALLBACK_MESSAGE = 'We could not verify your ORB access. Please sign in again.'

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
  const searchParams = useSearchParams()
  const [accessTimedOut, setAccessTimedOut] = useState(false)
  const [authFallback, setAuthFallback] = useState(() =>
    auth.status === 'loading' ? hasOrbAuthLoadingDeadlinePassed(ORB_AUTH_GATE_FALLBACK_MS) : false
  )

  const returnUrl = useMemo(() => {
    const query = searchParams.toString()
    const fromPath = buildReturnUrl(pathname, query)
    const fromQuery = searchParams.get('returnUrl')
    return sanitizeOrbReturnUrl(fromQuery || fromPath)
  }, [pathname, searchParams])

  const handleRetry = useCallback(() => {
    setAccessTimedOut(false)
    setAuthFallback(false)
    resetOrbAuthLoadingDeadline()
    void auth.refreshSession()
  }, [auth])

  const handleBackToSignIn = useCallback(() => {
    setAccessTimedOut(false)
    if (auth.status === 'loading') {
      setAuthFallback(true)
      return
    }
    if (auth.status !== 'unauthenticated') {
      void auth.logout()
    }
  }, [auth])

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
      setAccessTimedOut(false)
      return
    }
    const timer = window.setTimeout(() => {
      setAccessTimedOut(true)
    }, ORB_AUTH_LOADING_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [account.isLoading, auth.status])

  if (auth.status === 'loading') {
    if (authFallback) {
      return (
        <OrbLoginScreen returnUrl={returnUrl} embedded sessionError={AUTH_FALLBACK_MESSAGE} />
      )
    }
    return (
      <OrbAuthLoadingScreen
        onRetry={handleRetry}
        onBackToSignIn={handleBackToSignIn}
        timeoutMs={ORB_AUTH_GATE_FALLBACK_MS}
      />
    )
  }

  if (auth.status === 'unauthenticated') {
    return <OrbLoginScreen returnUrl={returnUrl} embedded sessionError={auth.error} />
  }

  if (account.isLoading && !accessTimedOut) {
    return (
      <OrbAuthLoadingScreen
        onRetry={handleRetry}
        onBackToSignIn={handleBackToSignIn}
        timeoutMs={ORB_AUTH_LOADING_TIMEOUT_MS}
        message="Verifying your ORB access…"
        submessage="Securing your ORB Residential access"
      />
    )
  }

  if (accessTimedOut && account.isLoading) {
    return <OrbLoginScreen returnUrl={returnUrl} embedded sessionError={ACCESS_FALLBACK_MESSAGE} />
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
