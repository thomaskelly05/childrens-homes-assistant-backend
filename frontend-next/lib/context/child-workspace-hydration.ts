import type { ActiveChildRecord } from './active-child-context'

export type AuthHydrationStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type ChildWorkspaceHydrationPhase =
  | 'auth'
  | 'session'
  | 'csrf'
  | 'active_child'
  | 'rbac'
  | 'preload'
  | 'ready'
  | 'blocked'

export type ChildWorkspaceReadyState = {
  phase: ChildWorkspaceHydrationPhase
  ready: boolean
  childId?: string
  reason?: string
}

const childWorkspaceRequiredRoots = new Set<string>()

const childWorkspaceQueryRoots = new Set([
  'actions',
  'documents',
  'evidence',
  'reports',
  'risk-assessments'
])

type SearchParamsLike = {
  get: (key: string) => string | null
}

export function childIdFromWorkspaceRoute(pathname: string, searchParams?: SearchParamsLike | null) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return decodeURIComponent(parts[1])
  return searchParams?.get('young_person_id') || searchParams?.get('youngPersonId') || undefined
}

export function routeRequiresChildWorkspace(pathname: string, searchParams?: SearchParamsLike | null) {
  const parts = pathname.split('/').filter(Boolean)
  const root = parts[0] || 'home'
  if (root === 'young-people' && parts[1]) return true
  if (childWorkspaceRequiredRoots.has(root)) return true
  if (childWorkspaceQueryRoots.has(root) && childIdFromWorkspaceRoute(pathname, searchParams)) return true
  return false
}

export function resolveChildWorkspaceHydration({
  authStatus,
  csrfReady,
  hasHydratedStorage,
  canReadRecords,
  activeChild,
  pathname,
  preloadStatus,
  searchParams
}: {
  authStatus: AuthHydrationStatus
  csrfReady: boolean
  hasHydratedStorage: boolean
  canReadRecords: boolean
  activeChild: ActiveChildRecord | null
  pathname: string
  preloadStatus: 'idle' | 'loading' | 'ready' | 'failed'
  searchParams?: SearchParamsLike | null
}): ChildWorkspaceReadyState {
  if (authStatus === 'loading') return { phase: 'auth', ready: false, reason: 'Checking session.' }
  if (authStatus !== 'authenticated') return { phase: 'session', ready: false, reason: 'Session is not authenticated.' }
  if (!csrfReady) return { phase: 'csrf', ready: false, reason: 'Preparing secure request context.' }
  if (!hasHydratedStorage) return { phase: 'active_child', ready: false, reason: 'Restoring child context.' }
  if (!canReadRecords) return { phase: 'rbac', ready: false, reason: 'Record access is not available for this role.' }

  const routeNeedsChild = routeRequiresChildWorkspace(pathname, searchParams)
  if (!routeNeedsChild) return { phase: 'ready', ready: true, childId: activeChild?.id }
  if (!activeChild) return { phase: 'active_child', ready: false, reason: 'Choose a child before opening this workspace.' }
  if (preloadStatus === 'failed') return { phase: 'blocked', ready: false, childId: activeChild.id, reason: 'This child workspace could not be verified.' }
  if (preloadStatus !== 'ready') return { phase: 'preload', ready: false, childId: activeChild.id, reason: 'Loading child workspace.' }
  return { phase: 'ready', ready: true, childId: activeChild.id }
}

const readyKeys = new Set<string>()
const waiters = new Map<string, Array<() => void>>()

export function childWorkspaceReadyKey(childId: string, lockVersion: number) {
  return `${childId}:${lockVersion}`
}

export function clearChildWorkspaceReady(childId?: string) {
  if (!childId) {
    readyKeys.clear()
    return
  }
  for (const key of Array.from(readyKeys)) {
    if (key.startsWith(`${childId}:`)) readyKeys.delete(key)
  }
}

export function markChildWorkspaceReady(childId: string, lockVersion: number) {
  const key = childWorkspaceReadyKey(childId, lockVersion)
  readyKeys.add(key)
  const listeners = waiters.get(key) || []
  waiters.delete(key)
  listeners.forEach((resolve) => resolve())
}

export async function waitForChildWorkspaceReady(childId: string, lockVersion: number, timeoutMs = 3000) {
  const key = childWorkspaceReadyKey(childId, lockVersion)
  if (readyKeys.has(key)) return true
  return new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => resolve(false), timeoutMs)
    const done = () => {
      window.clearTimeout(timeout)
      resolve(true)
    }
    waiters.set(key, [...(waiters.get(key) || []), done])
  })
}
