import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import {
  appendAdminAuditLogMemory,
  filterAdminAuditLog,
  getAdminAuditLogMemorySnapshot,
  resetAdminAuditLogMemory
} from '../audit/admin-audit-log.ts'
import { getAdminAction } from '../admin-actions.ts'
import { getAdminDataMode, isAdminDevelopmentMode } from '../admin-data-mode.ts'
import { userHasAdminCommandCentreAccessFromProfile } from '../../founder/access.ts'
import {
  actionRequiresReason,
  buildAdminUserActorFromProfile,
  disableAdminUser,
  isActorFounder,
  isFounderLevelRole,
  listAdminUsers,
  mapUserCapabilities,
  shouldShowPlaceholderUsers,
  validateAdminUserAction
} from './admin-user-service.ts'
import type { AdminDirectoryUser } from './admin-user-types.ts'

const ORIGINAL_MODE = process.env.ADMIN_COMMAND_CENTRE_DATA_MODE
const ORIGINAL_PUBLIC_MODE = process.env.NEXT_PUBLIC_ADMIN_COMMAND_CENTRE_DATA_MODE

function setAdminDataMode(mode?: string) {
  if (mode === undefined) {
    delete process.env.ADMIN_COMMAND_CENTRE_DATA_MODE
    delete process.env.NEXT_PUBLIC_ADMIN_COMMAND_CENTRE_DATA_MODE
    return
  }
  process.env.ADMIN_COMMAND_CENTRE_DATA_MODE = mode
  process.env.NEXT_PUBLIC_ADMIN_COMMAND_CENTRE_DATA_MODE = mode
}

function sampleUser(overrides: Partial<AdminDirectoryUser> = {}): AdminDirectoryUser {
  return {
    id: '42',
    name: 'Test User',
    email: 'test@example.com',
    role: 'staff',
    status: 'active',
    provider: 'Provider A',
    providerId: 1,
    home: 'Home A',
    homeId: 10,
    lastLogin: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    riskFlags: [],
    authSource: 'password',
    capabilities: {
      canDisable: true,
      canReactivate: false,
      canForcePasswordReset: true,
      canResendInvite: false,
      canRevokeSessions: false,
      canUpdateRole: true,
      canUpdateProviderHome: true
    },
    isSelf: false,
    isFounderLevel: false,
    ...overrides
  }
}

afterEach(() => {
  setAdminDataMode(ORIGINAL_MODE)
  if (ORIGINAL_PUBLIC_MODE === undefined) {
    delete process.env.NEXT_PUBLIC_ADMIN_COMMAND_CENTRE_DATA_MODE
  } else {
    process.env.NEXT_PUBLIC_ADMIN_COMMAND_CENTRE_DATA_MODE = ORIGINAL_PUBLIC_MODE
  }
  resetAdminAuditLogMemory()
})

