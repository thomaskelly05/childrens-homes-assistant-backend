import type { AiGovernanceDashboardData } from '@/lib/os-api/ai-governance'

import { AiGovernanceCard } from './ai-governance-card'

function formatPct(value: number) {
  return `${Math.round(value * 1000) / 10}%`
}

export function AiGovernanceCostQuality({
  summary,
  usage,
  quality,
  cost
}: {
  summary: AiGovernanceDashboardData['summary']
  usage: AiGovernanceDashboardData['usage']
  quality: AiGovernanceDashboardData['quality']
  cost: AiGovernanceDashboardData['cost']
}) {
  const topProvider = Object.entries(usage.model_provider_distribution).sort((a, b) => b[1] - a[1])[0]
  const topCostTier = Object.entries(cost.estimated_cost_tier_summary).sort((a, b) => b[1] - a[1])[0]

  return (
    <section className="space-y-4" data-testid="ai-governance-cost-quality">
      <div>
        <h2 className="text-lg font-black text-slate-950">Model & cost</h2>
        <p className="text-sm font-medium text-slate-600">Provider routing, cost tier, latency and quality signals.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AiGovernanceCard
          title="Average quality"
          value={summary.average_quality_score != null ? summary.average_quality_score.toFixed(2) : '—'}
          testId="ai-gov-average-quality"
        />
        <AiGovernanceCard title="Citation coverage" value={formatPct(summary.citation_coverage)} testId="ai-gov-citation-coverage" />
        <AiGovernanceCard title="Fallback rate" value={formatPct(summary.fallback_rate)} testId="ai-gov-fallback-rate" />
        <AiGovernanceCard
          title="Avg latency"
          value={summary.average_latency_ms != null ? `${Math.round(summary.average_latency_ms)} ms` : '—'}
          testId="ai-gov-latency"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AiGovernanceCard
          title="Top provider"
          value={topProvider ? topProvider[0] : '—'}
          detail={topProvider ? `${topProvider[1]} events` : undefined}
        />
        <AiGovernanceCard
          title="Top cost tier"
          value={topCostTier ? topCostTier[0] : '—'}
          detail={topCostTier ? `${topCostTier[1]} routed requests` : undefined}
        />
        <AiGovernanceCard title="Low quality outputs" value={quality.low_quality_output_count} />
        <AiGovernanceCard title="Model fallbacks" value={cost.fallback_count} />
      </div>
    </section>
  )
}
