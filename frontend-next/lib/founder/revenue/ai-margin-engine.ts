/**
 * AI cost and margin engine for Founder Revenue Intelligence.
 */

import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { AiMarginAnalysis } from './revenue-types'

const INFRASTRUCTURE_COST_ESTIMATE_GBP = 120

function warningFromAiShare(share: number | null): {
  level: AiMarginAnalysis['marginWarningLevel']
  label: string
} {
  if (share === null) {
    return { level: 'unavailable', label: 'Margin unavailable — revenue data not connected' }
  }
  if (share >= 15) {
    return { level: 'critical', label: 'AI cost critical — review model routing immediately' }
  }
  if (share >= 8) {
    return { level: 'elevated', label: 'AI cost elevated — monitor model routing' }
  }
  return { level: 'normal', label: 'AI cost within normal operating range' }
}

function recommendations(level: AiMarginAnalysis['marginWarningLevel']): string[] {
  if (level === 'critical') {
    return [
      'Introduce per-provider ORB usage caps before scaling children\'s homes rollout.',
      'Route lower-risk ORB queries to lighter models.',
      'Review standalone tier pricing against current AI cost per active user.'
    ]
  }
  if (level === 'elevated') {
    return [
      'Monitor cost per ORB conversation weekly.',
      'Compare pilot pricing against AI cost per user before expanding trials.'
    ]
  }
  if (level === 'unavailable') {
    return [
      'Connect live billing to calculate gross margin.',
      'AI cost metrics remain available from ORB billing usage where connected.'
    ]
  }
  return ['Continue monitoring unit economics as ORB usage grows across children\'s homes.']
}

export function calculateAiMargin(
  billing: BillingMetrics,
  options?: { revenueAvailable?: boolean; infrastructureCostGbp?: number }
): AiMarginAnalysis {
  const revenueAvailable = options?.revenueAvailable ?? billing.totalMrrGbp > 0
  const infrastructureCost = options?.infrastructureCostGbp ?? INFRASTRUCTURE_COST_ESTIMATE_GBP
  const aiCost = billing.openAiSpendGbp > 0 ? billing.openAiSpendGbp : null
  const limitations: string[] = []

  const costPerConversation =
    billing.totalConversations > 0 && aiCost !== null
      ? Number((aiCost / billing.totalConversations).toFixed(4))
      : null
  const costPerActiveUser =
    billing.totalActiveUsers > 0 && aiCost !== null
      ? Number((aiCost / billing.totalActiveUsers).toFixed(2))
      : null
  const costPerProvider =
    billing.totalProviders > 0 && aiCost !== null
      ? Number((aiCost / billing.totalProviders).toFixed(2))
      : null

  if (!revenueAvailable) {
    limitations.push('Gross margin unavailable — live revenue not connected.')
    const warning = warningFromAiShare(null)
    return {
      totalAiCost: aiCost,
      costPerConversation,
      costPerActiveUser,
      costPerProvider,
      aiCostPercentOfRevenue: null,
      grossMargin: null,
      grossMarginPercent: null,
      marginWarningLevel: warning.level,
      marginWarningLabel: warning.label,
      optimisationRecommendations: recommendations(warning.level),
      limitations
    }
  }

  const mrr = billing.totalMrrGbp
  const totalCosts = (aiCost ?? 0) + infrastructureCost
  const grossMargin = Number((mrr - totalCosts).toFixed(2))
  const grossMarginPercent = mrr > 0 ? Number(((grossMargin / mrr) * 100).toFixed(1)) : null
  const aiShare = mrr > 0 && aiCost !== null ? Number(((aiCost / mrr) * 100).toFixed(1)) : null
  const warning = warningFromAiShare(aiShare)

  return {
    totalAiCost: aiCost,
    costPerConversation,
    costPerActiveUser,
    costPerProvider,
    aiCostPercentOfRevenue: aiShare,
    grossMargin,
    grossMarginPercent,
    marginWarningLevel: warning.level,
    marginWarningLabel: warning.label,
    optimisationRecommendations: recommendations(warning.level),
    limitations
  }
}
