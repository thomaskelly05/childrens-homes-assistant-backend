/**
 * Hydrates founder live metrics from bootstrap liveSummary — avoids duplicate live API storms.
 */

import type { OrbAdminFeedbackSummary, OrbAdminUsageSummary } from '@/lib/orb/admin-quality-client'
import type { InspectionReadinessDashboard } from '@/lib/os-api/inspection-readiness'
import type { FounderBootstrapLiveSummary, FounderBootstrapPayload } from './founder-bootstrap-client'
import {
  buildLiveMetricsFromAdapters,
  type FounderLiveMetrics
} from '@/lib/founder/data/founder-live-metrics'
import type { FounderDataSourceAvailability } from '@/lib/founder/data/founder-data-source'
import { currentPeriodBounds } from '@/lib/founder/data/adapters/adapter-utils'
import { getBillingAdapterFallback } from '@/lib/founder/data/adapters/billing-adapter'
import { getFeatureEventsAdapterFallback } from '@/lib/founder/data/adapters/feature-events-adapter'
import { getHomesAdapterFallback } from '@/lib/founder/data/adapters/homes-adapter'
import { getOrbConversationsAdapterFallback } from '@/lib/founder/data/adapters/orb-conversations-adapter'
import { getProvidersAdapterFallback } from '@/lib/founder/data/adapters/providers-adapter'
import { getReadinessAdapterFallback } from '@/lib/founder/data/adapters/readiness-adapter'
import { getUsersAdapterFallback } from '@/lib/founder/data/adapters/users-adapter'
import { getAiUsageAdapterFallback } from '@/lib/founder/data/adapters/ai-usage-adapter'
import type { FounderAdapterResult } from '@/lib/founder/data/adapters/adapter-types'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { FounderUsersAggregate } from '@/lib/founder/data/adapters/adapter-types'
import type { FounderAiUsageAggregate } from '@/lib/founder/data/adapters/ai-usage-adapter'

type ProvidersApiResponse = {
  providers?: Array<Record<string, unknown>>
  items?: Array<Record<string, unknown>>
  count?: number
}

type HomesApiResponse = {
  homes?: Array<Record<string, unknown>>
  items?: Array<Record<string, unknown>>
  count?: number
}

function isBusy(section: string, sectionErrors: Record<string, string>): boolean {
  return sectionErrors[section] === 'busy'
}

function deriveAvailability(
  liveSummary: FounderBootstrapLiveSummary,
  dataSourceStatus: Record<string, unknown>,
  sectionErrors: Record<string, string>
): Omit<FounderDataSourceAvailability, 'sourceMode'> {
  const billingOk =
    !isBusy('orb-billing-usage', sectionErrors) &&
    dataSourceStatus.billing !== 'busy' &&
    Boolean(liveSummary.billingUsage && typeof liveSummary.billingUsage === 'object')

  return {
    usersAvailable: billingOk,
    providersAvailable:
      !isBusy('providers', sectionErrors) &&
      dataSourceStatus.providers !== 'busy',
    homesAvailable: !isBusy('homes', sectionErrors) && dataSourceStatus.homes !== 'busy',
    orbConversationsAvailable:
      !isBusy('orb-feedback-summary', sectionErrors) &&
      dataSourceStatus.feedback !== 'busy',
    featureEventsAvailable: false,
    billingAvailable: billingOk,
    aiUsageAvailable: billingOk,
    readinessAvailable:
      !isBusy('inspection-readiness', sectionErrors) &&
      dataSourceStatus.readiness !== 'unavailable' &&
      dataSourceStatus.readiness !== 'busy'
  }
}

function usersFromBilling(usage: OrbAdminUsageSummary | undefined): FounderAdapterResult<FounderUsersAggregate> {
  if (!usage || typeof usage.total_active_users !== 'number') {
    return getUsersAdapterFallback()
  }

  const trend =
    usage.daily_usage_trend?.length >= 2
      ? Math.round(
          ((usage.daily_usage_trend.at(-1)?.requests ?? 0) /
            Math.max(usage.daily_usage_trend[0]?.requests ?? 1, 1) -
            1) *
            100
        )
      : 0

  return {
    data: {
      activeUsers: usage.total_active_users,
      activeUsersTrendPercent: trend,
      totalSessions: usage.total_requests ?? 0
    },
    source: 'live',
    limitations: usage.total_active_users === 0 ? ['Live user feed returned zero active users.'] : []
  }
}

