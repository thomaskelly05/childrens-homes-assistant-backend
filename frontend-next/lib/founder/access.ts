/** Roles permitted to access the founder command centre. */
export const FOUNDER_ALLOWED_ROLES = new Set([
  'founder',
  'owner',
  'super_admin',
  'superadmin',
  'admin',
  'administrator'
])

export type FounderAccessProfile = {
  role?: string | null
  roles?: string[] | null
  permissions?: string[] | null
  is_admin?: boolean | null
  isFounder?: boolean | null
}

export function isFounderDashboardRoute(pathname: string | null | undefined) {
  if (!pathname) return false
  return pathname === '/founder' || pathname.startsWith('/founder/')
}

export function userHasFounderAccess(role?: string | null) {
  const normalised = (role || '').trim().toLowerCase()
  return FOUNDER_ALLOWED_ROLES.has(normalised)
}

/** Accept role, roles[], permissions, is_admin and isFounder from /auth/me payloads. */
export function userHasFounderAccessFromProfile(profile?: FounderAccessProfile | null): boolean {
  if (!profile) return false
  if (profile.isFounder === true || profile.is_admin === true) return true
  if (userHasFounderAccess(profile.role)) return true
  if (Array.isArray(profile.roles) && profile.roles.some((role) => userHasFounderAccess(role))) {
    return true
  }
  if (Array.isArray(profile.permissions) && profile.permissions.includes('settings:manage')) {
    return true
  }
  return false
}
