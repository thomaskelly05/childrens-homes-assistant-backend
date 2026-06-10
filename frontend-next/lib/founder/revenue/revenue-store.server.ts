/**
 * Server-only revenue snapshot assembly for founder API routes.
 */

import 'server-only'

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { calculateAiMargin } from './ai-margin-engine'
import { buildCommercialRisks, buildFinanceRecommendations } from './revenue-risks'
import { buildRevenueSourcesServer } from './revenue-source-builder.server'
import type { RevenueSnapshot } from './revenue-types'

let cachedSnapshot: RevenueSnapshot | null = null
let snapshotCachedAt = 0
const SNAPSHOT_CACHE_MS = 15_000

export async function getRevenueSnapshotServer(
  request: Request,
  options?: { forceRefresh?: boolean }
): Promise<{
  snapshot: RevenueSnapshot
  margin: ReturnType<typeof calculateAiMargin>
  risks: ReturnType<typeof buildCommercialRisks>
  recommendations: string[]
  sourcesConnected: string[]
  unavailableSources: string[]
}> {
  const now = Date.now()
  if (!options?.forceRefresh && cachedSnapshot && now - snapshotCachedAt < SNAPSHOT_CACHE_MS) {
    const billing = getFounderContractInputs().billingMetrics
    const margin = calculateAiMargin(billing, { revenueAvailable: cachedSnapshot.mrr !== null })
    return {
      snapshot: cachedSnapshot,
      margin,
      risks: buildCommercialRisks(cachedSnapshot, margin),
      recommendations: buildFinanceRecommendations(cachedSnapshot, margin),
      sourcesConnected: [],
      unavailableSources: []
    }
  }

  const built = await buildRevenueSourcesServer(request)

  cachedSnapshot = built.snapshot
  snapshotCachedAt = now

  const billing = getFounderContractInputs().billingMetrics
  const margin = calculateAiMargin(billing, { revenueAvailable: built.snapshot.mrr !== null })

  return {
    snapshot: built.snapshot,
    margin,
    risks: buildCommercialRisks(built.snapshot, margin),
    recommendations: buildFinanceRecommendations(built.snapshot, margin),
    sourcesConnected: built.sourcesConnected,
    unavailableSources: built.unavailableSources
  }
}
