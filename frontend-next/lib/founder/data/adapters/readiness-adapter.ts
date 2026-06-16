import type { InspectionReadinessDashboard } from '@/lib/os-api/inspection-readiness'
import { isFounderMockFallbackAllowed } from '@/lib/founder/data/founder-data-mode'
import { mockReadinessMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { getReadinessAdapterUnavailable } from './adapter-unavailable'
import { anonymiseHomeLabel, currentPeriodBounds, fetchFounderLiveJson } from './adapter-utils'

export async function fetchReadinessAdapter(): Promise<FounderAdapterResult<ReadinessMetrics>> {
  const dashboard = await fetchFounderLiveJson<InspectionReadinessDashboard>('inspection evidence preparation')

  if (!dashboard) {
    return isFounderMockFallbackAllowed() ? getReadinessAdapterFallback() : getReadinessAdapterUnavailable()
  }

  const { periodEnd } = currentPeriodBounds()
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

export function getReadinessAdapterFallback(): FounderAdapterResult<ReadinessMetrics> {
  if (!isFounderMockFallbackAllowed()) return getReadinessAdapterUnavailable()

  const homes = mockReadinessMetrics.homes.map((home, index) => ({
    ...home,
    homeName: anonymiseHomeLabel(index)
  }))

  return {
    data: {
      ...mockReadinessMetrics,
      homes
    },
    source: 'mock',
    limitations: ['Inspection evidence preparation feed unavailable — using mock readiness metrics.']
  }
}
