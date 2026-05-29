'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { authFetch, AuthApiError, getCsrfToken, isAuthFailureStatus, isTemporaryUnavailableStatus } from '@/lib/auth/api'
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

const publicPathPrefixes = ['/login', '/unauthorized', '/orb/login', '/orb/signup', '/orb/access', '/orb/onboarding']
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

function isPublicPath(pathname: string) {
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
      if (e2eAuthEnabled) {
        setUser(e2eUser)
        setStatus('authenticated')
        setSessionExpired(false)
        setCsrfReady(true)
        logoutRedirecting.current = false
        return
      }

      setStatus('loading')
      try {
        const response = await authFetch<AuthMeResponse>('/auth/me')
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
      } catch (caught) {
        const authError = caught instanceof AuthApiError ? caught : null
        if (authError && isTemporaryUnavailableStatus(authError.status)) {
          setError(authError.message || 'Service temporarily unavailable. Please retry.')
          setUser((current) => {
            if (current) {
              setStatus('authenticated')
              setSessionExpired(false)
              setCsrfReady(Boolean(getCsrfToken()))
              return current
            }
            setStatus('loading')
            return null
          })
          return
        }
        if (authError && isAuthFailureStatus(authError.status)) {
          clearCachedIdentity()
          setUser(null)
          setStatus('unauthenticated')
          setError(authError.message || 'Your session could not be loaded')
          setSessionExpired(true)
          setCsrfReady(false)
          return
        }
        clearCachedIdentity()
        setUser(null)
        setStatus('unauthenticated')
        setError(authError?.message || 'Your session could not be loaded')
        setSessionExpired(false)
        setCsrfReady(false)
      }
    }

    refreshInFlight.current = run().finally(() => {
      refreshInFlight.current = null
    })
    return refreshInFlight.current
  }, [])

  useEffect(() => {
    suppressProductionConsole()
    if (isPublicPath(pathname)) {
      setStatus('unauthenticated')
      setSessionExpired(false)
      setCsrfReady(Boolean(getCsrfToken()))
      return
    }
    void refreshSession()
  }, [pathname, refreshSession])

  useEffect(() => {
    if (status !== 'unauthenticated' || isPublicPath(pathname) || logoutRedirecting.current) return
    const search = typeof window === 'undefined' ? '' : window.location.search
    const returnUrl = encodeURIComponent(`${pathname}${search}`)
    const loginPath = pathname.startsWith('/orb') ? '/orb/login' : '/login'
    router.replace(`${loginPath}?returnUrl=${returnUrl}${sessionExpired ? '&expired=1' : ''}`)
  }, [pathname, router, sessionExpired, status])

  const login = useCallback(async (input: LoginInput) => {
    setError(null)
    if (e2eAuthEnabled) {
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
    }

    return response
  }, [])

  const logout = useCallback(async () => {
    try {
      if (!e2eAuthEnabled) {
        await authFetch('/auth/logout', { method: 'POST' })
      }
    } finally {
      logoutRedirecting.current = true
      clearSensitiveBrowserState()
      clearCachedIdentity()
      setUser(null)
      setStatus('unauthenticated')
      setCsrfReady(false)
      router.replace('/login')
    }
  }, [router])

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
