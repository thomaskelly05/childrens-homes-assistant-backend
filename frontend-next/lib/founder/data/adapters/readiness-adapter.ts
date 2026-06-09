import type { InspectionReadinessDashboard } from '@/lib/os-api/inspection-readiness'
import { mockReadinessMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { FounderAdapterResult } from './adapter-types'
import { anonymiseHomeLabel, currentPeriodBounds, fetchJson } from './adapter-utils'

export async function fetchReadinessAdapter(): Promise<FounderAdapterResult<ReadinessMetrics>> {
  const dashboard = await fetchJson<InspectionReadinessDashboard>('/api/inspection-readiness/dashboard')

  if (!dashboard) {
    return getReadinessAdapterFallback()
  }

  const { periodEnd } = currentPeriodBounds()
  const commonGaps = (dashboard.key_gaps ?? []).map((gap) => ({
    gap: gap.title,
    frequency: gap.risk === 'urgent' ? 3 : gap.risk === 'high' ? 2 : 1
  }))

  const gapTitles = commonGaps.map((g) => g.gap)
  const platformAverageScore =
    gapTitles.length === 0
      ? mockReadinessMetrics.platformAverageScore
      : Math.max(55, 100 - gapTitles.length * 4)

  const homes = mockReadinessMetrics.homes.map((home, index) => ({
    ...home,
    homeName: anonymiseHomeLabel(index),
    gaps: gapTitles.slice(0, 3)
  }))

  return {
    data: {
      assessedAt: dashboard.generated_at ?? periodEnd,
      platformAverageScore,
      commonGaps: commonGaps.length
        ? commonGaps
        : mockReadinessMetrics.commonGaps,
      homes
    },
    source: 'live',
    limitations: [
      'Readiness scores synthesised from inspection gap counts — home-level names anonymised.',
      'Per-home category scores retained from mock structure until live readiness rollups exist.'
    ]
  }
}

export function getReadinessAdapterFallback(): FounderAdapterResult<ReadinessMetrics> {
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
    limitations: ['Inspection readiness feed unavailable — using mock readiness metrics.']
  }
}
