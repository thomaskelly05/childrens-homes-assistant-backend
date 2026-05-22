'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/contexts/auth-context'
import { authFetchResponse } from '@/lib/auth/api'
import { userHasPermission } from '@/lib/auth/permissions'
import {
  clearChildWorkspaceReady,
  markChildWorkspaceReady,
  resolveChildWorkspaceHydration,
  type ChildWorkspaceReadyState
} from '@/lib/context/child-workspace-hydration'

export type ActiveChildRecord = {
  id: string
  displayName: string
  preferredName?: string
  homeId?: string | number | null
  source: 'route' | 'session' | 'manual'
  selectedAt: string
}

export type ActiveChildBreadcrumb = {
  label: string
  href?: string
  current?: boolean
}

type ActiveChildContextValue = {
  activeChild: ActiveChildRecord | null
  recentChildren: ActiveChildRecord[]
  lockVersion: number
  isLocked: boolean
  hasHydratedStorage: boolean
  preloadStatus: 'idle' | 'loading' | 'ready' | 'failed'
  preloadSummary: Record<string, unknown> | null
  readyState: ChildWorkspaceReadyState
  breadcrumbs: ActiveChildBreadcrumb[]
  selectChild: (child: Pick<ActiveChildRecord, 'id' | 'displayName' | 'preferredName' | 'homeId'>, source?: ActiveChildRecord['source']) => void
  clearActiveChild: () => void
  childScopedHref: (href: string) => string
}

const ActiveChildContext = createContext<ActiveChildContextValue | undefined>(undefined)

const activeChildKey = 'child-context:active.v1'
const recentChildrenKey = 'child-context:recent.v1'
const lockVersionKey = 'child-context:lock-version.v1'
const e2eUiMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function safeStorage(storage: Storage | undefined, key: string) {
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function parseRecord(value: string | null): ActiveChildRecord | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as ActiveChildRecord
    return parsed?.id && parsed?.displayName ? parsed : null
  } catch {
    return null
  }
}

function parseRecent(value: string | null): ActiveChildRecord[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.displayName).slice(0, 6) : []
  } catch {
    return []
  }
}

export function childIdFromRoute(pathname: string, searchParams?: { get: (key: string) => string | null } | null) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return decodeURIComponent(parts[1])
  return searchParams?.get('young_person_id') || searchParams?.get('youngPersonId') || undefined
}

function childRecordFromId(id: string, source: ActiveChildRecord['source']): ActiveChildRecord {
  return {
    id,
    displayName: `Young person ${id}`,
    source,
    selectedAt: new Date().toISOString()
  }
}

function writeStorage(child: ActiveChildRecord | null, recent: ActiveChildRecord[], lockVersion: number) {
  if (typeof window === 'undefined') return
  try {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      if (child) storage.setItem(activeChildKey, JSON.stringify(child))
      else storage.removeItem(activeChildKey)
      storage.setItem(recentChildrenKey, JSON.stringify(recent))
      storage.setItem(lockVersionKey, String(lockVersion))
    }
  } catch {
    // Storage can be unavailable in private browsing; the route still remains the source of truth.
  }
}

function removeChildScopedStorage(previousChildId: string) {
  if (typeof window === 'undefined') return
  const scopedPrefixes = [
    `indicare-recording-draft:${previousChildId}:`,
    `record-context:${previousChildId}`,
    `child-context:${previousChildId}`,
    `report-draft:${previousChildId}`,
    `temporary-report:${previousChildId}`,
    `orb:${previousChildId}`,
    `assistant:${previousChildId}`
  ]
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean) as string[]
    for (const key of keys) {
      if (scopedPrefixes.some((prefix) => key.startsWith(prefix)) || key.includes(`:${previousChildId}:`)) {
        storage.removeItem(key)
      }
    }
  }
  if ('caches' in window) {
    void window.caches.keys().then((keys) => {
      for (const key of keys) {
        if (key.includes(previousChildId)) void window.caches.delete(key)
      }
    }).catch(() => undefined)
  }
}

function nextRecent(child: ActiveChildRecord, recent: ActiveChildRecord[]) {
  return [child, ...recent.filter((item) => item.id !== child.id)].slice(0, 6)
}

function pageLabel(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1] || 'journey'
  if (last === 'new') return 'Recording workspace'
  return last.split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function buildBreadcrumbs(pathname: string, child: ActiveChildRecord | null): ActiveChildBreadcrumb[] {
  const crumbs: ActiveChildBreadcrumb[] = [{ label: 'Children', href: '/home' }]
  if (!child) return [...crumbs, { label: 'Select child', current: true }]
  crumbs.push({ label: child.preferredName || child.displayName, href: `/young-people/${encodeURIComponent(child.id)}/journey` })
  const label = pageLabel(pathname)
  if (label !== 'Journey') crumbs.push({ label, current: true })
  else crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], current: true }
  return crumbs
}

