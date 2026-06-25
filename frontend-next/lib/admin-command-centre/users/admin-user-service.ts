import { appendAdminAuditLog } from '../audit/admin-audit-log.ts'
import { getAdminDataMode } from '../admin-data-mode.ts'
import { DEMO_USERS } from '../demo-data.ts'
import type { UserStatus } from '../types.ts'
import {
  fetchAdminHomesFromApi,
  fetchAdminProvidersFromApi,
  fetchAdminUserByIdFromApi,
  fetchAdminUsersFromApi,
  patchAdminUserFromApi,
  resetAdminUserPasswordFromApi,
  AdminUserRepositoryError
} from './admin-user-repository.ts'
import type {
  AdminDirectoryUser,
  AdminHomeOption,
  AdminProviderOption,
  AdminUserActionActor,
  AdminUserActionInput,
  AdminUserActionKind,
  AdminUserActionResult,
  AdminUserCapabilities,
  AdminUserListResult,
  BackendAdminUserRow
} from './admin-user-types.ts'
import { FOUNDER_LEVEL_ROLES, LEGACY_ASSIGNABLE_ROLES } from './admin-user-types.ts'

const NOT_WIRED_LABEL = 'Not wired to current auth provider yet'

type DirectoryContext = {
  homes: AdminHomeOption[]
  providers: AdminProviderOption[]
  actor: AdminUserActionActor | null
  allUsers: BackendAdminUserRow[]
}

export function isFounderLevelRole(role: string): boolean {
  return FOUNDER_LEVEL_ROLES.has(role.trim().toLowerCase())
}

export function isActorFounder(actor: AdminUserActionActor | null): boolean {
  if (!actor) return false
  if (actor.isFounder) return true
  return isFounderLevelRole(actor.role)
}

function mapUserStatus(row: BackendAdminUserRow): UserStatus {
  if (row.archived) return 'deleted'
  if (row.is_active === false) return 'disabled'
  const accountStatus = (row.account_status || '').trim().toLowerCase()
  if (accountStatus === 'invited' || accountStatus === 'pending') return 'invited'
  if (accountStatus === 'suspended') return 'suspended'
  if (accountStatus === 'inactive') return 'disabled'
  if (row.is_active === true) return 'active'
  return 'unknown'
}

function buildRiskFlags(row: BackendAdminUserRow): string[] {
  const flags: string[] = []
  if (row.archived) flags.push('archived')
  if (row.is_active === false) flags.push('inactive')
  if (isFounderLevelRole(row.role || '')) flags.push('founder-level')
  return flags
}

function resolveHomeName(homeId: number | null | undefined, homes: AdminHomeOption[]): string {
  if (!homeId) return '—'
  return homes.find((home) => home.id === homeId)?.name ?? `Home #${homeId}`
}

function resolveProviderName(
  homeId: number | null | undefined,
  providerId: number | null | undefined,
  homes: AdminHomeOption[],
  providers: AdminProviderOption[]
): { name: string; providerId: number | null } {
  const home = homeId ? homes.find((item) => item.id === homeId) : undefined
  const resolvedProviderId = providerId ?? home?.providerId ?? null
  if (resolvedProviderId) {
    const provider = providers.find((item) => item.id === resolvedProviderId)
    return { name: provider?.name ?? `Provider #${resolvedProviderId}`, providerId: resolvedProviderId }
  }
  return { name: '—', providerId: null }
}

export function mapUserCapabilities(
  user: Pick<AdminDirectoryUser, 'status' | 'isSelf' | 'role'>,
  actor: AdminUserActionActor | null
): AdminUserCapabilities {
  const actorIsFounder = isActorFounder(actor)
  const canMutateRole = actorIsFounder || !isFounderLevelRole(user.role)

  return {
    canDisable: user.status === 'active' || user.status === 'invited' || user.status === 'unknown',
    canReactivate: user.status === 'disabled' || user.status === 'suspended' || user.status === 'deleted',
    canForcePasswordReset: user.status !== 'deleted',
    canResendInvite: false,
    canRevokeSessions: false,
    canUpdateRole: canMutateRole,
    canUpdateProviderHome: true
  }
}

