import type { OrbAdminUsageSummary } from '@/lib/orb/admin-quality-client'
import { isFounderMockFallbackAllowed } from '@/lib/founder/data/founder-data-mode'
import { mockBillingMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { getBillingAdapterUnavailable } from './adapter-unavailable'
import { currentPeriodBounds, fetchFounderLiveJson } from './adapter-utils'

export async function fetchBillingAdapter(
  providerTotals?: { totalProviders: number; totalMrr: number }
): Promise<FounderAdapterResult<BillingMetrics>> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  const usage = await fetchFounderLiveJson<OrbAdminUsageSummary>('orb-billing-usage', { days: '30' })

  if (!usage) {
    return isFounderMockFallbackAllowed() ? getBillingAdapterFallback() : getBillingAdapterUnavailable()
  }

  const totalProviders = providerTotals?.totalProviders ?? 0
  const totalMrr = providerTotals?.totalMrr ?? 0
  const openAiSpendGbp = usage.estimated_total_cost ?? 0
  const totalConversations = usage.total_requests ?? 0
  const totalActiveUsers = usage.total_active_users ?? 0

  const costPerUserGbp =
    totalActiveUsers > 0 ? Number((openAiSpendGbp / totalActiveUsers).toFixed(2)) : 0
  const costPerProviderGbp =
    totalProviders > 0 ? Number((openAiSpendGbp / totalProviders).toFixed(2)) : 0
  const costPerConversationGbp =
    totalConversations > 0 ? Number((openAiSpendGbp / totalConversations).toFixed(2)) : 0
  const grossMarginPercent =
    totalMrr > 0 ? Number((((totalMrr - openAiSpendGbp) / totalMrr) * 100).toFixed(1)) : 0

  const tierSplit = usage.prompt_tier_split ?? {}
  const modelBreakdown = Object.entries(tierSplit).map(([tier, count]) => ({
    modelId: tier,
    modelName: tier,
    requestCount: count,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostGbp:
      totalConversations > 0
        ? Number(((openAiSpendGbp * count) / totalConversations).toFixed(2))
        : 0
  }))

  return {
    data: {
      periodStart,
      periodEnd,
      openAiSpendGbp,
      totalConversations,
      totalActiveUsers,
      totalProviders,
      totalMrrGbp: totalMrr,
      costPerUserGbp,
      costPerProviderGbp,
      costPerConversationGbp,
      grossMarginPercent,
      modelBreakdown
    },
    source: 'live',
    limitations: totalMrr <= 0 ? ['MRR requires a live billing rollup — not yet connected.'] : []
  }
}

export function getBillingAdapterFallback(): FounderAdapterResult<BillingMetrics> {
  if (!isFounderMockFallbackAllowed()) return getBillingAdapterUnavailable()

  return {
    data: mockBillingMetrics,
    source: 'mock',
    limitations: ['Billing metrics unavailable — using mock unit economics.']
  }
}
