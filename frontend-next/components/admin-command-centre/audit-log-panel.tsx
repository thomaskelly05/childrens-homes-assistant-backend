'use client'

import { DEMO_AUDIT_LOG } from '@/lib/admin-command-centre/demo-data'

import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'
import { AdminTableShell, formatAdminDate } from './admin-action-button'

export function AuditLogPanel() {
  return (
    <AdminSectionCard
      eyebrow="Audit log"
      title="Admin audit trail"
      description="Every future admin action should write here. Phase 1 shows placeholder entries — not live audit data."
    >
      <AdminTableShell
        headers={['Actor', 'Action', 'Target type', 'Target', 'Timestamp', 'Risk', 'Reason', 'Status']}
      >
        {DEMO_AUDIT_LOG.map((entry) => (
          <tr key={entry.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 font-semibold text-white">{entry.actor}</td>
            <td className="px-4 py-3 text-slate-300">{entry.action}</td>
            <td className="px-4 py-3 text-slate-500">{entry.targetType}</td>
            <td className="px-4 py-3 text-slate-400">{entry.target}</td>
            <td className="px-4 py-3 text-slate-500">{formatAdminDate(entry.timestamp)}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={entry.riskLevel} />
            </td>
            <td className="px-4 py-3 text-slate-500">{entry.reason}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={entry.status} />
            </td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