export function mapBackendUserToDirectoryUser(
  row: BackendAdminUserRow,
  context: DirectoryContext
): AdminDirectoryUser {
  const firstName = (row.first_name || '').trim()
  const lastName = (row.last_name || '').trim()
  const name = [firstName, lastName].filter(Boolean).join(' ') || row.email
  const homeId = row.home_id ?? null
  const provider = resolveProviderName(homeId, row.provider_id ?? null, context.homes, context.providers)
  const status = mapUserStatus(row)
  const isSelf = context.actor?.id === String(row.id)
  const role = (row.role || 'staff').trim().toLowerCase()

  const base: AdminDirectoryUser = {
    id: String(row.id),
    name,
    email: row.email,
    role,
    status,
    provider: provider.name,
    providerId: provider.providerId,
    home: resolveHomeName(homeId, context.homes),
    homeId,
    lastLogin: null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at ?? null,
    riskFlags: buildRiskFlags(row),
    authSource: 'password',
    capabilities: {
      canDisable: false,
      canReactivate: false,
      canForcePasswordReset: false,
      canResendInvite: false,
      canRevokeSessions: false,
      canUpdateRole: false,
      canUpdateProviderHome: false
    },
    isSelf,
    isFounderLevel: isFounderLevelRole(role)
  }

  base.capabilities = mapUserCapabilities(base, context.actor)
  return base
}

function mapDemoUserToDirectoryUser(
  user: (typeof DEMO_USERS)[number],
  actor: AdminUserActionActor | null
): AdminDirectoryUser {
  const directoryUser: AdminDirectoryUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    provider: user.provider,
    providerId: null,
    home: user.home,
    homeId: null,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: null,
    riskFlags: user.riskFlags,
    authSource: 'placeholder',
    capabilities: {
      canDisable: false,
      canReactivate: false,
      canForcePasswordReset: false,
      canResendInvite: false,
      canRevokeSessions: false,
      canUpdateRole: false,
      canUpdateProviderHome: false
    },
    isSelf: actor?.email === user.email,
    isFounderLevel: isFounderLevelRole(user.role)
  }
  directoryUser.capabilities = mapUserCapabilities(directoryUser, actor)
  return directoryUser
}

export function shouldShowPlaceholderUsers(): boolean {
  const mode = getAdminDataMode()
  return mode === 'development' || mode === 'mixed'
}

export function getUnsupportedActionLabel(): string {
  return NOT_WIRED_LABEL
}

export function actionRequiresReason(kind: AdminUserActionKind): boolean {
  return kind === 'disable' || kind === 'update-role' || kind === 'update-provider-home'
}

export function validateAdminUserAction(
  input: AdminUserActionInput,
  target: AdminDirectoryUser | null,
  actor: AdminUserActionActor | null,
  allUsers: AdminDirectoryUser[]
): AdminUserActionResult | null {
  if (!target) {
    return { ok: false, message: 'User not found', blocked: true }
  }

  if (actionRequiresReason(input.kind) && !(input.reason || '').trim()) {
    return { ok: false, message: 'A reason is required for this action', blocked: true }
  }

  if (input.kind === 'disable' && target.isSelf) {
    return {
      ok: false,
      message: 'You cannot disable your own account from the Admin Command Centre',
      blocked: true
    }
  }

  if (input.kind === 'update-role') {
    const nextRole = (input.newRole || '').trim().toLowerCase()
    if (!LEGACY_ASSIGNABLE_ROLES.includes(nextRole as (typeof LEGACY_ASSIGNABLE_ROLES)[number])) {
      return { ok: false, message: `Role "${nextRole}" is not assignable via the current admin API`, blocked: true }
    }
    if (isFounderLevelRole(nextRole) && !isActorFounder(actor)) {
      return {
        ok: false,
        message: 'Only founders can grant founder-level roles',
        blocked: true
      }
    }
    if (target.isFounderLevel && !isActorFounder(actor)) {
      return {
        ok: false,
        message: 'Only founders can change roles for founder-level accounts',
        blocked: true
      }
    }
    if (target.isFounderLevel && nextRole !== target.role) {
      const remainingFounders = allUsers.filter(
        (user) => user.isFounderLevel && user.id !== target.id && user.status !== 'deleted'
      )
      if (remainingFounders.length === 0) {
        return {
          ok: false,
          message: 'Cannot remove the last founder-level account',
          blocked: true
        }
      }
    }
  }

  const capabilityKey = actionKindToCapability(input.kind)
  if (capabilityKey && !target.capabilities[capabilityKey]) {
    return {
      ok: false,
      message: NOT_WIRED_LABEL,
      blocked: true
    }
  }

  return null
}

