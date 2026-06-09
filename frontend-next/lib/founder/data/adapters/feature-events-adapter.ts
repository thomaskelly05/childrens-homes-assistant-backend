import { isFounderMockFallbackAllowed } from '@/lib/founder/data/founder-data-mode'
import { getFounderTelemetryEvents } from '@/lib/founder/telemetry'
import { mockUsageMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { FeatureUsageMetric } from '@/lib/founder/contracts/usage-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { getFeatureEventsAdapterUnavailable } from './adapter-unavailable'
import { currentPeriodBounds } from './adapter-utils'

function getFeatureEventsFromTelemetry(): FounderAdapterResult<FeatureUsageMetric[]> | null {
  const events = getFounderTelemetryEvents().filter((e) => e.category === 'features')
  if (events.length === 0) return null

  const { periodStart, periodEnd } = currentPeriodBounds()
  const data: FeatureUsageMetric[] = events.map((event) => ({
    featureId: String(event.metadata.feature ?? event.eventType).toLowerCase().replace(/\s+/g, '-'),
    featureName: String(event.metadata.feature ?? event.eventType),
    activeUsers: 0,
    sessions: Number(event.metadata.count ?? 1),
    adoptionRate: Number(event.metadata.adoptionRate ?? 1),
    trendPercent: Number(event.metadata.trendPercent ?? 0),
    abandonmentRate: 0,
    periodStart,
    periodEnd
  }))

  return {
    data,
    source: 'live',
    limitations: ['Feature usage derived from founder telemetry events.']
  }
}

/**
 * Feature usage events adapter — reads from founder telemetry when available.
 */
export async function fetchFeatureEventsAdapter(): Promise<FounderAdapterResult<FeatureUsageMetric[]>> {
  const fromTelemetry = getFeatureEventsFromTelemetry()
  if (fromTelemetry) return fromTelemetry
  return isFounderMockFallbackAllowed() ? getFeatureEventsAdapterFallback() : getFeatureEventsAdapterUnavailable()
}

export function getFeatureEventsAdapterFallback(): FounderAdapterResult<FeatureUsageMetric[]> {
  if (!isFounderMockFallbackAllowed()) return getFeatureEventsAdapterUnavailable()

  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    data: mockUsageMetrics.featureUsage.map((feature) => ({
      ...feature,
      periodStart,
      periodEnd
    })),
    source: 'mock',
    limitations: [
      'Feature event stream not yet connected — feature adoption metrics are estimated from mock inputs.'
    ]
  }
}
