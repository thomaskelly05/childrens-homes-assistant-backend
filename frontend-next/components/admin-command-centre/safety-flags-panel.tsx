'use client'

import { DEMO_SAFETY_FLAGS } from '@/lib/admin-command-centre/demo-data'

import { AdminActionButton, AdminTableShell, formatAdminDate } from './admin-action-button'
import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

const FLAG_TYPE_LABELS: Record<string, string> = {
  'fabricated-record-request': 'Suspected fabricated record request',
  'hide-incident-request': 'Request to hide/minimise incident',
  'unsafe-safeguarding-wording': 'Unsafe safeguarding wording',
  'abusive-prompt': 'Abusive/inappropriate prompt',
  'repeated-high-risk': 'Repeated high-risk use',
  'content-policy-trigger': 'Content policy trigger'
}

export function SafetyFlagsPanel() {
  return (
    <AdminSectionCard
      eyebrow="Safety flags"
      title="Safeguarding & misuse signals"
      description="Operational safeguarding support signals for admin review — not automated decisions. No care record content is displayed."
    >
      <AdminTableShell
        headers={['Type', 'Status', 'Severity', 'User', 'Provider', 'Home', 'Created', 'Summary', 'Actions']}
      >
        {DEMO_SAFETY_FLAGS.map((flag) => (
          <tr key={flag.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 text-slate-300">{FLAG_TYPE_LABELS[flag.type] ?? flag.type}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={flag.status} />
            </td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={flag.severity} />
            </td>
            <td className="px-4 py-3 text-white">{flag.user}</td>
            <td className="px-4 py-3 text-slate-400">{flag.provider}</td>
            <td className="px-4 py-3 text-slate-400">{flag.home}</td>
            <td className="px-4 py-3 text-slate-500">{formatAdminDate(flag.createdAt)}</td>
            <td className="max-w-xs px-4 py-3 text-xs text-slate-500">{flag.summary}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <AdminActionButton kind="review-flag" />
                <AdminActionButton kind="resolve-flag" />
                <AdminActionButton kind="escalate-flag" />
                <AdminActionButton kind="suspend-user" />
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
