import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'

import { generateFinanceForecast } from './finance-forecast-engine.ts'
import {
  addCostEntry,
  addFinanceForecast,
  addFinanceSnapshot,
  getCostEntries,
  getFinanceForecasts,
  getLatestFinanceSnapshot
} from './finance-store.ts'
import type { FinanceCostEntry, FinanceForecast, FinanceForecastInput, FinanceSnapshot } from './finance-types.ts'
import { FINANCE_DISCLAIMER } from './finance-types.ts'

const DEFAULT_HOSTING_ESTIMATE = 120
const DEFAULT_OPENAI_ESTIMATE = 80
const DEFAULT_EMAIL_ESTIMATE = 15
const DEFAULT_DOMAIN_ESTIMATE = 25

function sumCostsByCategory(category: FinanceCostEntry['category']): number {
  return getCostEntries()
    .filter((e) => e.category === category)
    .reduce((sum, e) => sum + e.amountGbp, 0)
}

function resolveCost(category: FinanceCostEntry['category'], defaultEstimate: number): number {
  const actual = sumCostsByCategory(category)
  if (actual > 0) return actual
  return defaultEstimate
}

export function createFinanceSnapshot(createdBy: string): FinanceSnapshot {
  const hosting = resolveCost('hosting', DEFAULT_HOSTING_ESTIMATE)
  const openAi = resolveCost('openai_api', DEFAULT_OPENAI_ESTIMATE)
  const email = resolveCost('email_provider', DEFAULT_EMAIL_ESTIMATE)
  const domain = resolveCost('domain_software', DEFAULT_DOMAIN_ESTIMATE)
  const other = sumCostsByCategory('other')

  const monthlyBurn = hosting + openAi + email + domain + other
  const hasManualEntries = getCostEntries().length > 0

  const warnings: string[] = []
  if (!hasManualEntries) {
    warnings.push('Using estimated costs — add manual cost entries for actual figures.')
  }
  if (monthlyBurn > 500) {
    warnings.push('Monthly burn exceeds £500 — review hosting and API usage.')
  }

  const snapshot: FinanceSnapshot = {
    id: `finance-snapshot-${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdBy,
    periodLabel: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    actualRevenue: {
      mrr: null,
      label: 'actual'
    },
    estimatedCosts: {
      hosting,
      openAiApi: openAi,
      emailProvider: email,
      domainSoftware: domain,
      label: hasManualEntries ? 'actual' : 'estimated'
    },
    monthlyBurn,
    monthlyBurnLabel: hasManualEntries ? 'actual' : 'estimated',
    grossMargin: null,
    grossMarginPercent: null,
    netPosition: -monthlyBurn,
    runwayMonths: null,
    breakEvenUsers: calculateBreakEvenUsers(monthlyBurn, 25, 3),
    breakEvenMrr: monthlyBurn,
    costPerActiveUser: null,
    costPerEvaluationRun: 0.05,
    liveLlmTestCostEstimate: 8.0,
    warnings,
    limitations: [FINANCE_DISCLAIMER]
  }

  addFinanceSnapshot(snapshot)

  recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Finance snapshot created. Burn: £${monthlyBurn}/mo (${snapshot.monthlyBurnLabel}).`,
    approvalStatus: 'not_required'
  })

  return snapshot
}

function calculateBreakEvenUsers(monthlyBurn: number, pricePerUser: number, aiCostPerUser: number): number | null {
  const net = pricePerUser - aiCostPerUser
  if (net <= 0) return null
  return Math.ceil(monthlyBurn / net)
}

export function getFinanceSnapshot(): FinanceSnapshot {
  return getLatestFinanceSnapshot() ?? createFinanceSnapshot('system')
}

export function addManualCostEntry(input: {
  category: FinanceCostEntry['category']
  amountGbp: number
  description: string
  label?: FinanceCostEntry['label']
  createdBy: string
  periodStart?: string
  periodEnd?: string
}): FinanceCostEntry {
  const now = new Date()
  const periodStart = input.periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const periodEnd = input.periodEnd ?? now.toISOString()

  const entry = addCostEntry({
    category: input.category,
    amountGbp: input.amountGbp,
    label: input.label ?? 'actual',
    description: input.description,
    periodStart,
    periodEnd,
    createdBy: input.createdBy
  })

  recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Manual cost entry: ${input.category} £${input.amountGbp} (${entry.label}).`,
    approvalStatus: 'not_required'
  })

  return entry
}

export function buildFinanceReport(): {
  snapshot: FinanceSnapshot
  costEntries: FinanceCostEntry[]
  forecasts: FinanceForecast[]
  disclaimer: string
} {
  return {
    snapshot: getFinanceSnapshot(),
    costEntries: getCostEntries(),
    forecasts: getFinanceForecasts(),
    disclaimer: FINANCE_DISCLAIMER
  }
}

export function createFinanceForecast(input: FinanceForecastInput, createdBy: string): FinanceForecast {
  const forecast = generateFinanceForecast(input, createdBy)
  addFinanceForecast(forecast)

  recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Finance forecast created. Break-even: ${forecast.breakEvenUsers ?? '—'} users at assumed pricing.`,
    approvalStatus: 'not_required'
  })

  return forecast
}
