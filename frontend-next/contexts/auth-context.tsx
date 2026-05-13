'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { authFetch, AuthApiError } from '@/lib/auth/api'
import { normaliseRole } from '@/lib/auth/permissions'
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
  refreshSession: () => Promise<void>
  login: (input: LoginInput) => Promise<LoginResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const publicPathPrefixes = ['/login', '/unauthorized']

function isPublicPath(pathname: string) {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<StaffUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const refreshSession = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const response = await authFetch<AuthMeResponse>('/auth/me')
      if (!hasUserPayload(response)) {
        throw new AuthApiError(401, 'Your session could not be loaded')
      }
      setUser(normaliseUser(response.user))
      setStatus('authenticated')
      setSessionExpired(false)
    } catch (caught) {
      const authError = caught instanceof AuthApiError ? caught : null
      setUser(null)
      setStatus('unauthenticated')
      setError(authError?.message || 'Your session could not be loaded')
      setSessionExpired(authError?.status === 401)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  useEffect(() => {
    if (status !== 'unauthenticated' || isPublicPath(pathname)) return
    const search = typeof window === 'undefined' ? '' : window.location.search
    const returnUrl = encodeURIComponent(`${pathname}${search}`)
    router.replace(`/login?returnUrl=${returnUrl}${sessionExpired ? '&expired=1' : ''}`)
  }, [pathname, router, sessionExpired, status])

  const login = useCallback(async (input: LoginInput) => {
    setError(null)
    const response = await authFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    })

    if (response.user && response.authenticated) {
      setUser(normaliseUser(response.user))
      setStatus('authenticated')
      setSessionExpired(false)
    }

    return response
  }, [])

  const logout = useCallback(async () => {
    try {
      await authFetch('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setStatus('unauthenticated')
      router.replace('/login')
    }
  }, [router])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      sessionExpired,
      refreshSession,
      login,
      logout
    }),
    [error, login, logout, refreshSession, sessionExpired, status, user]
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
