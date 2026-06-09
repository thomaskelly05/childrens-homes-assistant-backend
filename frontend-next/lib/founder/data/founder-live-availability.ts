/**
 * Helpers for determining whether live founder intelligence is available.
 */

import type { FounderDataSourceStatus } from './founder-live-metrics'
import type { FounderLiveMetrics } from './founder-live-metrics'

export function hasLiveBillingData(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.billing === 'connected'
}

export function hasLiveUserAnalytics(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.users === 'connected'
}

export function hasLiveProvidersData(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.providers === 'connected'
}

export function hasLiveHomesData(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.homes === 'connected'
}

export function hasLiveOrbAnalytics(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.orbConversations === 'connected'
}

export function hasLiveFeatureEvents(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.featureEvents === 'connected'
}

export function hasLiveAiUsage(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.aiUsage === 'connected'
}

export function hasLiveReadinessData(status: FounderDataSourceStatus): boolean {
  return status.sourceConnections.readiness === 'connected'
}

/** True when any live source has connected with records — enough to generate actions/insights. */
export function hasAnyLiveFounderIntelligence(metrics: FounderLiveMetrics): boolean {
  const { sourceConnections } = metrics.dataSourceStatus
  return Object.values(sourceConnections).some((status) => status === 'connected')
}

export function canCalculateLiveHoursReturned(metrics: FounderLiveMetrics): boolean {
  const { sourceConnections } = metrics.dataSourceStatus
  return sourceConnections.featureEvents === 'connected' || sourceConnections.orbConversations === 'connected'
}
