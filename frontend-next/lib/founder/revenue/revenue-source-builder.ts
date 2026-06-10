/**
 * Gathers safe revenue data from live founder sources (client-safe).
 * Never presents estimated data as live truth.
 */

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { hasLiveBillingData } from '@/lib/founder/data/founder-live-availability'
import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { getActiveRelationships } from '@/lib/founder/relationships/relationship-store'
import { calculateAiMargin } from './ai-margin-engine'
import { buildSnapshotFromInputs } from './revenue-snapshot-utils'
import type { RevenueSourceBuildResult } from './revenue-types'
import { DEFAULT_PRICING_MODELS } from './revenue-defaults'

function clientBuild(): RevenueSourceBuildResult {
  const inputs = getFounderContractInputs()
  const telemetry = getFounderTelemetrySummary()
  const memory = getFounderStrategicContext()
  const limitations: string[] = []
  const sourcesConnected: string[] = []
  const unavailableSources: string[] = []

  const billingConnected = hasLiveBillingData(inputs.dataSourceStatus)
  if (billingConnected) sourcesConnected.push('orb-billing-usage')
  else unavailableSources.push('billing')

  if (inputs.dataSourceStatus.sourceConnections.providers === 'connected') {
    sourcesConnected.push('providers')
  } else {
    unavailableSources.push('providers')
  }

  if (telemetry.totalEvents > 0) sourcesConnected.push('founder-telemetry')
  else unavailableSources.push('telemetry')

  if (memory.activeMemoryCount > 0) sourcesConnected.push('founder-memory')
  if (DEFAULT_PRICING_MODELS.length > 0) sourcesConnected.push('pricing-memory')
  if (getActiveRelationships().length > 0) sourcesConnected.push('relationships')

  const aiCost =
    inputs.billingMetrics.openAiSpendGbp > 0 ? inputs.billingMetrics.openAiSpendGbp : telemetry.aiCostsGbp > 0 ? telemetry.aiCostsGbp : null

  if (!billingConnected) {
    limitations.push('Live billing source not connected.')
  }

  const mrrLive = inputs.providerAnalytics.totalMrr > 0 ? inputs.providerAnalytics.totalMrr : null
  if (mrrLive === null && billingConnected) {
    limitations.push('MRR requires a live billing rollup — not yet connected.')
  }

  const paidUsers =
    inputs.billingMetrics.totalActiveUsers > 0 ? inputs.billingMetrics.totalActiveUsers : null
  if (paidUsers === null) {
    limitations.push('Paid user count not available from billing — do not invent paid users.')
  }

  limitations.push('Churn cannot be calculated yet without subscription history.')
  limitations.push('Conversion rate requires connected subscription events.')

  const margin = calculateAiMargin(inputs.billingMetrics, {
    revenueAvailable: mrrLive !== null
  })
  limitations.push(...margin.limitations)

  const snapshot = buildSnapshotFromInputs({
    periodStart: inputs.billingMetrics.periodStart,
    periodEnd: inputs.billingMetrics.periodEnd,
    billingConnected: billingConnected && mrrLive !== null,
    mrr: mrrLive,
    activeUsers: inputs.usageMetrics.activeUsers,
    paidUsers,
    trialUsers: null,
    activeSubscriptions: null,
    churnedUsers: null,
    conversionRate: null,
    churnRate: null,
    aiCost,
    limitations
  })

  return { snapshot, sourcesConnected, unavailableSources, limitations: snapshot.limitations }
}

export function buildRevenueSources(): RevenueSourceBuildResult {
  return clientBuild()
}
