'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/contexts/auth-context'
import { AuthApiError, isAuthFailureStatus } from '@/lib/auth/api'
import {
  clearScope,
  clearScopeLocally,
  fetchCurrentScope,
  fetchScopeMenuSummary,
  hydrateScopeFromStorage,
  persistScopeLocally,
  selectScope,
  syncScopeFromPath,
  type OsScopeMenuSummary,
  type OsScopeState,
  type OsScopeType
} from '@/lib/os-scope'

type OsScopeContextValue = {
  scope: OsScopeState
  menuSummary: OsScopeMenuSummary | null
  loading: boolean
  error: string | null
  refreshScope: () => Promise<void>
  applyScopeSelection: (input: {
    scope_type: OsScopeType
    home_id?: number
    child_id?: number
    home_name?: string
    child_name?: string
  }) => Promise<OsScopeState>
  clearOsScope: () => Promise<void>
}

const defaultScope: OsScopeState = {
  scope_type: 'none',
  recent_homes: [],
  recent_children: [],
  available_homes: [],
  available_children_for_home: [],
  routes: { select_scope: '/select-scope', settings: '/settings', logout: '/login' },
  warnings: [],
  degraded: false
}

const OsScopeContext = createContext<OsScopeContextValue | undefined>(undefined)

export function OsScopeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const { status, user } = useAuth()
  const [scope, setScope] = useState<OsScopeState>(defaultScope)
  const [menuSummary, setMenuSummary] = useState<OsScopeMenuSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshScope = useCallback(async () => {
    if (status !== 'authenticated' || !user) {
      setScope(defaultScope)
      setMenuSummary(null)
      setLoading(false)
      return
    }
    setError(null)
    try {
      const stored = hydrateScopeFromStorage()
      let next = await fetchCurrentScope()
      if (next.scope_type === 'none' && stored && stored.scope_type !== 'none') {
        next = {
          ...next,
          scope_type: stored.scope_type,
          selected_home_id: stored.home_id ?? null,
          selected_home_name: stored.home_name ?? null,
          selected_child_id: stored.child_id ?? null,
          selected_child_name: stored.child_name ?? null
        }
      }
      next = syncScopeFromPath(pathname, next)
      setScope(next)
      if (next.scope_type !== 'none') {
        const summary = await fetchScopeMenuSummary({
          scope_type: next.scope_type,
          home_id: next.selected_home_id,
          child_id: next.selected_child_id
        })
        setMenuSummary(summary)
      } else {
        setMenuSummary(null)
      }
    } catch (caught) {
      const apiError = caught instanceof AuthApiError ? caught : null
      if (apiError && isAuthFailureStatus(apiError.status)) {
        setScope(defaultScope)
        setMenuSummary(null)
        setError(apiError.message)
      } else if (apiError?.status === 503) {
        const stored = hydrateScopeFromStorage()
        if (stored && stored.scope_type !== 'none') {
          setScope({
            ...defaultScope,
            scope_type: stored.scope_type,
            selected_home_id: stored.home_id ?? null,
            selected_home_name: stored.home_name ?? null,
            selected_child_id: stored.child_id ?? null,
            selected_child_name: stored.child_name ?? null,
            degraded: true,
            warnings: [apiError.message || 'Database busy — scope preserved locally.']
          })
        }
        setError(apiError.message || 'Service temporarily unavailable.')
      } else {
        setError(caught instanceof Error ? caught.message : 'Scope could not be loaded.')
      }
    } finally {
      setLoading(false)
    }
  }, [pathname, status, user])

  useEffect(() => {
    void refreshScope()
  }, [refreshScope])

  const applyScopeSelection = useCallback(
    async (input: {
      scope_type: OsScopeType
      home_id?: number
      child_id?: number
      home_name?: string
      child_name?: string
    }) => {
      const next = await selectScope(input)
      persistScopeLocally({
        scope_type: next.scope_type,
        home_id: next.selected_home_id ?? undefined,
        home_name: next.selected_home_name ?? undefined,
        child_id: next.selected_child_id ?? undefined,
        child_name: next.selected_child_name ?? undefined
      })
      setScope(next)
      if (next.scope_type !== 'none') {
        const summary = await fetchScopeMenuSummary({
          scope_type: next.scope_type,
          home_id: next.selected_home_id,
          child_id: next.selected_child_id
        })
        setMenuSummary(summary)
      } else {
        setMenuSummary(null)
      }
      return next
    },
    []
  )

  const clearOsScope = useCallback(async () => {
    const next = await clearScope()
    clearScopeLocally()
    setScope(next)
    setMenuSummary(null)
  }, [])

  const value = useMemo(
    () => ({
      scope,
      menuSummary,
      loading,
      error,
      refreshScope,
      applyScopeSelection,
      clearOsScope
    }),
    [applyScopeSelection, clearOsScope, error, loading, menuSummary, refreshScope, scope]
  )

  return <OsScopeContext.Provider value={value}>{children}</OsScopeContext.Provider>
}

export function useOsScope() {
  const context = useContext(OsScopeContext)
  if (!context) throw new Error('useOsScope must be used within OsScopeProvider')
  return context
}
