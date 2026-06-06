'use client'

import { ReactNode, Suspense, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { OrbAuthLoadingScreen } from '@/components/orb-residential/orb-auth-loading-screen'
import { OrbLoginScreen } from '@/components/orb-residential/orb-login-screen'
import { OrbUpgradeScreen } from '@/components/orb-standalone/orb-upgrade-screen'
import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'

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

  const returnUrl = useMemo(() => {
    const query = searchParams.toString()
    return buildReturnUrl(pathname, query)
  }, [pathname, searchParams])

  if (auth.status === 'loading') {
    return <OrbAuthLoadingScreen />
  }

  if (auth.status === 'unauthenticated') {
    return <OrbLoginScreen returnUrl={returnUrl} embedded />
  }

  if (account.isLoading) {
    return <OrbAuthLoadingScreen />
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
