/**
 * AI Cost Engine — calculates unit economics and margin estimates.
 * Designed for easy connection to real billing data later.
 */

import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'

export type UsageWarningLevel = 'normal' | 'elevated' | 'critical'

export type AiCostIntelligence = {
  openAiSpend: string
  costPerUser: string
  costPerProvider: string
  costPerConversation: string
  revenuePerProvider: string
  grossMargin: string
  usageWarning: UsageWarningLevel
  usageWarningLabel: string
  raw: {
    openAiSpendGbp: number
    costPerUserGbp: number
    costPerProviderGbp: number
    costPerConversationGbp: number
    revenuePerProviderGbp: number
    grossMarginPercent: number
  }
}

function formatGbp(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: amount < 10 ? 2 : 0, maximumFractionDigits: 2 })}`
}

function determineUsageWarning(metrics: BillingMetrics): { level: UsageWarningLevel; label: string } {
  const aiCostShare = metrics.totalMrrGbp > 0 ? (metrics.openAiSpendGbp / metrics.totalMrrGbp) * 100 : 0

  if (aiCostShare >= 15) {
    return { level: 'critical', label: 'Usage critical — review model routing immediately' }
  }
  if (aiCostShare >= 8) {
    return { level: 'elevated', label: 'Usage elevated — monitor model routing' }
  }
  return { level: 'normal', label: 'Usage within normal operating range' }
}

export function calculateAiCost(metrics: BillingMetrics): AiCostIntelligence {
  const revenuePerProvider = metrics.totalProviders > 0 ? metrics.totalMrrGbp / metrics.totalProviders : 0
  const warning = determineUsageWarning(metrics)

  return {
    openAiSpend: formatGbp(metrics.openAiSpendGbp),
    costPerUser: formatGbp(metrics.costPerUserGbp),
    costPerProvider: formatGbp(metrics.costPerProviderGbp),
    costPerConversation: formatGbp(metrics.costPerConversationGbp),
    revenuePerProvider: formatGbp(revenuePerProvider),
    grossMargin: `${metrics.grossMarginPercent.toFixed(1)}%`,
    usageWarning: warning.level,
    usageWarningLabel: warning.label,
    raw: {
      openAiSpendGbp: metrics.openAiSpendGbp,
      costPerUserGbp: metrics.costPerUserGbp,
      costPerProviderGbp: metrics.costPerProviderGbp,
      costPerConversationGbp: metrics.costPerConversationGbp,
      revenuePerProviderGbp: revenuePerProvider,
      grossMarginPercent: metrics.grossMarginPercent
    }
  }
}
