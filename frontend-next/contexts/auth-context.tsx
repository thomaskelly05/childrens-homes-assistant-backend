'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import {
  authFetch,
  AuthApiError,
  getCsrfToken,
  isAuthFailureStatus,
  isRateLimitedStatus,
  isTemporaryUnavailableStatus
} from '@/lib/auth/api'
import { resetOrbAccessRequestCache } from '@/lib/orb/orb-access-request-cache'
import { resetOrbAccessLoadingDeadline } from '@/lib/orb/orb-access-loading-deadline'
import { resetPasskeyStatusCache } from '@/lib/auth/passkey-status-cache'
import { resetOrbBootstrapLock } from '@/lib/orb/orb-bootstrap-lock'
import { resetOrbBootstrapNetworkCounts } from '@/lib/orb/orb-product-bootstrap-guard'
import { resetOrbGateStateStore } from '@/lib/orb/orb-gate-state-store'
import { resetOrbAuthLoadingDeadline } from '@/lib/orb/orb-auth-loading-deadline'
import {
  ORB_AUTH_CONTEXT_TIMEOUT_MS,
  buildOrbFrontDoorUrl,
  isOrbSurfacePath
} from '@/lib/orb/orb-front-door-routing'
import {
  resetOrbFrontDoorVerdictStore,
  shouldDeferOrbAuthMeProbe
} from '@/lib/orb/orb-front-door-verdict-store'
import { recordOrbBootstrapRequest } from '@/lib/orb/orb-request-storm-guard'
import { markOrbBackendDegraded, markOrbBackendReady, resetOrbSessionGate } from '@/lib/orb/orb-session-gate'
import { clearStaleOrbSessionState } from '@/lib/orb/orb-stale-session-clear'
import { normaliseRole, permissionsForRole } from '@/lib/auth/permissions'
import { clearSensitiveBrowserState, suppressProductionConsole } from '@/lib/security/privacy'
import type { AuthMeResponse, LoginResponse, StaffUser } from '@/lib/auth/types'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type LoginInput = {
  email: string
  password: string
  remember: boolean
}

type AuthContextValue = {
  status: AuthStatus
  user: StaffUser | null
  error: string | null
  sessionExpired: boolean
  csrfReady: boolean
  refreshSession: () => Promise<void>
  login: (input: LoginInput) => Promise<LoginResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const publicPathPrefixes = [
  '/login',
  '/unauthorized',
  '/orb/signup',
  '/orb/access',
  '/orb/billing',
  '/orb/onboarding',
  '/orb/billing/success',
  '/orb/billing/cancel',
  '/privacy',
  '/terms'
]
const publicAssetPaths = new Set([
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/manifest.json',
  '/site.webmanifest',
  '/robots.txt',
  '/sitemap.xml'
])
const publicAssetPrefixes = ['/_next/', '/static/', '/images/', '/icons/']
const AUTH_CACHE_KEY = 'indicare.auth.identity.v1'
const e2eAuthEnabled = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'
const e2eEmail = process.env.NEXT_PUBLIC_E2E_USER_EMAIL || 'e2e.manager@indicare.local'
const e2ePassword = process.env.NEXT_PUBLIC_E2E_USER_PASSWORD || 'ChangeMeForE2E123!'
const e2eRole = normaliseRole(process.env.NEXT_PUBLIC_E2E_USER_ROLE || 'manager')

const e2eUser: StaffUser = {
  id: 9001,
  email: e2eEmail,
  role: e2eRole,
  home_id: 1,
  provider_id: 1,
  first_name: 'E2E',
  last_name: 'Manager',
  is_active: true,
  permissions: permissionsForRole(e2eRole),
  subscription_active: true,
  subscription_status: 'active',
  plan_name: 'E2E',
  mfa_enabled: true,
  mfa_verified: true,
  has_passkeys: true
}

/** E2E-only: sessionStorage `e2e-auth-auto=0` disables auto-login so cookie/session flows can be tested. */
function shouldE2eAutoAuthenticate(): boolean {
  if (!e2eAuthEnabled) return false
  try {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('e2e-auth-auto') === '0') {
      return false
    }
  } catch {
    // Ignore storage failures in test harness.
  }
  return true
}

