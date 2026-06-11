/**
 * Shared revenue snapshot builders — safe for client and server bundles.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { RevenueDataSource, RevenueSnapshot } from './revenue-types'

const INFRASTRUCTURE_COST_ESTIMATE_GBP = 120

function snapshotSource(
  billingConnected: boolean,
  hasEstimatedFields: boolean
): RevenueDataSource {
  if (!billingConnected) return 'unavailable'
  if (hasEstimatedFields) return 'estimated'
  return 'live'
}

function aiCostAvailable(aiCost: number | null): aiCost is number {
  return aiCost !== null && aiCost >= 0
}

export function buildSnapshotFromInputs(input: {
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
