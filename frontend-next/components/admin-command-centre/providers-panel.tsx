'use client'

import { DEMO_PROVIDERS } from '@/lib/admin-command-centre/demo-data'

import { AdminActionButton, AdminTableShell } from './admin-action-button'
import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

export function ProvidersPanel() {
  return (
    <AdminSectionCard
      eyebrow="Providers"
      title="Provider organisations"
      description="Care provider accounts, onboarding stage and operational flags."
    >
      <AdminTableShell
        headers={[
          'Provider',
          'Status',
          'Homes',
          'Users',
          'Onboarding',
          'Subscription',
          'Flags',
          'Actions'
        ]}
      >
        {DEMO_PROVIDERS.map((provider) => (
          <tr key={provider.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 font-semibold text-white">{provider.name}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={provider.status} />
            </td>
            <td className="px-4 py-3 text-slate-300">{provider.homesCount}</td>
            <td className="px-4 py-3 text-slate-300">{provider.usersCount}</td>
            <td className="px-4 py-3 text-slate-400">{provider.onboardingStage}</td>
            <td className="px-4 py-3 text-slate-500">{provider.subscriptionStatus}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {[...provider.riskFlags, ...provider.supportFlags].map((flag) => (
                  <AdminStatusBadge key={flag} status="medium">
                    {flag}
                  </AdminStatusBadge>
                ))}
                {!provider.riskFlags.length && !provider.supportFlags.length ? (
                  <span className="text-slate-600">—</span>
                ) : null}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <AdminActionButton kind="pause-provider" />
                <AdminActionButton kind="add-home" />
                <AdminActionButton kind="invite-manager" />
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
