'use client'

import { buildAdminOverviewMetrics } from '@/lib/admin-command-centre/admin-metrics'

import { AdminSectionCard } from './admin-section-card'

const METRIC_LABELS: { key: keyof ReturnType<typeof buildAdminOverviewMetrics>; label: string }[] = [
  { key: 'totalUsers', label: 'Total users' },
  { key: 'activeUsers', label: 'Active users' },
  { key: 'disabledUsers', label: 'Disabled users' },
  { key: 'invitedUsers', label: 'Invited users' },
  { key: 'providers', label: 'Providers' },
  { key: 'homes', label: 'Homes' },
  { key: 'openSafetyFlags', label: 'Open safety flags' },
  { key: 'suspiciousActivityAlerts', label: 'Suspicious activity' },
  { key: 'onboardingProviders', label: 'Onboarding providers' },
  { key: 'supportActionsPending', label: 'Support pending' }
]

export function AdminOverviewPanel() {
  const metrics = buildAdminOverviewMetrics()

  return (
    <AdminSectionCard
      eyebrow="Overview"
      title="Operational metrics"
      description="Platform-wide counts for authorised admin review. Metadata only — no care record content."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {METRIC_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            data-testid={`admin-metric-${key}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-white">{metrics[key]}</p>
          </div>
        ))}
      </div>
    </AdminSectionCard>
  )
}