function actionKindToCapability(
  kind: AdminUserActionKind
): keyof AdminUserCapabilities | null {
  switch (kind) {
    case 'disable':
      return 'canDisable'
    case 'reactivate':
      return 'canReactivate'
    case 'force-password-reset':
      return 'canForcePasswordReset'
    case 'resend-invite':
      return 'canResendInvite'
    case 'revoke-sessions':
      return 'canRevokeSessions'
    case 'update-role':
      return 'canUpdateRole'
    case 'update-provider-home':
      return 'canUpdateProviderHome'
    default:
      return null
  }
}

function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let value = 'Reset!'
  for (let index = 0; index < 12; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return value
}

async function recordAudit(
  input: AppendAuditInputShape,
  actor: AdminUserActionActor | null
): Promise<void> {
  await appendAdminAuditLog({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: input.action,
    targetType: 'user',
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    riskLevel: input.riskLevel,
    reason: input.reason,
    status: input.status,
    metadata: input.metadata
  })
}

type AppendAuditInputShape = {
  action: string
  targetId: string
  targetLabel: string
  riskLevel: 'low' | 'medium' | 'high'
  reason?: string
  status: 'success' | 'failed' | 'blocked'
  metadata?: Record<string, unknown>
}

export async function listAdminUsers(actor?: AdminUserActionActor | null): Promise<AdminUserListResult> {
  const showPlaceholder = shouldShowPlaceholderUsers()

  if (showPlaceholder) {
    return {
      users: DEMO_USERS.map((user) => mapDemoUserToDirectoryUser(user, actor ?? null)),
      source: 'placeholder'
    }
  }

  try {
    const [users, homes, providers] = await Promise.all([
      fetchAdminUsersFromApi(),
      fetchAdminHomesFromApi(),
      fetchAdminProvidersFromApi()
    ])

    if (!users.length) {
      return {
        users: [],
        source: 'empty',
        errorMessage: 'Real user directory is not connected yet. Placeholder users are hidden in live mode.'
      }
    }

    const context: DirectoryContext = {
      homes,
      providers,
      actor: actor ?? null,
      allUsers: users
    }

    return {
      users: users.map((row) => mapBackendUserToDirectoryUser(row, context)),
      source: 'live'
    }
  } catch (error) {
    const message =
      error instanceof AdminUserRepositoryError
        ? error.message
        : 'Real user directory is not connected yet. Placeholder users are hidden in live mode.'
    return {
      users: [],
      source: 'error',
      errorMessage: message
    }
  }
}

export async function getAdminUserById(
  userId: string,
  actor?: AdminUserActionActor | null
): Promise<AdminDirectoryUser | null> {
  const list = await listAdminUsers(actor)
  return list.users.find((user) => user.id === userId) ?? null
}

