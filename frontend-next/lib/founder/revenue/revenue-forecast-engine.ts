/**
 * Revenue forecast engine — modelled assumptions only, never live truth.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type {
  ForecastScenario,
  RevenueForecast,
  RevenueForecastAssumptions,
  RevenueForecastProjection
} from './revenue-types'
import { REVENUE_FORECAST_DISCLAIMER } from './revenue-types'

export type ForecastInput = {
  users: number
  providers: number
  subscriptionPriceGbp: number
  conversionRatePercent?: number
  churnRatePercent?: number
  aiCostPerUserGbp?: number
  infrastructureCostGbp?: number
}

const SCENARIO_MULTIPLIERS: Record<
  ForecastScenario,
  { userGrowth: number; conversionBoost: number; churnReduction: number; label: string }
> = {
  conservative: { userGrowth: 0.04, conversionBoost: -2, churnReduction: 1, label: 'Conservative' },
  base: { userGrowth: 0.08, conversionBoost: 0, churnReduction: 0, label: 'Base' },
  growth: { userGrowth: 0.14, conversionBoost: 3, churnReduction: -0.5, label: 'Growth' },
  aggressive: { userGrowth: 0.22, conversionBoost: 6, churnReduction: -1, label: 'Aggressive' }
}

function projectAtMonth(
  input: ForecastInput,
  scenario: ForecastScenario,
  months: number
): RevenueForecastProjection {
  const mult = SCENARIO_MULTIPLIERS[scenario]
  const conversion = Math.max(1, (input.conversionRatePercent ?? 8) + mult.conversionBoost)
  const churn = Math.max(0.5, (input.churnRatePercent ?? 4) + mult.churnReduction)
  const aiCostPerUser = input.aiCostPerUserGbp ?? 1.2
  const infrastructure = input.infrastructureCostGbp ?? 120

  const growthFactor = 1 + mult.userGrowth * (months / 12)
  const projectedUsers = Math.round(input.users * growthFactor)
  const projectedProviders = Math.max(1, Math.round(input.providers * (1 + mult.userGrowth * 0.5 * (months / 12))))
  const payingUsers = Math.round(projectedUsers * (conversion / 100))
  const projectedMRR = Number((payingUsers * input.subscriptionPriceGbp).toFixed(2))
  const projectedARR = Number((projectedMRR * 12).toFixed(2))
  const projectedAIcost = Number((payingUsers * aiCostPerUser + infrastructure).toFixed(2))
  const projectedGrossMargin = Number((projectedMRR - projectedAIcost).toFixed(2))

  void churn

  return {
    projectedMRR,
    projectedARR,
    projectedUsers,
    projectedProviders,
    projectedAIcost,
    projectedGrossMargin
  }
}

function buildAssumptions(input: ForecastInput, scenario: ForecastScenario): RevenueForecastAssumptions {
  const mult = SCENARIO_MULTIPLIERS[scenario]
  return {
    users: input.users,
    providers: input.providers,
    subscriptionPriceGbp: input.subscriptionPriceGbp,
    conversionRatePercent: Math.max(1, (input.conversionRatePercent ?? 8) + mult.conversionBoost),
    churnRatePercent: Math.max(0.5, (input.churnRatePercent ?? 4) + mult.churnReduction),
    aiCostPerUserGbp: input.aiCostPerUserGbp ?? 1.2,
    infrastructureCostGbp: input.infrastructureCostGbp ?? 120,
    projections: {
      months3: projectAtMonth(input, scenario, 3),
      months6: projectAtMonth(input, scenario, 6),
      months12: projectAtMonth(input, scenario, 12)
    }
  }
}

function scenarioRisks(scenario: ForecastScenario): string[] {
  const common = [
    REVENUE_FORECAST_DISCLAIMER,
    'Children\'s homes procurement cycles may delay provider licence uptake.',
    'Ofsted readiness value must not be overstated without live traction evidence.'
  ]
  if (scenario === 'aggressive') {
    return [
      ...common,
      'Aggressive scenario assumes faster conversion than current live data supports.',
      'AI cost may rise faster than revenue without model routing controls.'
    ]
  }
  if (scenario === 'conservative') {
    return [...common, 'Conservative scenario may understate pilot conversion in engaged children\'s homes.']
  }
  return common
}

function runwayImpact(projection: RevenueForecastProjection, scenario: ForecastScenario): string {
  if (projection.projectedGrossMargin <= 0) {
    return `${SCENARIO_MULTIPLIERS[scenario].label} scenario remains cost-negative at 12 months — extend runway planning.`
  }
  return `${SCENARIO_MULTIPLIERS[scenario].label} scenario projects positive gross margin by month 12 if assumptions hold.`
}

export function generateRevenueForecastScenario(
  scenario: ForecastScenario,
  input: ForecastInput
): RevenueForecast {
  const assumptions = buildAssumptions(input, scenario)
  const projection = assumptions.projections.months12

  return {
    id: nextId('rev-forecast'),
    scenario,
    assumptions,
    projectedMRR: projection.projectedMRR,
    projectedARR: projection.projectedARR,
    projectedUsers: projection.projectedUsers,
    projectedProviders: projection.projectedProviders,
    projectedAIcost: projection.projectedAIcost,
    projectedGrossMargin: projection.projectedGrossMargin,
    runwayImpact: runwayImpact(projection, scenario),
    risks: scenarioRisks(scenario),
    createdAt: new Date().toISOString(),
    approvalStatus: 'draft',
    limitations: [REVENUE_FORECAST_DISCLAIMER, 'Not for external use without founder approval.']
  }
}

export function generateAllRevenueForecastScenarios(input: ForecastInput): RevenueForecast[] {
  const scenarios: ForecastScenario[] = ['conservative', 'base', 'growth', 'aggressive']
  return scenarios.map((scenario) => generateRevenueForecastScenario(scenario, input))
}

export function projectMrrAtUsers(users: number, priceGbp: number, conversionPercent = 8): number {
  return Number((Math.round(users * (conversionPercent / 100)) * priceGbp).toFixed(2))
}

export function projectArrAtUsers(users: number, priceGbp: number, conversionPercent = 8): number {
  return Number((projectMrrAtUsers(users, priceGbp, conversionPercent) * 12).toFixed(2))
}

export function marginAtPricePerUser(
  priceGbp: number,
  aiCostPerUserGbp: number,
  infrastructureGbp = 120
): { marginPercent: number; note: string } {
  const margin = priceGbp - aiCostPerUserGbp - infrastructureGbp / 100
  const marginPercent = priceGbp > 0 ? Number(((margin / priceGbp) * 100).toFixed(1)) : 0
  return {
    marginPercent,
    note:
      marginPercent > 0
        ? `At £${priceGbp.toFixed(2)} per user, estimated margin is ${marginPercent}% before support costs.`
        : `At £${priceGbp.toFixed(2)} per user, margin is negative before scaling efficiencies.`
  }
}
