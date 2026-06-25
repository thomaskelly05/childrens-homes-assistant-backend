'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import {
  disableAdminUser,
  forcePasswordReset,
  getUnsupportedActionLabel,
  reactivateAdminUser,
  updateUserProviderHome,
  updateUserRole
} from '@/lib/admin-command-centre/users/admin-user-service'
import {
  LEGACY_ASSIGNABLE_ROLES,
  type AdminDirectoryUser,
  type AdminUserActionActor
} from '@/lib/admin-command-centre/users/admin-user-types'
import { fetchAdminHomesFromApi } from '@/lib/admin-command-centre/users/admin-user-repository'
import type { AdminHomeOption } from '@/lib/admin-command-centre/users/admin-user-types'

import { AdminActionButton, formatAdminDate } from './admin-action-button'
import { AdminStatusBadge } from './admin-status-badge'

type ConfirmState =
  | { kind: 'disable'; reason: string }
  | { kind: 'role'; reason: string; newRole: string }
  | { kind: 'home'; reason: string; newHomeId: number | null }
  | null

export function UserDetailDrawer({
  user,
  users,
  actor,
  source,
  onClose,
  onRefresh,
  onMessage
}: {
  user: AdminDirectoryUser | null
  users: AdminDirectoryUser[]
  actor: AdminUserActionActor | null
  source: 'live' | 'placeholder' | 'empty' | 'error'
  onClose: () => void
  onRefresh: () => Promise<void>
  onMessage: (message: string | null) => void
}) {
  const [homes, setHomes] = useState<AdminHomeOption[]>([])
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [newRole, setNewRole] = useState('')
  const [newHomeId, setNewHomeId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    setNewRole(user.role)
    setNewHomeId(user.homeId != null ? String(user.homeId) : '')
    setConfirm(null)
  }, [user])

  useEffect(() => {
    if (!user || source !== 'live') return
    void fetchAdminHomesFromApi().then(setHomes)
  }, [user, source])

  if (!user) return null

  const liveActionsEnabled = source === 'live'

  const runConfirmedAction = async () => {
    if (!confirm || !user) return
    setBusy(true)
    try {
      if (confirm.kind === 'disable') {
        const result = await disableAdminUser(user.id, confirm.reason, actor, users)
        onMessage(result.message)
        if (result.ok) {
          await onRefresh()
          onClose()
        }
      }
      if (confirm.kind === 'role') {
        const result = await updateUserRole(user.id, confirm.newRole, confirm.reason, actor, users)
        onMessage(result.message)
        if (result.ok) await onRefresh()
      }
      if (confirm.kind === 'home') {
        const result = await updateUserProviderHome(
          user.id,
          confirm.newHomeId,
          confirm.reason,
          actor,
          users
        )
        onMessage(result.message)
        if (result.ok) await onRefresh()
      }
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const handleForceReset = async () => {
    const confirmed = window.confirm(
      `Force a temporary password reset for ${user.email}? The new password will be shown once.`
    )
    if (!confirmed) return
    setBusy(true)
    try {
      const result = await forcePasswordReset(user.id, actor, users)
      if (result.temporaryPassword) {
        window.alert(`Temporary password for ${user.email}:\n\n${result.temporaryPassword}`)
      }
      onMessage(result.message)
      if (result.ok) await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  const handleReactivate = async () => {
    const confirmed = window.confirm(`Reactivate ${user.email}?`)
    if (!confirmed) return
    setBusy(true)
    try {
      const result = await reactivateAdminUser(user.id, actor, users)
      onMessage(result.message)
      if (result.ok) await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#070b14] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        data-testid="admin-user-detail-drawer"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300/80">User detail</p>
            <h2 className="mt-1 text-2xl font-black text-white">{user.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white"
            aria-label="Close user detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <DetailBlock title="Identity">
            <DetailRow label="User ID" value={user.id} />
            <DetailRow label="Role" value={user.role} />
            <DetailRow label="Auth source" value={user.authSource} />
            <DetailRow label="Status">
              <AdminStatusBadge status={user.status} />
            </DetailRow>
          </DetailBlock>

          <DetailBlock title="Provider / home">
            <DetailRow label="Provider" value={user.provider} />
            <DetailRow label="Home" value={user.home} />
          </DetailBlock>

          <DetailBlock title="Account">
            <DetailRow label="Created" value={formatAdminDate(user.createdAt)} />
            <DetailRow label="Last login" value={formatAdminDate(user.lastLogin)} />
            <DetailRow label="Risk flags" value={user.riskFlags.length ? user.riskFlags.join(', ') : '—'} />
          </DetailBlock>

          <DetailBlock title="Access history">
            <p className="text-sm text-slate-500">Not wired yet — session history is not exposed in admin APIs.</p>
          </DetailBlock>

          <DetailBlock title="Recent admin actions">
            <p className="text-sm text-slate-500">See Audit log panel for platform admin events affecting this user.</p>
          </DetailBlock>

          <DetailBlock title="Usage summary">
            <p className="text-sm text-slate-500">Placeholder — ORB usage metrics are not wired to user detail yet.</p>
          </DetailBlock>

          <DetailBlock title="Available actions">
            <div className="flex flex-wrap gap-2">
              <AdminActionButton
                kind="resend-invite"
                wired={user.capabilities.canResendInvite}
                disabledReason={getUnsupportedActionLabel()}
              />
              <AdminActionButton
                kind="force-password-reset"
                wired={user.capabilities.canForcePasswordReset && liveActionsEnabled}
                disabled={!liveActionsEnabled || busy}
                onClick={() => void handleForceReset()}
              />
              <AdminActionButton
                kind="disable-user"
                wired={user.capabilities.canDisable && liveActionsEnabled}
                disabled={!liveActionsEnabled || busy}
                onClick={() => setConfirm({ kind: 'disable', reason: '' })}
              />
              <AdminActionButton
                kind="reactivate-user"
                wired={user.capabilities.canReactivate && liveActionsEnabled}
                disabled={!liveActionsEnabled || busy}
                onClick={() => void handleReactivate()}
              />
              <AdminActionButton
                kind="revoke-sessions"
                wired={user.capabilities.canRevokeSessions}
                disabledReason={getUnsupportedActionLabel()}
              />
            </div>

            {liveActionsEnabled && user.capabilities.canUpdateRole ? (
              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Change role
                </label>
                <select
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0b101c] px-3 py-2 text-sm text-slate-200"
                >
                  {LEGACY_ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || newRole === user.role}
                  onClick={() => setConfirm({ kind: 'role', reason: '', newRole })}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-40"
                >
                  Update role
                </button>
              </div>
            ) : null}

            {liveActionsEnabled && user.capabilities.canUpdateProviderHome ? (
              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Move home assignment
                </label>
                <select
                  value={newHomeId}
                  onChange={(event) => setNewHomeId(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0b101c] px-3 py-2 text-sm text-slate-200"
                >
                  <option value="">No home</option>
                  {homes.map((home) => (
                    <option key={home.id} value={String(home.id)}>
                      {home.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || String(user.homeId ?? '') === newHomeId}
                  onClick={() =>
                    setConfirm({
                      kind: 'home',
                      reason: '',
                      newHomeId: newHomeId ? Number(newHomeId) : null
                    })
                  }
                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-40"
                >
                  Update home
                </button>
              </div>
            ) : null}
          </DetailBlock>
        </div>

        {confirm ? (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
            <p className="text-sm font-semibold text-rose-100">Confirm admin action</p>
            <p className="mt-1 text-xs text-slate-400">
              {confirm.kind === 'disable'
                ? 'Disabling a user blocks platform access. A reason is required.'
                : confirm.kind === 'role'
                  ? 'Role changes are audited. A reason is required for elevation or access changes.'
                  : 'Home assignment changes are audited. A reason is required.'}
            </p>
            <textarea
              value={confirm.reason}
              onChange={(event) => setConfirm({ ...confirm, reason: event.target.value })}
              placeholder="Reason for this action"
              className="mt-3 w-full rounded-lg border border-white/10 bg-[#0b101c] px-3 py-2 text-sm text-slate-200"
              rows={3}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runConfirmedAction()}
                className="rounded-lg bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-100"
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

function DetailRow({
  label,
  value,
  children
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{children ?? value}</span>
    </div>
  )
}
