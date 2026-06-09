import { authFetch } from '@/lib/auth/api'
import { childIdFromPath, childWorkspaceHref, isChildWorkspacePage } from '@/lib/navigation/child-workspace-routes'

export type OsScopeType = 'none' | 'home' | 'child'

export type OsScopeHomeOption = {
  id: number
  name: string
  status?: string | null
}

export type OsScopeChildOption = {
  id: number
  name: string
  home_id?: number | null
  placement_status?: string | null
}

export type OsScopeRoutes = {
  select_scope: string
  home_workspace?: string | null
  child_workspace?: string | null
  settings: string
  logout: string
}

export type OsScopeState = {
  scope_type: OsScopeType
  selected_home_id?: number | null
  selected_home_name?: string | null
  selected_child_id?: number | null
  selected_child_name?: string | null
  recent_homes: OsScopeHomeOption[]
  recent_children: OsScopeChildOption[]
  available_homes: OsScopeHomeOption[]
  available_children: OsScopeChildOption[]
  available_children_for_home?: OsScopeChildOption[]
  routes: OsScopeRoutes
  warnings: string[]
  degraded: boolean
  cache_status?: string
  metadata?: Record<string, unknown>
}

export type OsScopeMenuSummary = {
  scope_type: OsScopeType
  home_id?: number | null
  child_id?: number | null
  recording_alert_count: number
  action_count: number
  notification_count: number
  handover_review_count: number
  warnings: string[]
  degraded: boolean
  cache_status?: string
}

const STORAGE_HOME_KEY = 'indicare.os.scope.home.v1'
const STORAGE_CHILD_KEY = 'indicare.os.scope.child.v1'
const STORAGE_TYPE_KEY = 'indicare.os.scope.type.v1'

type StoredScope = {
  scope_type: OsScopeType
  home_id?: number
  home_name?: string
  child_id?: number
  child_name?: string
}

function readStorage(): StoredScope | null {
  if (typeof window === 'undefined') return null
  try {
    const scope_type = (window.sessionStorage.getItem(STORAGE_TYPE_KEY) || window.localStorage.getItem(STORAGE_TYPE_KEY)) as OsScopeType | null
    const homeRaw = window.sessionStorage.getItem(STORAGE_HOME_KEY) || window.localStorage.getItem(STORAGE_HOME_KEY)
    const childRaw = window.sessionStorage.getItem(STORAGE_CHILD_KEY) || window.localStorage.getItem(STORAGE_CHILD_KEY)
    const home = homeRaw ? (JSON.parse(homeRaw) as { id: number; name?: string }) : null
    const child = childRaw ? (JSON.parse(childRaw) as { id: number; name?: string; home_id?: number }) : null
    if (!scope_type || scope_type === 'none') return { scope_type: 'none' }
    return {
      scope_type,
      home_id: home?.id,
      home_name: home?.name,
      child_id: child?.id,
      child_name: child?.name
    }
  } catch {
    return null
  }
}

export function persistScopeLocally(scope: StoredScope) {
  if (typeof window === 'undefined') return
  try {
    for (const storage of [window.sessionStorage, window.localStorage]) {
      storage.setItem(STORAGE_TYPE_KEY, scope.scope_type)
      if (scope.home_id) {
        storage.setItem(STORAGE_HOME_KEY, JSON.stringify({ id: scope.home_id, name: scope.home_name }))
      } else {
        storage.removeItem(STORAGE_HOME_KEY)
      }
      if (scope.child_id) {
        storage.setItem(STORAGE_CHILD_KEY, JSON.stringify({ id: scope.child_id, name: scope.child_name, home_id: scope.home_id }))
      } else {
        storage.removeItem(STORAGE_CHILD_KEY)
      }
    }
  } catch {
    // Ignore storage failures; server session remains authoritative when available.
  }
}

export function clearScopeLocally() {
  if (typeof window === 'undefined') return
  for (const storage of [window.sessionStorage, window.localStorage]) {
    storage.removeItem(STORAGE_TYPE_KEY)
    storage.removeItem(STORAGE_HOME_KEY)
    storage.removeItem(STORAGE_CHILD_KEY)
  }
}

export function scopeFromRoute(pathname: string): { childId?: string; homeId?: string } {
  const childId = childIdFromPath(pathname)
  if (childId) return { childId }
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'homes' && parts[1]) return { homeId: decodeURIComponent(parts[1]) }
  return {}
}

export {
  childWorkspaceApiHref,
  childWorkspaceHref,
  isAlreadyOnScopedChildWorkspace,
  isChildWorkspaceApiPath,
  isChildWorkspacePage,
  isChildWorkspacePath
} from '@/lib/navigation/child-workspace-routes'

