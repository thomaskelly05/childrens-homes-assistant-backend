import type { UserStatus } from '../types'

/** Roles that require founder-level authority to grant or revoke. */
export const FOUNDER_LEVEL_ROLES = new Set([
  'founder',
  'owner',
  'super_admin',
  'superadmin'
])

/** Roles accepted by the legacy admin user PATCH endpoint. */
export const LEGACY_ASSIGNABLE_ROLES = ['admin', 'provider_admin', 'manager', 'staff'] as const

export type AdminUserCapabilities = {
  canDisable: boolean
  canReactivate: boolean
  canForcePasswordReset: boolean
  canResendInvite: boolean
  canRevokeSessions: boolean
  canUpdateRole: boolean
  canUpdateProviderHome: boolean
}

export type AdminDirectoryUser = {
  id: string
  name: string
  email: string
  role: string
  status: UserStatus
  provider: string
  providerId: number | null
  home: string
  homeId: number | null
  lastLogin: string | null
  createdAt: string
  updatedAt: string | null
  riskFlags: string[]
  authSource: string
  capabilities: AdminUserCapabilities
  isSelf: boolean
  isFounderLevel: boolean
}

export type AdminUserListResult = {
  users: AdminDirectoryUser[]
  source: 'live' | 'placeholder' | 'empty' | 'error'
  errorMessage?: string
}

export type AdminUserActionActor = {
  id: string
  email: string
  role: string
  isFounder: boolean
}

export type AdminUserActionKind =
  | 'disable'
  | 'reactivate'
  | 'force-password-reset'
  | 'resend-invite'
  | 'revoke-sessions'
  | 'update-role'
  | 'update-provider-home'

export type AdminUserActionInput = {
  userId: string
  kind: AdminUserActionKind
  reason?: string
  newRole?: string
  newHomeId?: number | null
  temporaryPassword?: string
}

export type AdminUserActionResult = {
  ok: boolean
  message: string
  blocked?: boolean
}

export type AdminHomeOption = {
  id: number
  name: string
  providerId: number | null
}

export type AdminProviderOption = {
  id: number
  name: string
}

/** Backend shapes from /admin/users/legacy and related endpoints. */
export type BackendAdminUserRow = {
  id: number
  first_name?: string | null
  last_name?: string | null
  email: string
  role: string
  home_id?: number | null
  provider_id?: number | null
  is_active?: boolean | null
  archived?: boolean | null
  account_status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type BackendAdminHomeRow = {
  id: number
  name: string
  provider_id?: number | null
}

export type BackendAdminProviderRow = {
  id: number
  name: string
}
