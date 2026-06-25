'use client'

import { DEMO_USERS } from '@/lib/admin-command-centre/demo-data'

import { AdminActionButton, AdminTableShell, formatAdminDate } from './admin-action-button'
import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

export function UsersPanel() {
  return (
    <AdminSectionCard
      eyebrow="Users"
      title="User directory"
      description="Operational user list — access status, roles and risk flags. Admin actions are UI-ready; backend wiring pending."
    >
      <AdminTableShell
        headers={[
          'Name',
          'Email',
          'Role',
          'Provider',
          'Home',
          'Status',
          'Last login',
          'Created',
          'Risk',
          'Actions'
        ]}
      >
        {DEMO_USERS.map((user) => (
          <tr key={user.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 font-semibold text-white">{user.name}</td>
            <td className="px-4 py-3 text-slate-400">{user.email}</td>
            <td className="px-4 py-3 text-slate-300">{user.role}</td>
            <td className="px-4 py-3 text-slate-400">{user.provider}</td>
            <td className="px-4 py-3 text-slate-400">{user.home}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={user.status} />
            </td>
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
              <div className="flex flex-wrap gap-1.5">
                <AdminActionButton kind="resend-invite" />
                <AdminActionButton kind="force-password-reset" />
                <AdminActionButton kind="disable-user" />
                <AdminActionButton kind="reactivate-user" />
                <AdminActionButton kind="revoke-sessions" />
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
