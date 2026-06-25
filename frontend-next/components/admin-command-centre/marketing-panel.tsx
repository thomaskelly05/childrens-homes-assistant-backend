'use client'

import { DEMO_MARKETING_LEADS } from '@/lib/admin-command-centre/demo-data'

import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'
import { AdminTableShell, formatAdminDate } from './admin-action-button'

const LEAD_TYPE_LABELS: Record<string, string> = {
  'demo-request': 'Demo request',
  'pilot-request': 'Pilot request',
  newsletter: 'Newsletter signup',
  'provider-interest': 'Provider interest'
}

export function MarketingPanel() {
  return (
    <AdminSectionCard
      eyebrow="Marketing"
      title="Lead tracking"
      description="CRM-lite pipeline for demo requests, pilot interest and newsletter signups."
    >
      <AdminTableShell headers={['Type', 'Contact', 'Organisation', 'Stage', 'Source', 'Created', 'Next action']}>
        {DEMO_MARKETING_LEADS.map((lead) => (
          <tr key={lead.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 text-slate-300">{LEAD_TYPE_LABELS[lead.type] ?? lead.type}</td>
            <td className="px-4 py-3 font-semibold text-white">{lead.contact}</td>
            <td className="px-4 py-3 text-slate-400">{lead.organisation}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={lead.stage} />
            </td>
            <td className="px-4 py-3 text-slate-400">{lead.source}</td>
            <td className="px-4 py-3 text-slate-500">{formatAdminDate(lead.createdAt)}</td>
            <td className="px-4 py-3 text-slate-400">{lead.nextAction}</td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