function providersFromSummary(payload: ProvidersApiResponse | undefined): FounderAdapterResult<ProviderAnalytics> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  if (!payload) return getProvidersAdapterFallback()

  const rows = payload.providers ?? payload.items ?? []
  if (!rows.length) {
    return {
      data: {
        periodStart,
        periodEnd,
        totalProviders: 0,
        totalHomes: 0,
        totalMrr: 0,
        mrrTrendPercent: 0,
        providers: []
      },
      source: 'live',
      limitations: ['Providers endpoint reachable but returned no records.']
    }
  }

  const providers = rows.map((row, index) => ({
    providerId: String(row.id ?? `provider-${index + 1}`),
    providerName: `Provider ${index + 1}`,
    homesCount: typeof row.homes_count === 'number' ? row.homes_count : 0,
    activeUsers: 0,
    weeklyActiveUsers: 0,
    orbConversations: 0,
    dictateMinutes: 0,
    mrr: 0,
    churnRisk: 'low' as const,
    lastActiveAt: periodEnd
  }))

  return {
    data: {
      periodStart,
      periodEnd,
      totalProviders: payload.count ?? providers.length,
      totalHomes: providers.reduce((sum, p) => sum + p.homesCount, 0),
      totalMrr: 0,
      mrrTrendPercent: 0,
      providers
    },
    source: 'live',
    limitations: ['Provider names anonymised. MRR requires a live billing rollup — not yet connected.']
  }
}

function homesFromSummary(payload: HomesApiResponse | undefined): ReturnType<typeof getHomesAdapterFallback> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  if (!payload) return getHomesAdapterFallback()

  const rows = payload.homes ?? payload.items ?? []
  return {
    data: {
      totalHomes: payload.count ?? rows.length
    },
    source: 'live',
    limitations:
      rows.length === 0
        ? ["Homes endpoint reachable but returned no children's home records."]
        : ['Home names and addresses are never exposed in founder analytics.']
  }
}

function orbFromFeedback(summary: OrbAdminFeedbackSummary | undefined): FounderAdapterResult<OrbConversationAnalytics> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  if (!summary) return getOrbConversationsAdapterFallback()

  const usage = summary.usage_summary
  const totalConversations = usage?.total_requests ?? summary.total_feedback ?? 0
  const satisfactionScore = Math.round(Math.min(100, Math.max(0, (summary.helpful_ratio ?? 0) * 100)))

  const categories = (summary.top_modes_with_downvotes ?? []).map((mode, index) => ({
    categoryId: `mode-${index + 1}`,
    categoryName: mode.mode || `Category ${index + 1}`,
    conversationCount: mode.count,
    messageCount: mode.count * 5,
    trendPercent: 0,
    averageLength: 5
  }))

  const emergingThemes = (summary.recurring_gaps ?? []).slice(0, 4).map((gap) => ({
    theme: gap.gap,
    confidence: Math.min(0.95, gap.count / Math.max(totalConversations, 1)),
    relatedCategories: [],
    firstDetected: periodEnd
  }))

  return {
    data: {
      periodStart,
      periodEnd,
      totalConversations,
      totalMessages: totalConversations * 5,
      averageConversationLength: totalConversations > 0 ? 5 : 0,
      satisfactionScore,
      safeguardingQueryCount: summary.unsafe_answer_complaints ?? 0,
      reportGenerationCount: 0,
      categories,
      emergingThemes
    },
    source: 'live',
    limitations: [
      'ORB conversation categories derived from aggregated mode counts only — no safeguarding narrative content included.',
      categories.length === 0 ? 'Category breakdown unavailable from live ORB analytics.' : ''
    ].filter(Boolean)
  }
}

