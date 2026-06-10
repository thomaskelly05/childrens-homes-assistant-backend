/**
 * ORB Founder — revenue intelligence answers.
 * Distinguishes live data from forecast assumptions; never invents MRR.
 */

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { hasLiveBillingData } from '@/lib/founder/data/founder-live-availability'
import { calculateAiMargin } from '@/lib/founder/revenue/ai-margin-engine'
import {
  generateRevenueForecastScenario,
  marginAtPricePerUser,
  projectArrAtUsers,
  projectMrrAtUsers
} from '@/lib/founder/revenue/revenue-forecast-engine'
import { buildRevenueSources } from '@/lib/founder/revenue/revenue-source-builder'
import { getPricingModels } from '@/lib/founder/revenue/revenue-store'
import { REVENUE_FORECAST_DISCLAIMER } from '@/lib/founder/revenue/revenue-types'
import type { FounderOrbAnswer } from './orb-founder-engine'

function noBillingAnswer(): FounderOrbAnswer {
  return {
    answer:
      'Live billing is not connected, so I cannot state MRR, paid users or churn. AI cost may still be available from ORB billing usage. Use Revenue Intelligence at /founder/revenue for an honest commercial snapshot.',
    usedSources: ['Revenue Intelligence', 'ORB Billing Usage'],
    suggestedFollowUps: [
      'What revenue data is live and what is missing?',
      'What is our AI cost risk?',
      'Build a conservative revenue forecast'
    ],
    confidence: 'high'
  }
}

export function matchesRevenueQuestion(question: string): boolean {
  return /revenue|mrr|arr|margin|pricing|subscription|billing|commercial|investor.*revenue|charge per|forecast/i.test(
    question
  )
}

