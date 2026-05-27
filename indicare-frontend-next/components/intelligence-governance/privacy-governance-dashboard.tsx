import Link from 'next/link'

import type { AiPrivacyDashboardData } from '@/lib/os-api/ai-privacy'

import { AiGovernanceCard } from './ai-governance-card'
import { PrivacyEventsTable } from './privacy-events-table'
import { PrivacyRedactionPreview } from './privacy-redaction-preview'

export function PrivacyGovernanceDashboard({
  data,
  warning
}: {
  data: AiPrivacyDashboardData
  warning?: string
}) {
  const { summary } = data

  return (
    <div className="space-y-10" data-testid="privacy-governance-dashboard">
      <div
        className="rounded-[24px] border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm font-medium text-blue-950"
        data-testid="privacy-dashboard-banner"
      >
        This dashboard uses privacy metadata and redacted previews only. It does not display raw care records.
      </div>

      {warning ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-950">
          {warning}
        </div>
      ) : null}

      <section className="space-y-4" data-testid="privacy-overview">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Privacy overview</h2>
            <p className="text-sm font-medium text-slate-600">Guard decisions, blocked attempts and child-scoped usage.</p>
          </div>
          <Link
            href="/intelligence/governance/ai"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
          >
            AI Governance
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AiGovernanceCard title="Privacy events" value={summary.total_events} testId="privacy-total-events" />
          <AiGovernanceCard title="Denied attempts" value={summary.denied_attempts} testId="privacy-denied-attempts" />
          <AiGovernanceCard
            title="Redaction applied"
            value={summary.redaction_applied_count}
            testId="privacy-redaction-applied"
          />
          <AiGovernanceCard
            title="Minimisation applied"
            value={summary.minimisation_applied_count}
            testId="privacy-minimisation-applied"
          />
          <AiGovernanceCard title="Child-scoped usage" value={summary.child_scoped_attempts} testId="privacy-child-scoped" />
          <AiGovernanceCard title="Raw record blocked" value={summary.raw_record_blocked} testId="privacy-raw-blocked" />
          <AiGovernanceCard
            title="Standalone OS blocked"
            value={summary.standalone_os_context_blocked}
            testId="privacy-standalone-blocked"
          />
          <AiGovernanceCard
            title="Model send blocked"
            value={summary.model_send_blocked}
            testId="privacy-model-send-blocked"
          />
        </div>
      </section>

      <section className="space-y-4" data-testid="privacy-safeguarding-review">
        <h2 className="text-lg font-black text-slate-950">Safeguarding &amp; export governance</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AiGovernanceCard
            title="Safeguarding review required"
            value={summary.safeguarding_review_required}
            testId="privacy-safeguarding-review"
          />
          <AiGovernanceCard
            title="Manager review required"
            value={summary.manager_review_required}
            testId="privacy-manager-review"
          />
          <AiGovernanceCard title="Exports allowed" value={summary.exports_allowed} testId="privacy-exports-allowed" />
          <AiGovernanceCard title="Exports blocked" value={summary.exports_blocked} testId="privacy-exports-blocked" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black text-slate-950">Recent privacy events</h2>
        <PrivacyEventsTable events={data.recent_events} />
      </section>

      <PrivacyRedactionPreview />
    </div>
  )
}
