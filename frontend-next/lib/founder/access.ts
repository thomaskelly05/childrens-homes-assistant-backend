/** Roles permitted to access the founder command centre. */
export const FOUNDER_ALLOWED_ROLES = new Set([
  'founder',
  'owner',
  'super_admin',
  'superadmin',
  'admin',
  'administrator'
])

export function isFounderDashboardRoute(pathname: string | null | undefined) {
  if (!pathname) return false
  return pathname === '/founder' || pathname.startsWith('/founder/')
}

export function userHasFounderAccess(role?: string | null) {
  const normalised = (role || '').trim().toLowerCase()
  return FOUNDER_ALLOWED_ROLES.has(normalised)
}
