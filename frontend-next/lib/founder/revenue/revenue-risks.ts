/**
 * Commercial risk and recommendation helpers for Founder Revenue Intelligence.
 */

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { hasLiveBillingData } from '@/lib/founder/data/founder-live-availability'
import type { AiMarginAnalysis, CommercialRisk, RevenueSnapshot } from './revenue-types'

export function buildCommercialRisks(
  snapshot: RevenueSnapshot,
  margin: AiMarginAnalysis
): CommercialRisk[] {
  const risks: CommercialRisk[] = []
  const inputs = getFounderContractInputs()
  const billingConnected = hasLiveBillingData(inputs.dataSourceStatus)

  if (!billingConnected || snapshot.source === 'unavailable') {
    risks.push({
      id: 'risk-no-billing',
      title: 'No live billing connected',
      detail: 'Live billing source not connected. Do not quote MRR or paid users externally.',
      severity: 'high'
    })
  }

  if (margin.marginWarningLevel === 'critical' || margin.marginWarningLevel === 'elevated') {
    risks.push({
      id: 'risk-ai-cost',
      title: 'AI cost rising faster than revenue',
      detail: margin.marginWarningLabel,
      severity: margin.marginWarningLevel === 'critical' ? 'high' : 'medium'
    })
  }

  if (snapshot.conversionRate === null) {
    risks.push({
      id: 'risk-conversion',
      title: 'Unclear conversion rate',
      detail: 'Conversion cannot be calculated without connected subscription events.',
      severity: 'medium'
    })
  }

  if (snapshot.paidUsers === null) {
    risks.push({
      id: 'risk-paid-usage',
      title: 'Not enough paid usage data',
      detail: 'Paid user counts are unavailable — do not invent traction.',
      severity: 'medium'
    })
  }

  if (snapshot.churnRate === null) {
    risks.push({
      id: 'risk-churn',
      title: 'Churn cannot be calculated yet',
      detail: 'Subscription history is required before quoting churn.',
      severity: 'low'
    })
  }

  return risks
}

export function buildFinanceRecommendations(
  snapshot: RevenueSnapshot,
  margin: AiMarginAnalysis
): string[] {
  const recommendations = [...margin.optimisationRecommendations]

  if (snapshot.source === 'unavailable') {
    recommendations.unshift('Connect live billing before making external revenue claims.')
  }

  if (snapshot.mrr === null) {
    recommendations.push('Use Revenue Forecast for modelled scenarios — not live traction.')
  }

  recommendations.push('Route external revenue forecasts through Approvals as revenue-claim items.')

  return [...new Set(recommendations)].slice(0, 6)
}
