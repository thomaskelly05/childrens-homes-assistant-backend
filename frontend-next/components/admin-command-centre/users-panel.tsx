'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/contexts/auth-context'
import { getAdminDataMode, isAdminDevelopmentMode } from '@/lib/admin-command-centre/admin-data-mode'
import {
  getUnsupportedActionLabel,
  listAdminUsers,
  buildAdminUserActorFromProfile,
  disableAdminUser,
  reactivateAdminUser,
  forcePasswordReset,
  updateUserRole
} from '@/lib/admin-command-centre/users/admin-user-service'
import type { AdminDirectoryUser } from '@/lib/admin-command-centre/users/admin-user-types'
import { UserDetailDrawer } from '@/components/admin-command-centre/user-detail-drawer'

import { AdminActionButton, AdminTableShell, formatAdminDate } from './admin-action-button'
import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

function CapabilityBadges({ user }: { user: AdminDirectoryUser }) {
  const items = [
    user.capabilities.canDisable ? 'disable' : null,
    user.capabilities.canReactivate ? 'reactivate' : null,
    user.capabilities.canForcePasswordReset ? 'reset' : null,
    user.capabilities.canUpdateRole ? 'role' : null
  ].filter(Boolean)

  if (!items.length) {
    return <span className="text-slate-600">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <AdminStatusBadge key={item} status="active">
          {item}
        </AdminStatusBadge>
      ))}
    </div>
  )
}

export function UsersPanel() {
  const { user: actorProfile } = useAuth()
  const actor = useMemo(() => buildAdminUserActorFromProfile(actorProfile), [actorProfile])
  const [users, setUsers] = useState<AdminDirectoryUser[]>([])
  const [source, setSource] = useState<'live' | 'placeholder' | 'empty' | 'error'>('empty')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null
  const dataMode = getAdminDataMode()
  const isPlaceholder = source === 'placeholder'

  const refreshUsers = useCallback(async () => {
    setLoading(true)
    const result = await listAdminUsers(actor)
    setUsers(result.users)
    setSource(result.source)
    setErrorMessage(result.errorMessage)
    setLoading(false)
  }, [actor])

  useEffect(() => {
    void refreshUsers()
  }, [refreshUsers])

  const handleQuickAction = async (
    user: AdminDirectoryUser,
    action: 'disable' | 'reactivate' | 'reset'
  ) => {
    if (action === 'disable') {
      setSelectedUserId(user.id)
      return
    }
    if (action === 'reactivate') {
      const confirmed = window.confirm(`Reactivate ${user.email}?`)
      if (!confirmed) return
      const result = await reactivateAdminUser(user.id, actor, users)
      setActionMessage(result.message)
      if (result.ok) await refreshUsers()
      return
    }
    if (action === 'reset') {
      const confirmed = window.confirm(
        `Force a temporary password reset for ${user.email}? The new password will be shown once.`
      )
      if (!confirmed) return
      const result = await forcePasswordReset(user.id, actor, users)
      if (result.temporaryPassword) {
        window.alert(`Temporary password for ${user.email}:\n\n${result.temporaryPassword}`)
      }
      setActionMessage(result.message)
      if (result.ok) await refreshUsers()
    }
  }

  const description = isPlaceholder
    ? 'Placeholder user directory for development and demo. Actions are limited to wired capabilities.'
    : source === 'live'
      ? 'Live platform user directory from admin APIs. Unsupported actions remain disabled.'
      : 'Operational user list — access status, roles and risk flags.'

  return (
    <>
      <AdminSectionCard
        eyebrow="Users"
        title="User directory"
        description={description}
      >
        {isAdminDevelopmentMode() && isPlaceholder ? (
          <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-100/90">
            Placeholder users — clearly labelled development data, not live accounts.
          </p>
        ) : null}

        {actionMessage ? (
          <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300">
            {actionMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading user directory…</p>
        ) : (
          <AdminTableShell
            headers={[
              'Name',
              'Email',
              'Role',
              'Provider',
              'Home',
              'Status',
              'Auth',
              'Last login',
              'Created',
              'Risk',
              'Capabilities',
              'Actions'
            ]}
            emptyMessage={
              errorMessage ??
              (dataMode === 'live'
                ? 'Real user directory is not connected yet. Placeholder users are hidden in live mode.'
                : 'No users found')
            }
          >
            {users.map((user) => (
              <tr
                key={user.id}
                className="cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setSelectedUserId(user.id)}
              >
                <td className="px-4 py-3 font-semibold text-white">{user.name}</td>
                <td className="px-4 py-3 text-slate-400">{user.email}</td>
                <td className="px-4 py-3 text-slate-300">{user.role}</td>
                <td className="px-4 py-3 text-slate-400">{user.provider}</td>
                <td className="px-4 py-3 text-slate-400">{user.home}</td>
                <td className="px-4 py-3">
                  <AdminStatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{user.authSource}</td>
                <td className="px-4 py-3 text-slate-500">{formatAdminDate(user.lastLogin)}</td>
                <td className="px-4 py-3 text-slate-500">{formatAdminDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  {user.riskFlags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {user.riskFlags.map((flag) => (
                        <AdminStatusBadge key={flag} status="high">
                          {flag}
                        </AdminStatusBadge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CapabilityBadges user={user} />
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton
                      kind="resend-invite"
                      wired={user.capabilities.canResendInvite}
                      disabledReason={getUnsupportedActionLabel()}
                    />
                    <AdminActionButton
                      kind="force-password-reset"
                      wired={user.capabilities.canForcePasswordReset && source === 'live'}
                      disabled={source === 'placeholder'}
                      onClick={() => void handleQuickAction(user, 'reset')}
                    />
                    <AdminActionButton
                      kind="disable-user"
                      wired={user.capabilities.canDisable && source === 'live'}
                      disabled={source === 'placeholder'}
                      onClick={() => void handleQuickAction(user, 'disable')}
                    />
                    <AdminActionButton
                      kind="reactivate-user"
                      wired={user.capabilities.canReactivate && source === 'live'}
                      disabled={source === 'placeholder'}
                      onClick={() => void handleQuickAction(user, 'reactivate')}
                    />
                    <AdminActionButton
                      kind="revoke-sessions"
                      wired={user.capabilities.canRevokeSessions}
                      disabledReason={getUnsupportedActionLabel()}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableShell>
        )}
      </AdminSectionCard>

      <UserDetailDrawer
        user={selectedUser}
        users={users}
        actor={actor}
        source={source}
        onClose={() => setSelectedUserId(null)}
        onRefresh={refreshUsers}
        onMessage={setActionMessage}
      />
    </>
  )
}