function scopedHref(href: string, child: ActiveChildRecord | null) {
  if (!child) return href
  const id = encodeURIComponent(child.id)
  if (href === '/chronology') return `/young-people/${id}/chronology`
  if (href === '/safeguarding') return `/young-people/${id}/chronology?filter=safeguarding`
  if (href === '/actions') return `/actions?young_person_id=${id}`
  if (href === '/reports') return `/reports?young_person_id=${id}`
  if (href === '/documents') return `/documents?young_person_id=${id}`
  if (href === '/evidence') return `/evidence?young_person_id=${id}`
  if (href === '/keywork') return `/young-people/${id}/keywork/new`
  if (href === '/risk-assessments') return `/risk-assessments?young_person_id=${id}`
  return href
}

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/home'
  const { status, user, csrfReady } = useAuth()
  const canReadRecords = userHasPermission(user, 'records:read')
  const [activeChild, setActiveChild] = useState<ActiveChildRecord | null>(null)
  const [recentChildren, setRecentChildren] = useState<ActiveChildRecord[]>([])
  const [lockVersion, setLockVersion] = useState(0)
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false)
  const [preloadStatus, setPreloadStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [preloadSummary, setPreloadSummary] = useState<Record<string, unknown> | null>(null)

  const commitChild = useCallback((next: ActiveChildRecord | null, source: ActiveChildRecord['source'] = 'manual') => {
    setActiveChild((current) => {
      const previousId = current?.id
      const normalised = next ? { ...next, source, selectedAt: new Date().toISOString() } : null
      setRecentChildren((currentRecent) => {
        const updatedRecent = normalised ? nextRecent(normalised, currentRecent) : currentRecent
        setLockVersion((version) => {
          const updatedVersion = version + 1
          if (previousId && previousId !== normalised?.id) {
            removeChildScopedStorage(previousId)
            clearChildWorkspaceReady(previousId)
          }
          writeStorage(normalised, updatedRecent, updatedVersion)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('indicare:active-child-changed', {
              detail: {
                previousChildId: previousId,
                activeChildId: normalised?.id ?? null,
                lockVersion: updatedVersion,
                invalidated: Boolean(previousId && previousId !== normalised?.id)
              }
            }))
          }
          return updatedVersion
        })
        return updatedRecent
      })
      return normalised
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hydrated = parseRecord(safeStorage(window.sessionStorage, activeChildKey)) || parseRecord(safeStorage(window.localStorage, activeChildKey))
    const recent = parseRecent(safeStorage(window.localStorage, recentChildrenKey))
    const version = Number(safeStorage(window.sessionStorage, lockVersionKey) || safeStorage(window.localStorage, lockVersionKey) || 0)
    setActiveChild(hydrated)
    setRecentChildren(recent)
    setLockVersion(Number.isFinite(version) ? version : 0)
    setHasHydratedStorage(true)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || !canReadRecords) return
    const routeChildId = childIdFromRoute(pathname, typeof window === 'undefined' ? null : new URLSearchParams(window.location.search))
    if (!routeChildId || routeChildId === activeChild?.id) return
    commitChild(childRecordFromId(routeChildId, 'route'), 'route')
  }, [activeChild?.id, canReadRecords, commitChild, pathname, status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      setActiveChild(null)
      setRecentChildren([])
      setLockVersion(0)
      setPreloadStatus('idle')
      setPreloadSummary(null)
      clearChildWorkspaceReady()
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated' || !csrfReady || !canReadRecords || !activeChild?.id) {
      setPreloadStatus(activeChild ? 'loading' : 'idle')
      setPreloadSummary(null)
      return
    }
    if (e2eUiMode) {
      setPreloadStatus('ready')
      setPreloadSummary(null)
      markChildWorkspaceReady(activeChild.id, lockVersion)
      return
    }
    const controller = new AbortController()
    setPreloadStatus('loading')
    setPreloadSummary(null)
    void authFetchResponse(`/os/young-people/${encodeURIComponent(activeChild.id)}/workspace`, {
      signal: controller.signal
    }).then(async (response) => {
      if (!response.ok) throw new Error('Child workspace could not be verified.')
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const workspace = (payload.data ?? payload) as Record<string, unknown>
      setPreloadSummary({
        ok: true,
        source: 'os-young-person-workspace',
        canonicalRoute: `/os/young-people/${activeChild.id}/workspace`,
        workspace
      })
      setPreloadStatus('ready')
      markChildWorkspaceReady(activeChild.id, lockVersion)
    }).catch((error) => {
      if (controller.signal.aborted) return
      setPreloadSummary(null)
      setPreloadStatus('failed')
      clearChildWorkspaceReady(activeChild.id)
      if (process.env.NODE_ENV === 'development') {
        console.warn('Child workspace preload failed', error)
      }
    })
    return () => controller.abort()
  }, [activeChild, canReadRecords, csrfReady, lockVersion, status])

  const readyState = useMemo(() => resolveChildWorkspaceHydration({
    authStatus: status,
    csrfReady,
    hasHydratedStorage,
    canReadRecords,
    activeChild,
    pathname,
    preloadStatus,
    searchParams: typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)
  }), [activeChild, canReadRecords, csrfReady, hasHydratedStorage, pathname, preloadStatus, status])

  const value = useMemo<ActiveChildContextValue>(() => ({
    activeChild,
    recentChildren,
    lockVersion,
    isLocked: Boolean(activeChild),
    hasHydratedStorage,
    preloadStatus,
    preloadSummary,
    readyState,
    breadcrumbs: buildBreadcrumbs(pathname, activeChild),
    selectChild: (child, source = 'manual') => commitChild({ ...child, source, selectedAt: new Date().toISOString() }, source),
    clearActiveChild: () => commitChild(null),
    childScopedHref: (href) => scopedHref(href, activeChild)
  }), [activeChild, commitChild, hasHydratedStorage, lockVersion, pathname, preloadStatus, preloadSummary, readyState, recentChildren])

  return <ActiveChildContext.Provider value={value}>{children}</ActiveChildContext.Provider>
}

export function useActiveChild() {
  const context = useContext(ActiveChildContext)
  if (!context) {
    throw new Error('useActiveChild must be used within ActiveChildProvider')
  }
  return context
}
