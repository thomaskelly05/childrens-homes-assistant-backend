import type { FinanceForecast, FinanceForecastInput, LabelledValue } from './finance-types.ts'

function labelled(value: number | null, label: LabelledValue['label'], source: string): LabelledValue {
  return { value, label, source }
}

export function calculateBreakEvenUsers(monthlyBurn: number, pricePerUser: number, aiCostPerUser: number): number | null {
  if (pricePerUser <= 0) return null
  const netPerUser = pricePerUser - aiCostPerUser
  if (netPerUser <= 0) return null
  return Math.ceil(monthlyBurn / netPerUser)
}

export function calculateBreakEvenMrr(monthlyBurn: number): number {
  return monthlyBurn
}

export function buildPricingSensitivity(
  monthlyBurn: number,
  aiCostPerUser: number,
  prices: number[] = [15, 25, 35, 50, 75]
): FinanceForecast['pricingSensitivity'] {
  return prices.map((priceGbp) => ({
    priceGbp,
    usersNeeded: calculateBreakEvenUsers(monthlyBurn, priceGbp, aiCostPerUser) ?? 0,
    label: 'projected' as const
  }))
}

export function generateFinanceForecast(
  input: FinanceForecastInput,
  createdBy: string
): FinanceForecast {
  const monthlyUsers = input.monthlyUsers ?? 0
  const pricePerUser = input.pricePerUserGbp ?? 25
  const monthlyBurn = input.monthlyBurnGbp ?? 500
  const conversionRate = input.conversionRatePercent ?? 5
  const aiCostPerUser = input.aiCostPerUserGbp ?? 3

  const projectedMrr = monthlyUsers * pricePerUser * (conversionRate / 100)
  const projectedAiCost = monthlyUsers * aiCostPerUser * (conversionRate / 100)
  const projectedGrossMargin = projectedMrr - projectedAiCost - monthlyBurn * 0.3

  const breakEvenUsers = calculateBreakEvenUsers(monthlyBurn, pricePerUser, aiCostPerUser)
  const breakEvenMrr = calculateBreakEvenMrr(monthlyBurn)

  return {
    id: `finance-forecast-${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdBy,
    assumptions: {
      monthlyUsers: labelled(monthlyUsers, input.monthlyUsers !== undefined ? 'assumed' : 'assumed', 'founder input'),
      pricePerUserGbp: labelled(pricePerUser, input.pricePerUserGbp !== undefined ? 'assumed' : 'assumed', 'pricing model'),
      monthlyBurnGbp: labelled(monthlyBurn, input.monthlyBurnGbp !== undefined ? 'estimated' : 'estimated', 'cost entries'),
      conversionRatePercent: labelled(conversionRate, 'assumed', 'founder assumption'),
      aiCostPerUserGbp: labelled(aiCostPerUser, 'estimated', 'usage estimate')
    },
    projectedMrr: labelled(Math.round(projectedMrr * 100) / 100, 'projected', 'forecast model'),
    projectedGrossMargin: labelled(Math.round(projectedGrossMargin * 100) / 100, 'projected', 'forecast model'),
    breakEvenUsers,
    breakEvenMrr,
    pricingSensitivity: buildPricingSensitivity(monthlyBurn, aiCostPerUser),
    limitations: [
      'Projections use founder assumptions — not live Stripe data.',
      'Break-even excludes one-off costs and tax.',
      'AI cost per user is estimated until usage integration is connected.'
    ]
  }
}