export function routeRequiresScope(pathname: string) {
  if (pathname === '/' || pathname === '/os' || pathname.startsWith('/os/')) return false
  if (pathname === '/select-scope' || pathname.startsWith('/select-scope/')) return false
  if (pathname === '/login' || pathname.startsWith('/login/')) return false
  if (pathname === '/unauthorized') return false
  if (pathname === '/orb' || pathname.startsWith('/orb/')) return false
  if (pathname === '/assistant/voice' || pathname.startsWith('/assistant/settings/')) return false
  if (pathname === '/profile' || pathname.startsWith('/settings')) return false
  if (pathname.startsWith('/mfa')) return false
  if (pathname === '/founder' || pathname.startsWith('/founder/')) return false
  return true
}

export function workspaceHrefForScope(scope: Pick<OsScopeState, 'scope_type' | 'routes' | 'selected_child_id' | 'selected_home_id'>) {
  if (scope.scope_type === 'child' && scope.selected_child_id) return childWorkspaceHref(scope.selected_child_id)
  if (scope.scope_type === 'home' && scope.routes.home_workspace) return scope.routes.home_workspace
  if (scope.scope_type === 'home' && scope.selected_home_id) return `/homes/${scope.selected_home_id}/workspace`
  return '/select-scope'
}

function normaliseScopeState(data: OsScopeState): OsScopeState {
  const children = Array.isArray(data.available_children)
    ? data.available_children
    : Array.isArray(data.available_children_for_home)
      ? data.available_children_for_home
      : []
  return {
    ...data,
    available_homes: Array.isArray(data.available_homes) ? data.available_homes : [],
    available_children: children,
    available_children_for_home: children,
    recent_homes: Array.isArray(data.recent_homes) ? data.recent_homes : [],
    recent_children: Array.isArray(data.recent_children) ? data.recent_children : [],
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    degraded: Boolean(data.degraded),
    routes: data.routes || { select_scope: '/select-scope', settings: '/settings', logout: '/login' }
  }
}

export async function fetchScopeOptions(homeId?: number) {
  const query = homeId ? `?home_id=${encodeURIComponent(String(homeId))}` : ''
  const payload = await authFetch<{ ok: boolean; data: OsScopeState }>(`/api/os/scope/options${query}`)
  return normaliseScopeState(payload.data)
}

export async function fetchCurrentScope() {
  const payload = await authFetch<{ ok: boolean; data: OsScopeState }>('/api/os/scope/current')
  return normaliseScopeState(payload.data)
}

export async function selectScope(input: {
  scope_type: OsScopeType
  home_id?: number
  child_id?: number
  home_name?: string
  child_name?: string
}) {
  const payload = await authFetch<{ ok: boolean; data: OsScopeState }>('/api/os/scope/select', {
    method: 'POST',
    body: JSON.stringify(input)
  })
  const state = normaliseScopeState(payload.data)
  persistScopeLocally({
    scope_type: state.scope_type,
    home_id: state.selected_home_id ?? undefined,
    home_name: state.selected_home_name ?? undefined,
    child_id: state.selected_child_id ?? undefined,
    child_name: state.selected_child_name ?? undefined
  })
  return state
}

export async function clearScope() {
  const payload = await authFetch<{ ok: boolean; data: OsScopeState }>('/api/os/scope/clear', { method: 'POST' })
  clearScopeLocally()
  return normaliseScopeState(payload.data)
}

export async function fetchScopeMenuSummary(params: {
  scope_type?: OsScopeType
  home_id?: number | null
  child_id?: number | null
}) {
  const search = new URLSearchParams()
  if (params.scope_type) search.set('scope_type', params.scope_type)
  if (params.home_id) search.set('home_id', String(params.home_id))
  if (params.child_id) search.set('child_id', String(params.child_id))
  const query = search.toString() ? `?${search.toString()}` : ''
  const payload = await authFetch<{ ok: boolean; data: OsScopeMenuSummary }>(`/api/os/menu-summary${query}`)
  return payload.data
}

export function hydrateScopeFromStorage(): StoredScope | null {
  return readStorage()
}

export function syncScopeFromPath(pathname: string, state: OsScopeState): OsScopeState {
  const route = scopeFromRoute(pathname)
  if (route.childId) {
    const childId = Number.parseInt(route.childId, 10)
    if (Number.isFinite(childId)) {
      return {
        ...state,
        scope_type: 'child',
        selected_child_id: childId,
        routes: {
          ...state.routes,
          child_workspace: childWorkspaceHref(childId)
        }
      }
    }
  }
  if (isChildWorkspacePage(pathname) && state.scope_type === 'child' && state.selected_child_id) {
    return {
      ...state,
      routes: {
        ...state.routes,
        child_workspace: childWorkspaceHref(state.selected_child_id)
      }
    }
  }
  if (route.homeId) {
    const homeId = Number.parseInt(route.homeId, 10)
    if (Number.isFinite(homeId)) {
      return {
        ...state,
        scope_type: state.scope_type === 'child' ? state.scope_type : 'home',
        selected_home_id: homeId,
        routes: {
          ...state.routes,
          home_workspace: `/homes/${homeId}/workspace`
        }
      }
    }
  }
  return state
}
