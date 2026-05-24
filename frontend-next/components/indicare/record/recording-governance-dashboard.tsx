'use client'

import { useCallback, useEffect, useState } from 'react'

import { RecordingGovernanceActions } from '@/components/indicare/record/recording-governance-actions'
import { RecordingGovernanceAlerts } from '@/components/indicare/record/recording-governance-alerts'
import { RecordingGovernanceBacklog } from '@/components/indicare/record/recording-governance-backlog'
import { RecordingGovernanceCard } from '@/components/indicare/record/recording-governance-card'
import { RecordingGovernanceFormUsageTable } from '@/components/indicare/record/recording-governance-form-usage'
import { RecordingGovernanceQuality } from '@/components/indicare/record/recording-governance-quality'
import {
  getRecordingGovernanceDashboard,
  type RecordingGovernanceDashboard as DashboardData
} from '@/lib/os-api/recording-governance'

export function RecordingGovernanceDashboard({ childIdFilter }: { childIdFilter?: number }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getRecordingGovernanceDashboard(
      childIdFilter != null ? { child_id: childIdFilter } : undefined
    )
    setDashboard(result.ok ? result.data : null)
    setError(result.ok ? undefined : result.error)
    setLoading(false)
  }, [childIdFilter])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <p className="text-sm font-semibold text-slate-600" data-testid="recording-governance-loading">
        Loading recording governance metrics…
      </p>
    )
  }

  if (!dashboard) {
    return (
      <p className="text-sm font-semibold text-rose-700" data-testid="recording-governance-error">
        {error || 'Governance dashboard unavailable. Manager access may be required.'}
      </p>
    )
  }

  return (
    <div data-testid="recording-governance-dashboard" className="space-y-10">
      <div
        className="rounded-[24px] border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm font-semibold text-blue-950"
        data-testid="recording-governance-privacy-notice"
      >
        {dashboard.privacy_notice}
      </div>

      <section data-testid="recording-governance-summary-cards" className="space-y-4">
        <h2 className="text-lg font-black text-slate-950">Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.summary_cards.map((card) => (
            <RecordingGovernanceCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      <RecordingGovernanceBacklog backlog={dashboard.backlog} />

      <section data-testid="recording-governance-high-risk" className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">High-risk and safeguarding</h2>
        <p className="text-sm font-semibold text-slate-600">
          {dashboard.backlog.safeguarding_review} safeguarding-sensitive item(s) and{' '}
          {dashboard.backlog.urgent} urgent priority item(s) in scope. Open the review queue for detail — not raw
          bodies.
        </p>
      </section>

      <RecordingGovernanceQuality quality={dashboard.quality} />

      <section data-testid="recording-governance-form-usage-section" className="space-y-4">
        <h2 className="text-lg font-black text-slate-950">Form usage</h2>
        <RecordingGovernanceFormUsageTable items={dashboard.form_usage} />
      </section>

      <section data-testid="recording-governance-review-outcomes" className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">Review outcomes</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Outcome label="Approved" value={dashboard.review_outcomes.approved} />
          <Outcome label="Changes requested" value={dashboard.review_outcomes.changes_requested} />
          <Outcome label="Safeguarding escalation" value={dashboard.review_outcomes.safeguarding_escalation} />
          <Outcome label="Submitted after approval" value={dashboard.review_outcomes.submitted_after_approval} />
          <Outcome label="Archived" value={dashboard.review_outcomes.archived} />
        </div>
      </section>

      <RecordingGovernanceAlerts
        alerts={dashboard.alerts}
        recommendations={dashboard.recommendations}
        childIdFilter={childIdFilter}
      />

      <RecordingGovernanceActions dashboard={dashboard} childIdFilter={childIdFilter} />

      {dashboard.limitations.length ? (
        <section
          data-testid="recording-governance-limitations"
          className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Limitations</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold leading-5 text-slate-600">
            {dashboard.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function Outcome({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className="text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}