export async function disableAdminUser(
  userId: string,
  reason: string,
  actor: AdminUserActionActor | null,
  allUsers: AdminDirectoryUser[]
): Promise<AdminUserActionResult> {
  const input: AdminUserActionInput = { userId, kind: 'disable', reason }
  const target = allUsers.find((user) => user.id === userId) ?? null
  const blocked = validateAdminUserAction(input, target, actor, allUsers)
  if (blocked) {
    await recordAudit(
      {
        action: 'disable_user',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'high',
        reason,
        status: 'blocked',
        metadata: { message: blocked.message }
      },
      actor
    )
    return blocked
  }

  try {
    await patchAdminUserFromApi(userId, { is_active: false })
    await recordAudit(
      {
        action: 'disable_user',
        targetId: userId,
        targetLabel: target!.email,
        riskLevel: 'high',
        reason,
        status: 'success'
      },
      actor
    )
    return { ok: true, message: 'User disabled' }
  } catch (error) {
    const message = error instanceof AdminUserRepositoryError ? error.message : 'Failed to disable user'
    await recordAudit(
      {
        action: 'disable_user',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'high',
        reason,
        status: 'failed',
        metadata: { message }
      },
      actor
    )
    return { ok: false, message }
  }
}

export async function reactivateAdminUser(
  userId: string,
  actor: AdminUserActionActor | null,
  allUsers: AdminDirectoryUser[]
): Promise<AdminUserActionResult> {
  const input: AdminUserActionInput = { userId, kind: 'reactivate' }
  const target = allUsers.find((user) => user.id === userId) ?? null
  const blocked = validateAdminUserAction(input, target, actor, allUsers)
  if (blocked) {
    await recordAudit(
      {
        action: 'reactivate_user',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'medium',
        status: 'blocked',
        metadata: { message: blocked.message }
      },
      actor
    )
    return blocked
  }

  try {
    await patchAdminUserFromApi(userId, { is_active: true, archived: false })
    await recordAudit(
      {
        action: 'reactivate_user',
        targetId: userId,
        targetLabel: target!.email,
        riskLevel: 'medium',
        status: 'success'
      },
      actor
    )
    return { ok: true, message: 'User reactivated' }
  } catch (error) {
    const message = error instanceof AdminUserRepositoryError ? error.message : 'Failed to reactivate user'
    await recordAudit(
      {
        action: 'reactivate_user',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'medium',
        status: 'failed',
        metadata: { message }
      },
      actor
    )
    return { ok: false, message }
  }
}

export async function forcePasswordReset(
  userId: string,
  actor: AdminUserActionActor | null,
  allUsers: AdminDirectoryUser[]
): Promise<AdminUserActionResult & { temporaryPassword?: string }> {
  const input: AdminUserActionInput = { userId, kind: 'force-password-reset' }
  const target = allUsers.find((user) => user.id === userId) ?? null
  const blocked = validateAdminUserAction(input, target, actor, allUsers)
  if (blocked) {
    await recordAudit(
      {
        action: 'force_password_reset',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'high',
        status: 'blocked',
        metadata: { message: blocked.message }
      },
      actor
    )
    return blocked
  }

  const temporaryPassword = generateTemporaryPassword()

  try {
    await resetAdminUserPasswordFromApi(userId, temporaryPassword)
    await recordAudit(
      {
        action: 'force_password_reset',
        targetId: userId,
        targetLabel: target!.email,
        riskLevel: 'high',
        status: 'success',
        metadata: { delivery: 'admin-set-temporary-password' }
      },
      actor
    )
    return { ok: true, message: 'Temporary password set', temporaryPassword }
  } catch (error) {
    const message = error instanceof AdminUserRepositoryError ? error.message : 'Failed to reset password'
    await recordAudit(
      {
        action: 'force_password_reset',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'high',
        status: 'failed',
        metadata: { message }
      },
      actor
    )
    return { ok: false, message }
  }
}

export async function resendInvite(): Promise<AdminUserActionResult> {
  return { ok: false, message: NOT_WIRED_LABEL, blocked: true }
}

export async function revokeUserSessions(): Promise<AdminUserActionResult> {
  return { ok: false, message: NOT_WIRED_LABEL, blocked: true }
}