function billingFromUsage(
  usage: OrbAdminUsageSummary | undefined,
  providerTotals: { totalProviders: number; totalMrr: number }
): FounderAdapterResult<BillingMetrics> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  if (!usage) return getBillingAdapterFallback()

  const openAiSpendGbp = usage.estimated_total_cost ?? 0
  const totalConversations = usage.total_requests ?? 0
  const totalActiveUsers = usage.total_active_users ?? 0
  const totalProviders = providerTotals.totalProviders
  const totalMrr = providerTotals.totalMrr

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

function aiUsageFromBilling(usage: OrbAdminUsageSummary | undefined): FounderAdapterResult<FounderAiUsageAggregate> {
  if (!usage) return getAiUsageAdapterFallback()

  const tierSplit = usage.prompt_tier_split ?? {}
  const modelBreakdown = Object.entries(tierSplit).map(([tier, count]) => ({
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
      openAiSpendGbp: usage.estimated_total_cost ?? 0,
      totalRequests: usage.total_requests ?? 0,
      modelBreakdown
    },
    source: 'live',
    limitations: [
      'AI usage derived from aggregated request counts — per-user cost rankings are excluded for privacy.'
    ]
  }
}

function readinessFromDashboard(
  dashboard: InspectionReadinessDashboard | undefined
): FounderAdapterResult<ReadinessMetrics> {
  const { periodEnd } = currentPeriodBounds()
  if (!dashboard) return getReadinessAdapterFallback()

  const commonGaps = (dashboard.key_gaps ?? []).map((gap) => ({
    gap: gap.title,
    frequency: gap.risk === 'urgent' ? 3 : gap.risk === 'high' ? 2 : 1
  }))

  const gapTitles = commonGaps.map((g) => g.gap)
  const platformAverageScore = gapTitles.length === 0 ? 0 : Math.max(55, 100 - gapTitles.length * 4)

  return {
    data: {
      assessedAt: dashboard.generated_at ?? periodEnd,
      platformAverageScore,
      commonGaps,
      homes: []
    },
    source: 'live',
    limitations: [
      'Readiness scores synthesised from inspection gap counts — home-level names anonymised.',
      commonGaps.length === 0 ? 'No readiness gap records returned from live source.' : ''
    ].filter(Boolean)
  }
}

/** Build live metrics from bootstrap payload without additional browser live fetches. */
export function buildLiveMetricsFromBootstrap(bootstrap: FounderBootstrapPayload): FounderLiveMetrics {
  const { liveSummary, dataSourceStatus, sectionErrors } = bootstrap
  const availability = deriveAvailability(liveSummary, dataSourceStatus, sectionErrors)

  const billingUsage = liveSummary.billingUsage as OrbAdminUsageSummary | undefined
  const providers = providersFromSummary(liveSummary.providers as ProvidersApiResponse | undefined)
  const homes = homesFromSummary(liveSummary.homes as HomesApiResponse | undefined)
  const orb = orbFromFeedback(liveSummary.feedbackSummary as OrbAdminFeedbackSummary | undefined)
  const billing = billingFromUsage(billingUsage, {
    totalProviders: providers.data.totalProviders,
    totalMrr: providers.data.totalMrr
  })
  const aiUsage = aiUsageFromBilling(billingUsage)
  const users = usersFromBilling(billingUsage)
  const readiness = readinessFromDashboard(
    liveSummary.inspectionReadiness as InspectionReadinessDashboard | undefined
  )
  const features = getFeatureEventsAdapterFallback()

  const metrics = buildLiveMetricsFromAdapters(
    users,
    providers,
    homes,
    orb,
    features,
    billing,
    aiUsage,
    readiness,
    availability
  )

  metrics.dataSourceStatus.source = 'live-only'
  metrics.dataSourceStatus.limitations = [
    ...metrics.dataSourceStatus.limitations,
    ...Object.entries(sectionErrors)
      .filter(([, error]) => Boolean(error))
      .map(([section]) => `${section} temporarily unavailable during bootstrap`)
  ]

  return metrics
}