describe('Admin user service', () => {
  it('maps user access capabilities with unsupported actions disabled', () => {
    const actor = buildAdminUserActorFromProfile({ id: 1, email: 'admin@indicare.co.uk', role: 'admin' })
    const capabilities = mapUserCapabilities(sampleUser(), actor)
    assert.equal(capabilities.canResendInvite, false)
    assert.equal(capabilities.canRevokeSessions, false)
    assert.equal(capabilities.canDisable, true)
    assert.equal(capabilities.canForcePasswordReset, true)
  })

  it('hides placeholder users in live mode', async () => {
    setAdminDataMode('live')
    assert.equal(shouldShowPlaceholderUsers(), false)
    const result = await listAdminUsers(
      buildAdminUserActorFromProfile({ id: 1, email: 'admin@indicare.co.uk', role: 'admin' })
    )
    assert.notEqual(result.source, 'placeholder')
    assert.equal(result.users.every((user) => user.authSource !== 'placeholder'), true)
  })

  it('shows placeholder users in development mode', async () => {
    setAdminDataMode('development')
    assert.equal(shouldShowPlaceholderUsers(), true)
    const result = await listAdminUsers()
    assert.equal(result.source, 'placeholder')
    assert.ok(result.users.length > 0)
    assert.equal(result.users[0]?.authSource, 'placeholder')
  })

  it('marks unsupported global actions as not wired', () => {
    assert.equal(getAdminAction('resend-invite').wired, false)
    assert.equal(getAdminAction('revoke-sessions').wired, false)
    assert.match(getAdminAction('resend-invite').description ?? '', /not wired/i)
    assert.equal(getAdminAction('disable-user').wired, true)
  })

  it('requires a reason to disable a user', () => {
    const target = sampleUser()
    const actor = buildAdminUserActorFromProfile({ id: 1, email: 'admin@indicare.co.uk', role: 'admin' })
    const blocked = validateAdminUserAction(
      { userId: target.id, kind: 'disable' },
      target,
      actor,
      [target]
    )
    assert.ok(blocked)
    assert.match(blocked?.message ?? '', /reason/i)
  })

  it('requires founder authority for founder role elevation', () => {
    const target = sampleUser({ role: 'staff' })
    const adminActor = buildAdminUserActorFromProfile({ id: 1, email: 'admin@indicare.co.uk', role: 'admin' })
    const blocked = validateAdminUserAction(
      { userId: target.id, kind: 'update-role', newRole: 'founder', reason: 'promotion' },
      target,
      adminActor,
      [target]
    )
    assert.ok(blocked)
    assert.match(blocked?.message ?? '', /founder/i)
    assert.equal(isActorFounder(adminActor), false)
    assert.equal(isFounderLevelRole('founder'), true)
  })

  it('creates audit log entry on successful client-side admin action', async () => {
    resetAdminAuditLogMemory()
    setAdminDataMode('development')
    const entry = appendAdminAuditLogMemory({
      actorEmail: 'admin@indicare.co.uk',
      action: 'disable_user',
      targetType: 'user',
      targetId: '42',
      targetLabel: 'test@example.com',
      reason: 'policy breach',
      status: 'success',
      riskLevel: 'high'
    })
    assert.equal(entry.status, 'success')
    assert.equal(getAdminAuditLogMemorySnapshot().length, 1)
  })

  it('records failed audit event when disable is blocked for self-disable', async () => {
    resetAdminAuditLogMemory()
    setAdminDataMode('development')
    const actor = buildAdminUserActorFromProfile({ id: 42, email: 'self@example.com', role: 'admin' })
    const users = [sampleUser({ id: '42', email: 'self@example.com', isSelf: true })]
    const result = await disableAdminUser('42', 'testing', actor, users)
    assert.equal(result.ok, false)
    assert.equal(result.blocked, true)
    const audit = getAdminAuditLogMemorySnapshot()
    assert.equal(audit[0]?.status, 'blocked')
    assert.equal(audit[0]?.action, 'disable_user')
  })

  it('denies normal ORB users admin access', () => {
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'support_worker' }), false)
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'manager' }), false)
    assert.equal(userHasAdminCommandCentreAccessFromProfile({ role: 'admin' }), true)
  })

  it('requires reason for role and home changes', () => {
    assert.equal(actionRequiresReason('disable'), true)
    assert.equal(actionRequiresReason('update-role'), true)
    assert.equal(actionRequiresReason('update-provider-home'), true)
    assert.equal(actionRequiresReason('reactivate'), false)
  })

  it('filters audit log categories', () => {
    const entries = [
      {
        id: '1',
        actorId: null,
        actorEmail: 'admin@indicare.co.uk',
        action: 'disable_user',
        targetType: 'user' as const,
        targetId: '1',
        targetLabel: 'a@example.com',
        riskLevel: 'high' as const,
        reason: 'test',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'success' as const
      },
      {
        id: '2',
        actorId: null,
        actorEmail: 'admin@indicare.co.uk',
        action: 'update_provider',
        targetType: 'provider' as const,
        targetId: '9',
        targetLabel: 'Provider',
        riskLevel: 'low' as const,
        reason: '',
        timestamp: '2026-01-01T00:00:00Z',
        status: 'failed' as const
      }
    ]
    assert.equal(filterAdminAuditLog(entries, 'user-actions').length, 1)
    assert.equal(filterAdminAuditLog(entries, 'failed-actions').length, 1)
    assert.equal(filterAdminAuditLog(entries, 'provider-actions').length, 1)
  })

  it('defaults to development data mode when unset', () => {
    setAdminDataMode(undefined)
    assert.equal(getAdminDataMode(), 'development')
    assert.equal(isAdminDevelopmentMode(), true)
  })
})
