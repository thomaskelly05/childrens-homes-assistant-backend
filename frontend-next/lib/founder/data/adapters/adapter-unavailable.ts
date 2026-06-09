/**
 * Unavailable adapter results — returned in live-only mode when a source is not connected.
 * Never contains mock business metrics.
 */

import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { FeatureUsageMetric } from '@/lib/founder/contracts/usage-metrics'
import {
  emptyBillingMetrics,
  emptyOrbConversationAnalytics,
  emptyProviderAnalytics,
  emptyReadinessMetrics,
  emptyUsageMetrics
} from '@/lib/founder/data/empty-contracts'
import type { FounderAdapterResult, FounderHomesAggregate, FounderUsersAggregate } from './adapter-types'
import type { FounderAiUsageAggregate } from './ai-usage-adapter'

export function getUsersAdapterUnavailable(): FounderAdapterResult<FounderUsersAggregate> {
  const empty = emptyUsageMetrics()
  return {
    data: {
      activeUsers: empty.activeUsers,
      activeUsersTrendPercent: empty.activeUsersTrendPercent,
      totalSessions: empty.totalSessions
    },
    source: 'unavailable',
    limitations: ['Live user analytics not connected.']
  }
}

export function getProvidersAdapterUnavailable(): FounderAdapterResult<ProviderAnalytics> {
  return {
    data: emptyProviderAnalytics(),
    source: 'unavailable',
    limitations: ['Live provider analytics not connected.']
  }
}

export function getHomesAdapterUnavailable(): FounderAdapterResult<FounderHomesAggregate> {
  return {
    data: { totalHomes: 0 },
    source: 'unavailable',
    limitations: ["Live children's homes source not connected."]
  }
}

export function getOrbConversationsAdapterUnavailable(): FounderAdapterResult<OrbConversationAnalytics> {
  return {
    data: emptyOrbConversationAnalytics(),
    source: 'unavailable',
    limitations: ['Live ORB conversation analytics not connected.']
  }
}

export function getFeatureEventsAdapterUnavailable(): FounderAdapterResult<FeatureUsageMetric[]> {
  return {
    data: [],
    source: 'unavailable',
    limitations: ['Live feature usage events not connected.']
  }
}

export function getBillingAdapterUnavailable(): FounderAdapterResult<BillingMetrics> {
  return {
    data: emptyBillingMetrics(),
    source: 'unavailable',
    limitations: ['Live billing source not connected.']
  }
}

export function getAiUsageAdapterUnavailable(): FounderAdapterResult<FounderAiUsageAggregate> {
  return {
    data: {
      openAiSpendGbp: 0,
      totalRequests: 0,
      modelBreakdown: []
    },
    source: 'unavailable',
    limitations: ['Live AI usage telemetry not connected.']
  }
}

export function getReadinessAdapterUnavailable(): FounderAdapterResult<ReadinessMetrics> {
  return {
    data: emptyReadinessMetrics(),
    source: 'unavailable',
    limitations: ['Live Ofsted readiness source not connected.']
  }
}