export function answerRevenueQuestion(question: string): FounderOrbAnswer | null {
  const q = question.trim().toLowerCase()

  const built = buildRevenueSources()
  const inputs = getFounderContractInputs()
  const billingConnected = hasLiveBillingData(inputs.dataSourceStatus)
  const margin = calculateAiMargin(inputs.billingMetrics, {
    revenueAvailable: built.snapshot.mrr !== null
  })

  if (/what is our current revenue position|current revenue position|revenue position/.test(q)) {
    if (!billingConnected || built.snapshot.mrr === null) return noBillingAnswer()
    return {
      answer: `Live MRR is £${built.snapshot.mrr?.toLocaleString('en-GB')} with ARR £${built.snapshot.arr?.toLocaleString('en-GB')}. AI cost this period is ${built.snapshot.aiCost !== null ? `£${built.snapshot.aiCost.toFixed(2)}` : 'unavailable'}. Gross margin is ${built.snapshot.grossMarginPercent !== null ? `${built.snapshot.grossMarginPercent}%` : 'unavailable'}.`,
      usedSources: ['Revenue Intelligence', 'Live Billing'],
      suggestedFollowUps: ['What is our AI cost risk?', 'What revenue data is live and what is missing?'],
      confidence: 'high'
    }
  }

  if (/what revenue data is live|revenue data.*missing|what.*missing/.test(q)) {
    const connected = built.sourcesConnected.length > 0 ? built.sourcesConnected.join(', ') : 'none'
    const missing = built.unavailableSources.length > 0 ? built.unavailableSources.join(', ') : 'none listed'
    return {
      answer: `Connected revenue sources: ${connected}. Missing or unavailable: ${missing}. Limitations: ${built.limitations.slice(0, 3).join(' ')}`,
      usedSources: ['Revenue Intelligence'],
      suggestedFollowUps: ['What is our AI cost risk?', 'Build a conservative revenue forecast'],
      confidence: 'high'
    }
  }

  if (/ai cost risk|margin risk/.test(q)) {
    return {
      answer: `${margin.marginWarningLabel}. AI spend: ${margin.totalAiCost !== null ? `£${margin.totalAiCost.toFixed(2)}` : 'unavailable'}. Cost per conversation: ${margin.costPerConversation !== null ? `£${margin.costPerConversation.toFixed(2)}` : 'unavailable'}. ${margin.grossMarginPercent !== null ? `Gross margin ${margin.grossMarginPercent}%.` : 'Gross margin unavailable without live revenue.'}`,
      usedSources: ['AI Cost Engine', 'Revenue Intelligence'],
      suggestedFollowUps: ['What is our current revenue position?', 'What would MRR look like at 100 users?'],
      confidence: margin.totalAiCost !== null ? 'high' : 'medium'
    }
  }

  if (/mrr.*100 users|100 users/.test(q)) {
    const price = getPricingModels()[0]?.pricePerUser ?? 9.99
    const mrr = projectMrrAtUsers(100, price)
    return {
      answer: `${REVENUE_FORECAST_DISCLAIMER} At 100 users and £${price.toFixed(2)} per user with 8% conversion, modelled MRR would be £${mrr.toLocaleString('en-GB')} — not live traction.`,
      usedSources: ['Revenue Forecast Engine', 'Pricing Models'],
      suggestedFollowUps: ['What would ARR look like at 500 users?', 'Build a conservative revenue forecast'],
      confidence: 'medium'
    }
  }

  if (/arr.*500 users|500 users/.test(q)) {
    const price = getPricingModels()[0]?.pricePerUser ?? 9.99
    const arr = projectArrAtUsers(500, price)
    return {
      answer: `${REVENUE_FORECAST_DISCLAIMER} At 500 users and £${price.toFixed(2)} per user with 8% conversion, modelled ARR would be £${arr.toLocaleString('en-GB')} — assumptions only.`,
      usedSources: ['Revenue Forecast Engine'],
      suggestedFollowUps: ['What margin do we have at £9.99 per user?', 'What revenue assumptions are unsafe?'],
      confidence: 'medium'
    }
  }

  if (/£9\.99|9\.99 per user|margin.*9\.99/.test(q)) {
    const result = marginAtPricePerUser(9.99, margin.costPerActiveUser ?? 1.2)
    return {
      answer: `${result.note} ${REVENUE_FORECAST_DISCLAIMER}`,
      usedSources: ['AI Margin Engine', 'Pricing Models'],
      suggestedFollowUps: ['Should we charge per user or per provider?', 'What is our AI cost risk?'],
      confidence: 'medium'
    }
  }

  if (/per user or per provider|charge per user|charge per provider/.test(q)) {
    const models = getPricingModels()
    const individual = models.find((m) => m.id === 'pricing-orb-individual')
    const provider = models.find((m) => m.id === 'pricing-provider-licence')
    return {
      answer: `For individual practitioners in children's homes, per-user ORB pricing (£${individual?.pricePerUser.toFixed(2) ?? '9.99'}) is simpler. For registered providers with multiple homes, provider licence (£${provider?.pricePerProvider ?? 299}/provider) improves ARPU and aligns with Ofsted oversight workflows. Compare AI cost per user vs per provider before scaling.`,
      usedSources: ['Pricing Models', 'Finance and AI Cost Agent'],
      suggestedFollowUps: ['What margin do we have at £9.99 per user?', 'What revenue assumptions are unsafe?'],
      confidence: 'medium'
    }
  }

  if (/unsafe.*assumption|revenue assumptions/.test(q)) {
    return {
      answer: `Unsafe assumptions include: inventing paid users, quoting MRR without live billing, presenting forecasts as traction, and stating churn without subscription history. Current limitations: ${built.limitations.slice(0, 4).join(' ')}`,
      usedSources: ['Revenue Intelligence', 'Data Protection and Safety'],
      suggestedFollowUps: ['What revenue data is live and what is missing?', 'Build a conservative revenue forecast'],
      confidence: 'high'
    }
  }

  if (/conservative revenue forecast|build a conservative/.test(q)) {
    const forecast = generateRevenueForecastScenario('conservative', {
      users: Math.max(inputs.usageMetrics.activeUsers, 10),
      providers: Math.max(inputs.providerAnalytics.totalProviders, 1),
      subscriptionPriceGbp: 9.99
    })
    return {
      answer: `${REVENUE_FORECAST_DISCLAIMER} Conservative 12-month MRR: £${forecast.projectedMRR.toLocaleString('en-GB')}; ARR: £${forecast.projectedARR.toLocaleString('en-GB')}. ${forecast.runwayImpact} Save and approve at /founder/revenue/forecast before external use.`,
      usedSources: ['Revenue Forecast Engine'],
      suggestedFollowUps: ['What would an investor ask about revenue?', 'Send forecast to Approvals'],
      confidence: 'medium'
    }
  }

  if (/investor ask about revenue|investor.*revenue/.test(q)) {
    return {
      answer: billingConnected && built.snapshot.mrr !== null
        ? `An investor would ask: what is live MRR vs modelled? (Live MRR £${built.snapshot.mrr.toLocaleString('en-GB')}). What is AI cost as a share of revenue? What is conversion from pilot to paid in children's homes? What are Ofsted-related retention drivers? Never quote forecasts as traction.`
        : 'An investor would ask: what is live MRR? (Not connected — do not invent). What is AI cost per active user? What pilot conversion assumptions are evidence-based? What governance prevents unsafe revenue claims? Billing is not connected.',
      usedSources: ['Investor Relations Agent', 'Revenue Intelligence'],
      suggestedFollowUps: ['What revenue data is live and what is missing?', 'Build a conservative revenue forecast'],
      confidence: billingConnected && built.snapshot.mrr !== null ? 'high' : 'medium'
    }
  }

  if (/mrr|revenue|recurring revenue/.test(q)) {
    if (!billingConnected || built.snapshot.mrr === null) return noBillingAnswer()
    return {
      answer: `Live MRR is £${built.snapshot.mrr.toLocaleString('en-GB')}. ARR £${built.snapshot.arr?.toLocaleString('en-GB') ?? 'unavailable'}. Do not confuse with forecasts.`,
      usedSources: ['Revenue Intelligence'],
      suggestedFollowUps: ['What is our AI cost risk?', 'What would an investor ask about revenue?'],
      confidence: 'high'
    }
  }

  return null
}
