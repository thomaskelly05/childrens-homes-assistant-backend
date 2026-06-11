/**
 * Server-only revenue source builder — uses next/headers via revenue-server-context.
 */

import 'server-only'

import { calculateAiMargin } from './ai-margin-engine'
import { buildSnapshotFromInputs } from './revenue-snapshot-utils'
import {
  billingMetricsFromServerContext,
  buildServerRevenueContext,
  type ServerRevenueContext
} from './revenue-server-context'
import type { RevenueSourceBuildResult } from './revenue-types'

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
