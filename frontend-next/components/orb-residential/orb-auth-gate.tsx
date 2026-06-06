'use client'

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import { ORB_AUTH_LOADING_TIMEOUT_MS, sanitizeOrbReturnUrl } from '@/lib/orb/orb-front-door-routing'

export type OrbAuthGateMode = 'product' | 'billing'

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

  const returnUrl = useMemo(() => {
    const query = searchParams.toString()
    const fromPath = buildReturnUrl(pathname, query)
    const fromQuery = searchParams.get('returnUrl')
    return sanitizeOrbReturnUrl(fromQuery || fromPath)
  }, [pathname, searchParams])

  const handleRetry = useCallback(() => {
    setAccessTimedOut(false)
    void auth.refreshSession()
  }, [auth])

  const handleBackToSignIn = useCallback(() => {
    setAccessTimedOut(false)
    if (auth.status !== 'unauthenticated') {
      void auth.logout()
    }
  }, [auth])

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
    return <OrbAuthLoadingScreen onRetry={handleRetry} onBackToSignIn={handleBackToSignIn} />
  }

  if (auth.status === 'unauthenticated') {
    return <OrbLoginScreen returnUrl={returnUrl} embedded sessionError={auth.error} />
  }

  if (account.isLoading && !accessTimedOut) {
    return <OrbAuthLoadingScreen onRetry={handleRetry} onBackToSignIn={handleBackToSignIn} />
  }

  if (accessTimedOut && account.isLoading) {
    return <OrbLoginScreen returnUrl={returnUrl} embedded sessionError="We could not verify your ORB access. Please sign in again." />
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
    <Suspense fallback={<OrbAuthLoadingScreen />}>
      <OrbAuthGateInner mode={mode}>{children}</OrbAuthGateInner>
    </Suspense>
  )
}
