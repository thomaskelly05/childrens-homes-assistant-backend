import type { AiGovernanceDashboardData } from '@/lib/os-api/ai-governance'

import { AiGovernanceCard } from './ai-governance-card'

export function AiGovernanceSourceHealth({ sources }: { sources: AiGovernanceDashboardData['sources'] }) {
  return (
    <section className="space-y-4" data-testid="ai-governance-source-health">
      <div>
        <h2 className="text-lg font-black text-slate-950">Source health</h2>
        <p className="text-sm font-medium text-slate-600">Official sources, review queue and summary-only usage.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AiGovernanceCard title="Official sources" value={sources.official_sources_count} testId="ai-gov-official-sources" />
        <AiGovernanceCard
          title="Needs review"
          value={sources.sources_needing_review_count}
          testId="ai-gov-sources-needing-review"
        />
        <AiGovernanceCard title="Expired" value={sources.expired_sources_count} testId="ai-gov-expired-sources" />
        <AiGovernanceCard
          title="Summary-only use"
          value={sources.summary_only_source_count}
          testId="ai-gov-summary-only-sources"
        />
      </div>
      {sources.sources_needing_review.length ? (
        <ul className="rounded-[24px] border border-amber-100 bg-amber-50/60 p-4 text-sm font-medium text-amber-950">
          {sources.sources_needing_review.map((source) => (
            <li key={String(source.id)} className="py-1">
              {String(source.title || source.id)} — {String(source.governance_status || 'needs_review')}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
