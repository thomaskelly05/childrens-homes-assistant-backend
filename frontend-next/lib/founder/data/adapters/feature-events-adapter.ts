import { isFounderMockFallbackAllowed } from '@/lib/founder/data/founder-data-mode'
import { mockUsageMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { FeatureUsageMetric } from '@/lib/founder/contracts/usage-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { getFeatureEventsAdapterUnavailable } from './adapter-unavailable'
import { currentPeriodBounds } from './adapter-utils'

/**
 * Feature usage events adapter.
 * TODO: Connect to platform analytics event stream when a founder-safe aggregate endpoint exists.
 */
export async function fetchFeatureEventsAdapter(): Promise<FounderAdapterResult<FeatureUsageMetric[]>> {
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
