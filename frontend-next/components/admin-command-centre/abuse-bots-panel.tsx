'use client'

import { DEMO_ABUSE_INDICATORS } from '@/lib/admin-command-centre/demo-data'

import { AdminActionButton, AdminTableShell, formatAdminDate } from './admin-action-button'
import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

const INDICATOR_LABELS: Record<string, string> = {
  'failed-login-spike': 'Failed login spike',
  'rate-limit-warning': 'Rate-limit warning',
  'suspicious-signup': 'Suspicious signup pattern',
  'password-reset-abuse': 'Repeated password reset attempts',
  'unusual-request-volume': 'Unusual request volume',
  'disposable-email': 'Disposable email warning'
}

export function AbuseBotsPanel() {
  return (
    <AdminSectionCard
      eyebrow="Abuse & bots"
      title="Platform abuse indicators"
      description="Automated abuse detection signals — login spikes, rate limits, suspicious signups and bot patterns."
    >
      <AdminTableShell headers={['Indicator', 'Status', 'Severity', 'Subject', 'Detail', 'Created', 'Actions']}>
        {DEMO_ABUSE_INDICATORS.map((indicator) => (
          <tr key={indicator.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 text-slate-300">{INDICATOR_LABELS[indicator.type] ?? indicator.type}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={indicator.status} />
            </td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={indicator.severity} />
            </td>
            <td className="px-4 py-3 font-semibold text-white">{indicator.subject}</td>
            <td className="px-4 py-3 text-slate-400">{indicator.detail}</td>
            <td className="px-4 py-3 text-slate-500">{formatAdminDate(indicator.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <AdminActionButton kind="mark-safe" />
                <AdminActionButton kind="lock-account" />
                <AdminActionButton kind="require-password-reset" />
                <AdminActionButton kind="investigate" />
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
