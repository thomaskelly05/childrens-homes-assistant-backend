import type { OrbAdminUsageSummary } from '@/lib/orb/admin-quality-client'
import { ORB_ADMIN_API_PATHS } from '@/lib/orb/admin-quality-client'
import { mockBillingMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { ModelUsageBreakdown } from '@/lib/founder/contracts/billing-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { fetchJson } from './adapter-utils'

export type FounderAiUsageAggregate = {
  openAiSpendGbp: number
  totalRequests: number
  modelBreakdown: ModelUsageBreakdown[]
}

export async function fetchAiUsageAdapter(): Promise<FounderAdapterResult<FounderAiUsageAggregate>> {
  const usage = await fetchJson<OrbAdminUsageSummary>(`${ORB_ADMIN_API_PATHS.billingUsage}?days=30`)

  if (!usage) {
    return getAiUsageAdapterFallback()
  }

  const tierSplit = usage.prompt_tier_split ?? {}
  const modelBreakdown: ModelUsageBreakdown[] = Object.entries(tierSplit).map(([tier, count], index) => ({
    modelId: tier,
    modelName: tier,
    requestCount: count,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostGbp:
      usage.total_requests > 0
        ? Number(((usage.estimated_total_cost * count) / usage.total_requests).toFixed(2))
        : 0
  }))

  return {
    data: {
      openAiSpendGbp: usage.estimated_total_cost ?? mockBillingMetrics.openAiSpendGbp,
      totalRequests: usage.total_requests ?? mockBillingMetrics.totalConversations,
      modelBreakdown: modelBreakdown.length ? modelBreakdown : mockBillingMetrics.modelBreakdown
    },
    source: 'live',
    limitations: [
      'AI usage derived from aggregated request counts — per-user cost rankings are excluded for privacy.'
    ]
  }
}

export function getAiUsageAdapterFallback(): FounderAdapterResult<FounderAiUsageAggregate> {
  return {
    data: {
      openAiSpendGbp: mockBillingMetrics.openAiSpendGbp,
      totalRequests: mockBillingMetrics.totalConversations,
      modelBreakdown: mockBillingMetrics.modelBreakdown
    },
    source: 'mock',
    limitations: ['AI usage telemetry unavailable — using mock cost breakdown.']
  }
}
