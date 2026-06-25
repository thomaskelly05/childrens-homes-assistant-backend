'use client'

import { DEMO_SUPPORT_TICKETS } from '@/lib/admin-command-centre/demo-data'

import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'
import { AdminTableShell, formatAdminDate } from './admin-action-button'

const TICKET_TYPE_LABELS: Record<string, string> = {
  'password-reset': 'Password reset request',
  'locked-account': 'Locked account',
  'invite-issue': 'Invite issue',
  'onboarding-help': 'Onboarding help',
  'bug-report': 'Bug report',
  escalation: 'Escalation request'
}

export function SupportPanel() {
  return (
    <AdminSectionCard
      eyebrow="Support"
      title="Support & admin actions"
      description="Pending support requests requiring founder/admin attention."
    >
      <AdminTableShell
        headers={['Type', 'Subject', 'Requester', 'Provider', 'Status', 'Priority', 'Created']}
      >
        {DEMO_SUPPORT_TICKETS.map((ticket) => (
          <tr key={ticket.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 text-slate-300">{TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}</td>
            <td className="px-4 py-3 text-white">{ticket.subject}</td>
            <td className="px-4 py-3 text-slate-400">{ticket.requester}</td>
            <td className="px-4 py-3 text-slate-400">{ticket.provider}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={ticket.status} />
            </td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={ticket.priority} />
            </td>
            <td className="px-4 py-3 text-slate-500">{formatAdminDate(ticket.createdAt)}</td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
