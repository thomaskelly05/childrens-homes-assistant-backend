/** Canonical child workspace page path (Next.js app route, not proxied to backend). */
export function childWorkspaceHref(childId: string | number) {
  return `/young-people/${encodeURIComponent(String(childId))}/workspace`
}

/** Backend JSON data route (proxied via /os/* rewrite — never use for browser navigation). */
export function childWorkspaceApiHref(childId: string | number) {
  return `/os/young-people/${encodeURIComponent(String(childId))}/workspace`
}

export function childIdFromPath(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'young-people' && parts[1]) return decodeURIComponent(parts[1])
  if (parts[0] === 'children' && parts[1]) return decodeURIComponent(parts[1])
  return undefined
}

/** True when pathname is the frontend child workspace page. */
export function isChildWorkspacePage(pathname: string, childId?: string | number | null) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'young-people' || parts[2] !== 'workspace') return false
  if (childId == null || childId === '') return true
  return decodeURIComponent(parts[1] || '') === String(childId)
}

/** True when pathname is the backend API child workspace route (must not be used as a page). */
export function isChildWorkspaceApiPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts[0] === 'os' && parts[1] === 'young-people' && parts[3] === 'workspace'
}

/** @deprecated Use isChildWorkspacePage — kept for imports migrating off /os page paths. */
export function isChildWorkspacePath(pathname: string) {
  return isChildWorkspacePage(pathname)
}

export function isAlreadyOnScopedChildWorkspace(pathname: string, selectedChildId: string | number | null | undefined) {
  if (selectedChildId == null || selectedChildId === '') return false
  const canonical = childWorkspaceHref(selectedChildId)
  return pathname === canonical || pathname.startsWith(`${canonical}/`)
}
