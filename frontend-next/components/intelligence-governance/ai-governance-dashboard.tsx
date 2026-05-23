import Link from 'next/link'

import type { AiGovernanceDashboardData } from '@/lib/os-api/ai-governance'

import { AiGovernanceAlerts } from './ai-governance-alerts'
import { AiGovernanceCard } from './ai-governance-card'
import { AiGovernanceCostQuality } from './ai-governance-cost-quality'
import { AiGovernanceEventsTable } from './ai-governance-events-table'
import { AiGovernanceSourceHealth } from './ai-governance-source-health'

function formatPct(value: number) {
  return `${Math.round(value * 1000) / 10}%`
}

export function AiGovernanceDashboard({ data, warning }: { data: AiGovernanceDashboardData; warning?: string }) {
  const { summary } = data

  return (
    <div className="space-y-10" data-testid="ai-governance-dashboard">
      <div
        className="rounded-[24px] border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm font-medium text-blue-950"
        data-testid="ai-governance-privacy-notice"
      >
        Governance dashboard uses metadata and summaries only. It does not display raw care records.
      </div>

      {warning ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-950">
          {warning}
        </div>
      ) : null}

      <section className="space-y-4" data-testid="ai-governance-overview">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Overview</h2>
            <p className="text-sm font-medium text-slate-600">AI usage across standalone ORB, operational ORB and tools.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/intelligence-actions" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
              Action Board
            </Link>
            <Link
              href="/intelligence/governance/privacy"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              Privacy governance
            </Link>
            <Link href="/assistant/orb" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white">
              Operational ORB
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AiGovernanceCard title="Total AI requests" value={summary.total_ai_requests} testId="ai-gov-total-requests" />
          <AiGovernanceCard title="Standalone" value={summary.standalone_requests} testId="ai-gov-standalone-requests" />
          <AiGovernanceCard title="Operational" value={summary.operational_requests} testId="ai-gov-operational-requests" />
          <AiGovernanceCard
            title="Average quality"
            value={summary.average_quality_score != null ? summary.average_quality_score.toFixed(2) : '—'}
            testId="ai-gov-overview-quality"
          />
          <AiGovernanceCard title="Citation coverage" value={formatPct(summary.citation_coverage)} />
          <AiGovernanceCard title="Fallback rate" value={formatPct(summary.fallback_rate)} />
          <AiGovernanceCard title="Agent runs" value={summary.agent_runs} />
          <AiGovernanceCard title="Deep research" value={summary.deep_research_runs} />
        </div>
      </section>

      {data.privacy ? (
        <section className="space-y-4" data-testid="ai-governance-privacy-metrics">
          <div>
            <h2 className="text-lg font-black text-slate-950">Privacy guard</h2>
            <p className="text-sm font-medium text-slate-600">Permission checks, redaction and blocked model sends.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AiGovernanceCard
              title="Privacy guard decisions"
              value={data.privacy.privacy_guard_decisions}
              testId="ai-gov-privacy-guard-decisions"
            />
            <AiGovernanceCard
              title="Denied attempts"
              value={data.privacy.denied_attempts}
              testId="ai-gov-privacy-denied"
            />
            <AiGovernanceCard
              title="Redaction applied"
              value={data.privacy.redaction_applied_count}
              testId="ai-gov-privacy-redaction"
            />
            <AiGovernanceCard
              title="Model send blocked"
              value={data.privacy.model_send_blocked}
              testId="ai-gov-privacy-model-blocked"
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-4" data-testid="ai-governance-safety">
        <div>
          <h2 className="text-lg font-black text-slate-950">Safety</h2>
          <p className="text-sm font-medium text-slate-600">Safeguarding flags, boundary warnings and review queues.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AiGovernanceCard
            title="Safeguarding flags"
            value={summary.safeguarding_flag_count}
            testId="ai-gov-safeguarding-flags"
          />
          <AiGovernanceCard
            title="Boundary warnings"
            value={summary.boundary_warning_count}
            testId="ai-gov-boundary-warnings"
          />
          <AiGovernanceCard title="High-risk prompts" value={summary.high_risk_prompt_count} testId="ai-gov-high-risk" />
          <AiGovernanceCard
            title="Awaiting review"
            value={summary.awaiting_review_count}
            testId="ai-gov-awaiting-review"
          />
        </div>
        <AiGovernanceAlerts alerts={data.alerts} />
      </section>

      <AiGovernanceSourceHealth sources={data.sources} />

      <section className="space-y-4" data-testid="ai-governance-outputs">
        <div>
          <h2 className="text-lg font-black text-slate-950">Outputs</h2>
          <p className="text-sm font-medium text-slate-600">Saved standalone artefacts and operational outputs.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AiGovernanceCard title="Saved standalone outputs" value={summary.saved_outputs_count} />
          <AiGovernanceCard title="Operational outputs" value={summary.operational_outputs_count} />
          <AiGovernanceCard title="Awaiting manager review" value={summary.awaiting_review_count} />
          <AiGovernanceCard title="Actions created" value={summary.actions_created_count} />
        </div>
      </section>

      <AiGovernanceCostQuality summary={data.summary} usage={data.usage} quality={data.quality} cost={data.cost} />

      {data.recommendations.length ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-slate-950">Recommendations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-medium text-slate-700">
            {data.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">Recent events</h2>
          <p className="text-sm font-medium text-slate-600">Metadata-only governance event stream.</p>
        </div>
        <AiGovernanceEventsTable events={data.recent_events} />
      </section>
    </div>
  )
}
