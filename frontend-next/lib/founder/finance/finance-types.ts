/**
 * Founder Finance Agent — actuals, estimates, assumptions and projections clearly labelled.
 */

export type FinanceDataLabel = 'actual' | 'estimated' | 'assumed' | 'projected'

export type LabelledValue = {
  value: number | null
  label: FinanceDataLabel
  source: string
  notes?: string
}

export type FinanceCostEntry = {
  id: string
  category: 'hosting' | 'openai_api' | 'email_provider' | 'domain_software' | 'other'
  amountGbp: number
  label: FinanceDataLabel
  description: string
  periodStart: string
  periodEnd: string
  createdAt: string
  createdBy: string
}

export type FinanceManualEntry = FinanceCostEntry

export type FinanceSnapshot = {
  id: string
  createdAt: string
  createdBy: string
  periodLabel: string
  actualRevenue: {
    mrr: number | null
    label: FinanceDataLabel
  }
  estimatedCosts: {
    hosting: number | null
    openAiApi: number | null
    emailProvider: number | null
    domainSoftware: number | null
    label: FinanceDataLabel
  }
  monthlyBurn: number
  monthlyBurnLabel: FinanceDataLabel
  grossMargin: number | null
  grossMarginPercent: number | null
  netPosition: number | null
  runwayMonths: number | null
  breakEvenUsers: number | null
  breakEvenMrr: number | null
  costPerActiveUser: number | null
  costPerEvaluationRun: number | null
  liveLlmTestCostEstimate: number | null
  warnings: string[]
  limitations: string[]
}

export type FinanceForecastInput = {
  monthlyUsers?: number
  pricePerUserGbp?: number
  monthlyBurnGbp?: number
  conversionRatePercent?: number
  aiCostPerUserGbp?: number
}

export type FinanceForecast = {
  id: string
  createdAt: string
  createdBy: string
  assumptions: {
    monthlyUsers: LabelledValue
    pricePerUserGbp: LabelledValue
    monthlyBurnGbp: LabelledValue
    conversionRatePercent: LabelledValue
    aiCostPerUserGbp: LabelledValue
  }
  projectedMrr: LabelledValue
  projectedGrossMargin: LabelledValue
  breakEvenUsers: number | null
  breakEvenMrr: number | null
  pricingSensitivity: Array<{
    priceGbp: number
    usersNeeded: number
    label: FinanceDataLabel
  }>
  limitations: string[]
}

export const FINANCE_DISCLAIMER =
  'Finance figures separate actual revenue from estimates and assumptions. Stripe and cloud billing integrations are placeholders until connected.'