function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  if (publicAssetPaths.has(pathname)) return true
  if (publicAssetPrefixes.some((prefix) => pathname.startsWith(prefix))) return true
  return publicPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function normaliseUser(user: StaffUser): StaffUser {
  const role = normaliseRole(user.role)
  return {
    ...user,
    role,
    permissions: Array.isArray(user.permissions) ? user.permissions : []
  }
}

function hasUserPayload(response: AuthMeResponse): response is AuthMeResponse & { user: StaffUser } {
  return Boolean(response?.user && typeof response.user === 'object')
}

function clearCachedIdentity() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(AUTH_CACHE_KEY)
  } catch {
    // Ignore storage failures; live auth remains authoritative.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<StaffUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [csrfReady, setCsrfReady] = useState(false)
  const logoutRedirecting = useRef(false)
  const refreshInFlight = useRef<Promise<void> | null>(null)

  const refreshSession = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current

    const run = async () => {
      setError(null)
      if (shouldE2eAutoAuthenticate()) {
        setUser(e2eUser)
        setStatus('authenticated')
        setSessionExpired(false)
        setCsrfReady(true)
        logoutRedirecting.current = false
        return
      }

      setStatus((current) => (current === 'authenticated' ? current : 'loading'))
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new AuthApiError(0, 'Session check timed out. Please sign in again.'))
        }, ORB_AUTH_CONTEXT_TIMEOUT_MS)
      })

      try {
        recordOrbBootstrapRequest('auth_me')
        const response = await Promise.race([authFetch<AuthMeResponse>('/auth/me'), timeoutPromise])
        if (!hasUserPayload(response)) {
          throw new AuthApiError(401, 'Your session could not be loaded')
        }
        const nextUser = normaliseUser(response.user)
        clearCachedIdentity()
        setUser(nextUser)
        setStatus('authenticated')
        setSessionExpired(false)
        setCsrfReady(Boolean(getCsrfToken()))
        logoutRedirecting.current = false
        resetOrbAuthLoadingDeadline()
        resetOrbAccessLoadingDeadline()
        markOrbBackendReady()
      } catch (caught) {
        const authError = caught instanceof AuthApiError ? caught : null
        if (authError && isRateLimitedStatus(authError.status)) {
          clearCachedIdentity()
          setUser(null)
          setStatus('unauthenticated')
          setError(authError.message || 'Too many requests. Please sign in again.')
          setSessionExpired(false)
          setCsrfReady(false)
          resetOrbAuthLoadingDeadline()
          markOrbBackendDegraded('auth')
          return
        }
        if (authError && isTemporaryUnavailableStatus(authError.status)) {
          setError(authError.message || 'Service temporarily unavailable. Please retry.')
          setUser((current) => {
            if (current) {
              setStatus('authenticated')
              setSessionExpired(false)
              setCsrfReady(Boolean(getCsrfToken()))
              return current
            }
            setStatus('unauthenticated')
            resetOrbAuthLoadingDeadline()
            return null
          })
          return
        }
        if (authError && isAuthFailureStatus(authError.status)) {
          clearStaleOrbSessionState('auth_401')
          clearCachedIdentity()
          setUser(null)
          setStatus('unauthenticated')
          setError(authError.message || 'Your session could not be loaded')
          setSessionExpired(true)
          setCsrfReady(false)
          resetOrbAuthLoadingDeadline()
          markOrbBackendDegraded('auth')
          return
        }
        clearCachedIdentity()
        setUser(null)
        setStatus('unauthenticated')
        setError(authError?.message || 'Your session could not be loaded')
        setSessionExpired(Boolean(authError?.status === 401))
        setCsrfReady(false)
        resetOrbAuthLoadingDeadline()
        if (!authError || authError.status === 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[auth] Session check failed or timed out; showing sign-in.')
          }
          markOrbBackendDegraded('auth')
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    refreshInFlight.current = run().finally(() => {
      refreshInFlight.current = null
    })
    return refreshInFlight.current
  }, [])

  useEffect(() => {
    suppressProductionConsole()
    if (shouldDeferOrbAuthMeProbe(pathname)) {
      setStatus('unauthenticated')
      setSessionExpired(false)
      setError(null)
      setCsrfReady(Boolean(getCsrfToken()))
      resetOrbAuthLoadingDeadline()
      return
    }
    if (isPublicPath(pathname)) {
      if (!isOrbSurfacePath(pathname)) {
        setStatus('unauthenticated')
        setSessionExpired(false)
        setError(null)
        setCsrfReady(Boolean(getCsrfToken()))
        resetOrbAuthLoadingDeadline()
        return
      }
      void refreshSession().finally(() => {
        setCsrfReady(Boolean(getCsrfToken()))
      })
      return
    }
    void refreshSession()
  }, [pathname, refreshSession])

  useEffect(() => {
    if (status !== 'unauthenticated' || isPublicPath(pathname) || logoutRedirecting.current) return
    if (isOrbSurfacePath(pathname)) return
    const search = typeof window === 'undefined' ? '' : window.location.search
    const returnTarget = `${pathname}${search}`
    const loginPath = buildOrbFrontDoorUrl(returnTarget)
    router.replace(`${loginPath}${sessionExpired ? (loginPath.includes('?') ? '&' : '?') + 'expired=1' : ''}`)
  }, [pathname, router, sessionExpired, status])

  const login = useCallback(async (input: LoginInput) => {
    setError(null)
    if (shouldE2eAutoAuthenticate()) {
      const accepted = input.email === e2eEmail && input.password === e2ePassword
      if (!accepted) {
        return {
          ok: false,
          authenticated: false,
          message: 'E2E credentials were not accepted.'
        }
      }
      setUser(e2eUser)
      setStatus('authenticated')
      setSessionExpired(false)
      setCsrfReady(true)
      logoutRedirecting.current = false
      return {
        ok: true,
        authenticated: true,
        message: 'E2E user authenticated.',
        user: e2eUser
      }
    }
    clearCachedIdentity()
    const response = await authFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    })

    if (response.user) {
      setUser(normaliseUser(response.user))
    }

    if (response.user && response.authenticated) {
      setStatus('authenticated')
      setSessionExpired(false)
      setCsrfReady(Boolean(getCsrfToken()))
      logoutRedirecting.current = false
      resetOrbAuthLoadingDeadline()
      resetOrbAccessLoadingDeadline()
    }

    return response
  }, [])

  const logout = useCallback(async () => {
    const redirectToOrbLogin = isOrbSurfacePath(pathname)
    try {
      if (!shouldE2eAutoAuthenticate()) {
        await authFetch('/auth/logout', { method: 'POST' })
      }
    } finally {
      logoutRedirecting.current = true
      clearStaleOrbSessionState('auth_401')
      clearCachedIdentity()
      setUser(null)
      setStatus('unauthenticated')
      setCsrfReady(false)
      resetOrbAuthLoadingDeadline()
      resetOrbAccessLoadingDeadline()
      resetOrbAccessRequestCache('logout')
      resetOrbBootstrapNetworkCounts()
      resetOrbBootstrapLock()
      resetPasskeyStatusCache()
      resetOrbGateStateStore()
      resetOrbSessionGate()
      resetOrbFrontDoorVerdictStore()
      if (redirectToOrbLogin && pathname === '/orb') {
        logoutRedirecting.current = false
        return
      }
      router.replace(redirectToOrbLogin ? '/orb' : buildOrbFrontDoorUrl())
    }
  }, [pathname, router])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      sessionExpired,
      csrfReady,
      refreshSession,
      login,
      logout
    }),
    [csrfReady, error, login, logout, refreshSession, sessionExpired, status, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
