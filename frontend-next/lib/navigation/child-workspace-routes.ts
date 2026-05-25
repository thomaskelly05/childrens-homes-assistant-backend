/** Canonical child workspace path (Next.js app route, not backend /os rewrite). */
export function childWorkspaceHref(childId: string | number) {
  return `/os/young-people/${encodeURIComponent(String(childId))}/workspace`
}

export function childIdFromPath(pathname: string): string | undefined {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'os' && parts[1] === 'young-people' && parts[2]) return decodeURIComponent(parts[2])
  if (parts[0] === 'young-people' && parts[1]) return decodeURIComponent(parts[1])
  if (parts[0] === 'children' && parts[1]) return decodeURIComponent(parts[1])
  return undefined
}

export function isChildWorkspacePath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'os' && parts[1] === 'young-people' && parts[3] === 'workspace') return true
  if (parts[0] === 'young-people' && parts[2] === 'workspace') return true
  return false
}

export function isAlreadyOnScopedChildWorkspace(pathname: string, selectedChildId: string | number | null | undefined) {
  if (selectedChildId == null || selectedChildId === '') return false
  const canonical = childWorkspaceHref(selectedChildId)
  return pathname === canonical || pathname.startsWith(`${canonical}/`)
}
