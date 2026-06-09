/**
 * Empty contract shapes used when live-only mode has no connected data source.
 */

import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { UsageMetrics } from '@/lib/founder/contracts/usage-metrics'
import { currentPeriodBounds } from './adapters/adapter-utils'

export function emptyUsageMetrics(): UsageMetrics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    periodStart,
    periodEnd,
    activeUsers: 0,
    activeUsersTrendPercent: 0,
    totalSessions: 0,
    dictateMinutes: 0,
    reportBuilderGenerations: 0,
    chronologyBuilds: 0,
    riskAssessmentReviews: 0,
    orbConversations: 0,
    featureUsage: []
  }
}

export function emptyProviderAnalytics(): ProviderAnalytics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    periodStart,
    periodEnd,
    totalProviders: 0,
    totalHomes: 0,
    totalMrr: 0,
    mrrTrendPercent: 0,
    providers: []
  }
}

export function emptyOrbConversationAnalytics(): OrbConversationAnalytics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    periodStart,
    periodEnd,
    totalConversations: 0,
    totalMessages: 0,
    averageConversationLength: 0,
    satisfactionScore: 0,
    safeguardingQueryCount: 0,
    reportGenerationCount: 0,
    categories: [],
    emergingThemes: []
  }
}

export function emptyReadinessMetrics(): ReadinessMetrics {
  const { periodEnd } = currentPeriodBounds()
  return {
    assessedAt: periodEnd,
    platformAverageScore: 0,
    commonGaps: [],
    homes: []
  }
}

export function emptyBillingMetrics(): BillingMetrics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    periodStart,
    periodEnd,
    openAiSpendGbp: 0,
    totalConversations: 0,
    totalActiveUsers: 0,
    totalProviders: 0,
    totalMrrGbp: 0,
    costPerUserGbp: 0,
    costPerProviderGbp: 0,
    costPerConversationGbp: 0,
    grossMarginPercent: 0,
    modelBreakdown: []
  }
}
