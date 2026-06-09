import { mockProviderAnalytics } from '@/lib/founder/intelligence/mock-inputs'
import type { FounderAdapterResult, FounderHomesAggregate } from './adapter-types'
import { fetchJson } from './adapter-utils'

type HomesApiResponse = {
  homes?: Array<Record<string, unknown>>
  items?: Array<Record<string, unknown>>
  count?: number
}

export async function fetchHomesAdapter(): Promise<FounderAdapterResult<FounderHomesAggregate>> {
  const payload = await fetchJson<HomesApiResponse>('/api/homes')

  if (!payload) {
    return getHomesAdapterFallback()
  }

  const rows = payload.homes ?? payload.items ?? []
  const totalHomes = payload.count ?? rows.length

  return {
    data: { totalHomes },
    source: 'live',
    limitations:
      totalHomes === 0
        ? ['Homes endpoint reachable but returned no children\'s home records.']
        : ['Home names and addresses are never exposed in founder analytics.']
  }
}

export function getHomesAdapterFallback(): FounderAdapterResult<FounderHomesAggregate> {
  return {
    data: { totalHomes: mockProviderAnalytics.totalHomes },
    source: 'mock',
    limitations: ["Children's home counts unavailable — using mock home totals."]
  }
}
