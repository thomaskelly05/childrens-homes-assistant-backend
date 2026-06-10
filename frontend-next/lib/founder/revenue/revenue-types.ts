/**
 * Founder Revenue Intelligence V1 — commercial contracts.
 * Live revenue is never invented; forecasts are clearly labelled assumptions.
 */

export type RevenueDataSource = 'live' | 'estimated' | 'unavailable'

export type RevenueSnapshot = {
  id: string
  periodStart: string
  periodEnd: string
  source: RevenueDataSource
  mrr: number | null
  arr: number | null
  activeSubscriptions: number | null
  trialUsers: number | null
  paidUsers: number | null
  churnedUsers: number | null
  conversionRate: number | null
  churnRate: number | null
  averageRevenuePerUser: number | null
  grossRevenue: number | null
  aiCost: number | null
  infrastructureCost: number | null
  grossMargin: number | null
  grossMarginPercent: number | null
  createdAt: string
  limitations: string[]
}

export type ForecastScenario = 'conservative' | 'base' | 'growth' | 'aggressive'

export type RevenueForecastAssumptions = {
  users: number
  providers: number
  subscriptionPriceGbp: number
  conversionRatePercent: number
  churnRatePercent: number
  aiCostPerUserGbp: number
  infrastructureCostGbp: number
  projections: {
    months3: RevenueForecastProjection
    months6: RevenueForecastProjection
    months12: RevenueForecastProjection
  }
}

export type RevenueForecastProjection = {
  projectedMRR: number
  projectedARR: number
  projectedUsers: number
  projectedProviders: number
  projectedAIcost: number
  projectedGrossMargin: number
}

export type RevenueForecast = {
  id: string
  scenario: ForecastScenario
  assumptions: RevenueForecastAssumptions
  projectedMRR: number
  projectedARR: number
  projectedUsers: number
  projectedProviders: number
  projectedAIcost: number
  projectedGrossMargin: number
  runwayImpact: string
  risks: string[]
  createdAt: string
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected' | 'needs-changes'
  approvalId?: string
  limitations: string[]
}

export type PricingModelStatus = 'active' | 'draft' | 'archived'

export type PricingModel = {
  id: string
  name: string
  pricePerUser: number
  pricePerProvider?: number
  includedUsage: string
  overageModel: string
  targetCustomer: string
  marginNotes: string
  status: PricingModelStatus
  createdAt: string
  updatedAt: string
}

export type RevenueSourceBuildResult = {
  snapshot: RevenueSnapshot
  sourcesConnected: string[]
  unavailableSources: string[]
  limitations: string[]
}

export type AiMarginAnalysis = {
  totalAiCost: number | null
  costPerConversation: number | null
  costPerActiveUser: number | null
  costPerProvider: number | null
  aiCostPercentOfRevenue: number | null
  grossMargin: number | null
  grossMarginPercent: number | null
  marginWarningLevel: 'normal' | 'elevated' | 'critical' | 'unavailable'
  marginWarningLabel: string
  optimisationRecommendations: string[]
  limitations: string[]
}

export type CommercialRisk = {
  id: string
  title: string
  detail: string
  severity: 'low' | 'medium' | 'high'
}

export const FORECAST_SCENARIO_LABELS: Record<ForecastScenario, string> = {
  conservative: 'Conservative',
  base: 'Base',
  growth: 'Growth',
  aggressive: 'Aggressive'
}

export const REVENUE_FORECAST_DISCLAIMER =
  'Forecasts are modelled assumptions, not live results.'
