import type { OrbAdminUsageSummary } from '@/lib/orb/admin-quality-client'
import { ORB_ADMIN_API_PATHS } from '@/lib/orb/admin-quality-client'
import { mockBillingMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { currentPeriodBounds, fetchJson } from './adapter-utils'

export async function fetchBillingAdapter(
  providerTotals?: { totalProviders: number; totalMrr: number }
): Promise<FounderAdapterResult<BillingMetrics>> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  const usage = await fetchJson<OrbAdminUsageSummary>(`${ORB_ADMIN_API_PATHS.billingUsage}?days=30`)

  if (!usage) {
    return getBillingAdapterFallback()
  }

  const totalProviders = providerTotals?.totalProviders ?? mockBillingMetrics.totalProviders
  const totalMrr = providerTotals?.totalMrr ?? mockBillingMetrics.totalMrrGbp
  const openAiSpendGbp = usage.estimated_total_cost ?? mockBillingMetrics.openAiSpendGbp
  const totalConversations = usage.total_requests ?? mockBillingMetrics.totalConversations
  const totalActiveUsers = usage.total_active_users ?? mockBillingMetrics.totalActiveUsers

  const costPerUserGbp =
    totalActiveUsers > 0 ? Number((openAiSpendGbp / totalActiveUsers).toFixed(2)) : mockBillingMetrics.costPerUserGbp
  const costPerProviderGbp =
    totalProviders > 0
      ? Number((openAiSpendGbp / totalProviders).toFixed(2))
      : mockBillingMetrics.costPerProviderGbp
  const costPerConversationGbp =
    totalConversations > 0
      ? Number((openAiSpendGbp / totalConversations).toFixed(2))
      : mockBillingMetrics.costPerConversationGbp
  const grossMarginPercent =
    totalMrr > 0
      ? Number((((totalMrr - openAiSpendGbp) / totalMrr) * 100).toFixed(1))
      : mockBillingMetrics.grossMarginPercent

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
      modelBreakdown: mockBillingMetrics.modelBreakdown
    },
    source: 'live',
    limitations: [
      'MRR still estimated until subscription billing rollups are connected to founder analytics.',
      'Model-level breakdown retained from mock inputs until token routing telemetry is aggregated.'
    ]
  }
}

export function getBillingAdapterFallback(): FounderAdapterResult<BillingMetrics> {
  return {
    data: mockBillingMetrics,
    source: 'mock',
    limitations: ['Billing metrics unavailable — using mock unit economics.']
  }
}
