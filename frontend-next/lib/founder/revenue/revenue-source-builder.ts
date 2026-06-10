/**
 * Gathers safe revenue data from live founder sources.
 * Never presents estimated data as live truth.
 */

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { hasLiveBillingData } from '@/lib/founder/data/founder-live-availability'
import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { getActiveRelationships } from '@/lib/founder/relationships/relationship-store'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { calculateAiMargin } from './ai-margin-engine'
import {
  billingMetricsFromServerContext,
  buildServerRevenueContext,
  type ServerRevenueContext
} from './revenue-server-context'
import type { RevenueDataSource, RevenueSnapshot, RevenueSourceBuildResult } from './revenue-types'
import { DEFAULT_PRICING_MODELS } from './revenue-defaults'

const INFRASTRUCTURE_COST_ESTIMATE_GBP = 120

function snapshotSource(
  billingConnected: boolean,
  hasEstimatedFields: boolean
): RevenueDataSource {
  if (!billingConnected) return 'unavailable'
  if (hasEstimatedFields) return 'estimated'
  return 'live'
}

function buildSnapshotFromInputs(input: {
  periodStart: string
  periodEnd: string
  billingConnected: boolean
  mrr: number | null
  activeUsers: number
  paidUsers: number | null
  trialUsers: number | null
  activeSubscriptions: number | null
  churnedUsers: number | null
  conversionRate: number | null
  churnRate: number | null
  aiCost: number | null
  limitations: string[]
}): RevenueSnapshot {
  const hasEstimatedFields = input.limitations.some((l) => /estimated/i.test(l))
  const source = snapshotSource(input.billingConnected, hasEstimatedFields)
  const mrr = source === 'unavailable' ? null : input.mrr
  const arr = mrr !== null ? Number((mrr * 12).toFixed(2)) : null
  const arpu =
    mrr !== null && input.paidUsers && input.paidUsers > 0
      ? Number((mrr / input.paidUsers).toFixed(2))
      : null
  const grossRevenue = mrr
  const infrastructureCost = aiCostAvailable(input.aiCost) ? INFRASTRUCTURE_COST_ESTIMATE_GBP : null
  const grossMargin =
    mrr !== null && input.aiCost !== null
      ? Number((mrr - input.aiCost - (infrastructureCost ?? 0)).toFixed(2))
      : null
  const grossMarginPercent =
    mrr !== null && mrr > 0 && grossMargin !== null ? Number(((grossMargin / mrr) * 100).toFixed(1)) : null

  return {
    id: nextId('rev-snap'),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    source,
    mrr,
    arr,
    activeSubscriptions: source === 'unavailable' ? null : input.activeSubscriptions,
    trialUsers: source === 'unavailable' ? null : input.trialUsers,
    paidUsers: source === 'unavailable' ? null : input.paidUsers,
    churnedUsers: source === 'unavailable' ? null : input.churnedUsers,
    conversionRate: source === 'unavailable' ? null : input.conversionRate,
    churnRate: source === 'unavailable' ? null : input.churnRate,
    averageRevenuePerUser: source === 'unavailable' ? null : arpu,
    grossRevenue,
    aiCost: input.aiCost,
    infrastructureCost,
    grossMargin: source === 'unavailable' ? null : grossMargin,
    grossMarginPercent: source === 'unavailable' ? null : grossMarginPercent,
    createdAt: new Date().toISOString(),
    limitations: [...new Set(input.limitations)]
  }
}

function aiCostAvailable(aiCost: number | null): aiCost is number {
  return aiCost !== null && aiCost >= 0
}

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

export async function buildRevenueSourcesServer(request?: Request): Promise<RevenueSourceBuildResult> {
  const ctx = await buildServerRevenueContext(request)
  const billing = billingMetricsFromServerContext(ctx)
  const limitations = [...ctx.limitations]
  const sourcesConnected: string[] = []
  const unavailableSources: string[] = []

  if (ctx.billingConnected) sourcesConnected.push('orb-billing-usage')
  else unavailableSources.push('billing')

  if (ctx.providerAnalytics.totalProviders > 0) sourcesConnected.push('providers')
  else unavailableSources.push('providers')

  if (ctx.telemetrySummary.totalEvents > 0) sourcesConnected.push('founder-telemetry')
  else unavailableSources.push('telemetry')

  const mrrLive = ctx.providerAnalytics.totalMrr > 0 ? ctx.providerAnalytics.totalMrr : null
  const aiCost =
    billing.openAiSpendGbp > 0 ? billing.openAiSpendGbp : ctx.telemetrySummary.aiCostsGbp > 0 ? ctx.telemetrySummary.aiCostsGbp : null

  if (!ctx.billingConnected) limitations.push('Live billing source not connected.')
  if (mrrLive === null) limitations.push('MRR requires a live billing rollup — not yet connected.')
  limitations.push('Churn cannot be calculated yet without subscription history.')

  const margin = calculateAiMargin(billing, { revenueAvailable: mrrLive !== null })
  limitations.push(...margin.limitations)

  const snapshot = buildSnapshotFromInputs({
    periodStart: billing.periodStart,
    periodEnd: billing.periodEnd,
    billingConnected: ctx.billingConnected && mrrLive !== null,
    mrr: mrrLive,
    activeUsers: billing.totalActiveUsers,
    paidUsers: billing.totalActiveUsers > 0 ? billing.totalActiveUsers : null,
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

export function buildRevenueSourcesFromServerContext(ctx: ServerRevenueContext): RevenueSourceBuildResult {
  const billing = billingMetricsFromServerContext(ctx)
  const limitations = [...ctx.limitations]
  const mrrLive = ctx.providerAnalytics.totalMrr > 0 ? ctx.providerAnalytics.totalMrr : null
  const aiCost =
    billing.openAiSpendGbp > 0 ? billing.openAiSpendGbp : ctx.telemetrySummary.aiCostsGbp > 0 ? ctx.telemetrySummary.aiCostsGbp : null

  const snapshot = buildSnapshotFromInputs({
    periodStart: billing.periodStart,
    periodEnd: billing.periodEnd,
    billingConnected: ctx.billingConnected && mrrLive !== null,
    mrr: mrrLive,
    activeUsers: billing.totalActiveUsers,
    paidUsers: billing.totalActiveUsers > 0 ? billing.totalActiveUsers : null,
    trialUsers: null,
    activeSubscriptions: null,
    churnedUsers: null,
    conversionRate: null,
    churnRate: null,
    aiCost,
    limitations
  })

  return {
    snapshot,
    sourcesConnected: ctx.billingConnected ? ['orb-billing-usage'] : [],
    unavailableSources: ctx.billingConnected ? [] : ['billing'],
    limitations: snapshot.limitations
  }
}
