import type { StaffRole, StaffUser } from './types'

export const roleLabels: Record<StaffRole, string> = {
  admin: 'Administrator',
  responsible_individual: 'Responsible individual',
  provider: 'Provider',
  manager: 'Registered manager',
  deputy_manager: 'Deputy manager',
  support_worker: 'Support worker',
  viewer: 'Viewer'
}

export const permissionsByRole: Record<StaffRole, string[]> = {
  admin: [
    'assistant:access',
    'assistant:quality',
    'assistant:send_reports',
    'audit:read',
    'billing:manage',
    'records:read',
    'records:write',
    'reports:read',
    'reports:write',
    'staff:read',
    'staff:manage',
    'settings:manage',
    'users:manage'
  ],
  responsible_individual: [
    'assistant:access',
    'assistant:quality',
    'assistant:send_reports',
    'audit:read',
    'records:read',
    'reports:read',
    'reports:write',
    'staff:read',
    'settings:read'
  ],
  provider: [
    'assistant:access',
    'assistant:quality',
    'audit:read',
    'records:read',
    'reports:read',
    'staff:read',
    'settings:read'
  ],
  manager: [
    'assistant:access',
    'assistant:quality',
    'assistant:send_reports',
    'audit:read',
    'records:read',
    'records:write',
    'reports:read',
    'reports:write',
    'staff:read',
    'staff:manage',
    'settings:read'
  ],
  deputy_manager: [
    'assistant:access',
    'assistant:quality',
    'audit:read',
    'records:read',
    'records:write',
    'reports:read',
    'reports:write',
    'staff:read',
    'settings:read'
  ],
  support_worker: [
    'assistant:access',
    'records:read',
    'records:write',
    'reports:read',
    'staff:read'
  ],
  viewer: ['records:read', 'reports:read', 'staff:read']
}

const roleAliases: Record<string, StaffRole> = {
  administrator: 'admin',
  provider_admin: 'provider',
  ri: 'responsible_individual',
  owner: 'admin',
  super_admin: 'admin',
  superadmin: 'admin',
  registered_manager: 'manager',
  regional_manager: 'manager',
  deputy: 'deputy_manager',
  staff: 'support_worker',
  senior: 'support_worker',
  rsw: 'support_worker',
  residential_support_worker: 'support_worker',
  support: 'support_worker',
  read_only: 'viewer',
  readonly: 'viewer'
}

export function normaliseRole(role?: string | null): StaffRole {
  const cleaned = (role || '').trim().toLowerCase()
  if (cleaned in permissionsByRole) return cleaned as StaffRole
  return roleAliases[cleaned] || 'viewer'
}

export function permissionsForRole(role?: string | null) {
  return permissionsByRole[normaliseRole(role)]
}

export function userHasPermission(user: StaffUser | null | undefined, permission: string) {
  if (!user) return false
  return (user.permissions?.length ? user.permissions : permissionsForRole(user.role)).includes(permission)
}

export function userHasAnyPermission(user: StaffUser | null | undefined, permissions: string[]) {
  return permissions.length === 0 || permissions.some((permission) => userHasPermission(user, permission))
}

export function displayName(user: StaffUser | null | undefined) {
  if (!user) return 'Signed out'
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || user.email
}