export async function updateUserRole(
  userId: string,
  newRole: string,
  reason: string,
  actor: AdminUserActionActor | null,
  allUsers: AdminDirectoryUser[]
): Promise<AdminUserActionResult> {
  const input: AdminUserActionInput = { userId, kind: 'update-role', newRole, reason }
  const target = allUsers.find((user) => user.id === userId) ?? null
  const blocked = validateAdminUserAction(input, target, actor, allUsers)
  if (blocked) {
    await recordAudit(
      {
        action: 'update_role',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'high',
        reason,
        status: 'blocked',
        metadata: { message: blocked.message, new_role: newRole }
      },
      actor
    )
    return blocked
  }

  try {
    await patchAdminUserFromApi(userId, { role: newRole.trim().toLowerCase() })
    await recordAudit(
      {
        action: 'update_role',
        targetId: userId,
        targetLabel: target!.email,
        riskLevel: 'high',
        reason,
        status: 'success',
        metadata: { new_role: newRole }
      },
      actor
    )
    return { ok: true, message: `Role updated to ${newRole}` }
  } catch (error) {
    const message = error instanceof AdminUserRepositoryError ? error.message : 'Failed to update role'
    await recordAudit(
      {
        action: 'update_role',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'high',
        reason,
        status: 'failed',
        metadata: { message, new_role: newRole }
      },
      actor
    )
    return { ok: false, message }
  }
}

export async function updateUserProviderHome(
  userId: string,
  newHomeId: number | null,
  reason: string,
  actor: AdminUserActionActor | null,
  allUsers: AdminDirectoryUser[]
): Promise<AdminUserActionResult> {
  const input: AdminUserActionInput = { userId, kind: 'update-provider-home', newHomeId, reason }
  const target = allUsers.find((user) => user.id === userId) ?? null
  const blocked = validateAdminUserAction(input, target, actor, allUsers)
  if (blocked) {
    await recordAudit(
      {
        action: 'update_provider_home',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'medium',
        reason,
        status: 'blocked',
        metadata: { message: blocked.message, new_home_id: newHomeId }
      },
      actor
    )
    return blocked
  }

  try {
    await patchAdminUserFromApi(userId, { home_id: newHomeId })
    await recordAudit(
      {
        action: 'update_provider_home',
        targetId: userId,
        targetLabel: target!.email,
        riskLevel: 'medium',
        reason,
        status: 'success',
        metadata: { new_home_id: newHomeId }
      },
      actor
    )
    return { ok: true, message: 'Home assignment updated' }
  } catch (error) {
    const message =
      error instanceof AdminUserRepositoryError ? error.message : 'Failed to update home assignment'
    await recordAudit(
      {
        action: 'update_provider_home',
        targetId: userId,
        targetLabel: target?.email ?? userId,
        riskLevel: 'medium',
        reason,
        status: 'failed',
        metadata: { message, new_home_id: newHomeId }
      },
      actor
    )
    return { ok: false, message }
  }
}

export function buildAdminUserActorFromProfile(profile: {
  id?: number | string | null
  email?: string | null
  role?: string | null
  isFounder?: boolean | null
} | null): AdminUserActionActor | null {
  if (!profile?.id || !profile.email) return null
  return {
    id: String(profile.id),
    email: profile.email,
    role: profile.role || '',
    isFounder: profile.isFounder === true || isFounderLevelRole(profile.role || '')
  }
}

export async function refreshAdminUserFromApi(
  userId: string,
  actor: AdminUserActionActor | null
): Promise<AdminDirectoryUser | null> {
  if (shouldShowPlaceholderUsers()) {
    return getAdminUserById(userId, actor)
  }
  try {
    const [row, homes, providers, allUsers] = await Promise.all([
      fetchAdminUserByIdFromApi(userId),
      fetchAdminHomesFromApi(),
      fetchAdminProvidersFromApi(),
      fetchAdminUsersFromApi()
    ])
    if (!row) return null
    return mapBackendUserToDirectoryUser(row, {
      homes,
      providers,
      actor,
      allUsers
    })
  } catch {
    return null
  }
}