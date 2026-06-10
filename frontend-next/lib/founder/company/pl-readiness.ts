/**
 * P&L readiness — placeholders for future full profit and loss without inventing data.
 */

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import { buildRevenueSources } from '@/lib/founder/revenue/revenue-source-builder'
import type { CompanyKpi } from './company-types'
import { formatUnavailableMetric } from './live-data-guard'

export type PlLineItem = {
  id: string
  label: string
  kpi: CompanyKpi
}

export type PlReadinessReport = {
  connectedCostSources: string[]
  missingCostSources: string[]
  requirementsForRealPl: string[]
  lineItems: PlLineItem[]
  canCalculateGrossProfit: boolean
  canCalculateNetProfit: boolean
  canCalculateRunway: boolean
  limitations: string[]
}

const COST_SOURCES = [
  { id: 'openai-cost', label: 'OpenAI cost' },
  { id: 'elevenlabs-cost', label: 'ElevenLabs cost' },
  { id: 'render-cost', label: 'Render hosting cost' },
  { id: 'domain-email-software', label: 'Domain / email / software cost' },
  { id: 'contractor-cost', label: 'Contractor cost' },
  { id: 'marketing-cost', label: 'Marketing cost' }
] as const

function unavailableLine(id: string, label: string, note: string): PlLineItem {
  const basis = formatUnavailableMetric(label, note)
  return {
    id,
    label,
    kpi: {
      id,
      name: label,
      value: basis.value,
      unit: 'GBP',
      sourceStatus: basis.sourceStatus,
      dataSource: basis.source,
      lastUpdated: basis.lastUpdated,
      limitation: basis.limitation
    }
  }
}

export function buildPlReadiness(): PlReadinessReport {
  const contract = getFounderContractInputs()
  const revenue = buildRevenueSources()
  const connections = contract.dataSourceStatus.sourceConnections

  const connectedCostSources: string[] = []
  const missingCostSources: string[] = []
  const lineItems: PlLineItem[] = []

  const openAiConnected =
    connections.billing === 'connected' || connections.billing === 'no-records' || revenue.snapshot.aiCost !== null

  for (const cost of COST_SOURCES) {
    if (cost.id === 'openai-cost' && openAiConnected && revenue.snapshot.aiCost !== null) {
      connectedCostSources.push(cost.label)
      lineItems.push({
        id: cost.id,
        label: cost.label,
        kpi: {
          id: cost.id,
          name: cost.label,
          value: revenue.snapshot.aiCost,
          unit: 'GBP',
          sourceStatus: 'live',
          dataSource: 'ORB Billing Usage',
          lastUpdated: revenue.snapshot.periodEnd
        }
      })
    } else {
      missingCostSources.push(cost.label)
      lineItems.push(unavailableLine(cost.id, cost.label, `${cost.label} source not connected`))
    }
  }

  const mrrLive = revenue.snapshot.mrr !== null && revenue.snapshot.source !== 'unavailable'

  lineItems.push({
    id: 'gross-profit',
    label: 'Gross profit',
    kpi: mrrLive && revenue.snapshot.grossMargin !== null
      ? {
          id: 'gross-profit',
          name: 'Gross profit',
          value: revenue.snapshot.grossMargin,
          unit: 'GBP',
          sourceStatus: 'live',
          dataSource: 'Revenue Intelligence',
          lastUpdated: revenue.snapshot.periodEnd,
          limitation: 'Partial — not all cost sources connected'
        }
      : unavailableLine('gross-profit', 'Gross profit', 'Cannot calculate without live MRR and connected cost sources').kpi
  })

  lineItems.push(
    unavailableLine('net-profit', 'Net profit', 'Net profit requires all cost sources — not calculated to avoid fake numbers')
  )
  lineItems.push(
    unavailableLine('burn-rate', 'Burn rate', 'Burn rate requires all operating costs — not calculated')
  )
  lineItems.push(
    unavailableLine('runway', 'Runway', 'Runway requires cash balance and burn rate sources — not connected')
  )

  const requirementsForRealPl = [
    'Connect live MRR and subscription billing',
    'Connect OpenAI and ElevenLabs usage billing',
    'Connect infrastructure costs (Render, domain, email, software)',
    'Record contractor and marketing spend',
    'Add cash balance source for runway calculation'
  ]

  return {
    connectedCostSources,
    missingCostSources,
    requirementsForRealPl,
    lineItems,
    canCalculateGrossProfit: mrrLive && openAiConnected,
    canCalculateNetProfit: false,
    canCalculateRunway: false,
    limitations: [
      'P&L placeholders only — no fake profit calculated.',
      ...missingCostSources.map((s) => `${s} not connected`)
    ]
  }
}
