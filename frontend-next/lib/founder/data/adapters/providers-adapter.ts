import { mockProviderAnalytics } from '@/lib/founder/intelligence/mock-inputs'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { FounderAdapterResult } from './adapter-types'
import { anonymiseProviderLabel, currentPeriodBounds, fetchJson } from './adapter-utils'

type ProvidersApiResponse = {
  providers?: Array<Record<string, unknown>>
  items?: Array<Record<string, unknown>>
  count?: number
}

export async function fetchProvidersAdapter(): Promise<FounderAdapterResult<ProviderAnalytics>> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  const payload = await fetchJson<ProvidersApiResponse>('/api/providers')

  if (!payload) {
    return getProvidersAdapterFallback()
  }

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
    providerName: anonymiseProviderLabel(index),
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
      totalMrr: mockProviderAnalytics.totalMrr,
      mrrTrendPercent: mockProviderAnalytics.mrrTrendPercent,
      providers
    },
    source: 'live',
    limitations: [
      'Provider names anonymised. Per-provider MRR and activity metrics still estimated until billing rollups are connected.'
    ]
  }
}

export function getProvidersAdapterFallback(): FounderAdapterResult<ProviderAnalytics> {
  const anonymisedProviders = mockProviderAnalytics.providers.map((provider, index) => ({
    ...provider,
    providerName: anonymiseProviderLabel(index)
  }))

  return {
    data: {
      ...mockProviderAnalytics,
      providers: anonymisedProviders
    },
    source: 'mock',
    limitations: ['Provider analytics unavailable — using mock provider aggregates.']
  }
}
