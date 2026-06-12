import { recordAgentAuditEntry } from '../agents/autonomous/founder-agent-audit.ts'

import type { RevenueDataSource } from './revenue-types'

export type RevenueAgentDataLabel = 'actual' | 'assumed' | 'estimated' | 'projected' | RevenueDataSource | 'unavailable'

export type RevenuePipelineSnapshot = {
  id: string
  createdAt: string
  createdBy: string
  demoRequests: number
  pilotRequests: number
  waitingList: number
  trialUsers: number
  paidUsers: number
  actualMrr: number | null
  actualArr: number | null
  actualMrrLabel: RevenueAgentDataLabel
  committedMrr: number | null
  committedMrrLabel: RevenueAgentDataLabel
  pipelineValue: number
  pipelineLabel: RevenueAgentDataLabel
  conversionRate: number | null
  churnRate: number | null
  pricingAssumptions: string[]
  likelyRevenueRange: { low: number; high: number; label: RevenueAgentDataLabel }
  confidenceLevel: 'low' | 'medium' | 'high'
  forecastMrr: number | null
  forecastLabel: RevenueAgentDataLabel
  recommendations: string[]
  limitations: string[]
}

type ManualRevenueEntry = {
  id: string
  entryType: 'demo_request' | 'pilot_request' | 'waiting_list' | 'trial_user' | 'paid_user' | 'pipeline_value' | 'committed_mrr'
  value: number
  notes: string
  createdAt: string
  createdBy: string
}

let manualEntries: ManualRevenueEntry[] = []
let pipelineSnapshots: RevenuePipelineSnapshot[] = []
let entryCounter = 0

function nextId(): string {
  entryCounter += 1
  return `revenue-${Date.now()}-${entryCounter}`
}

function sumByType(type: ManualRevenueEntry['entryType']): number {
  return manualEntries.filter((e) => e.entryType === type).reduce((sum, e) => sum + e.value, 0)
}

export function addManualRevenueEntry(input: {
  entryType: ManualRevenueEntry['entryType']
  value: number
  notes: string
  createdBy: string
}): ManualRevenueEntry {
  const entry: ManualRevenueEntry = {
    id: nextId(),
    ...input,
    createdAt: new Date().toISOString()
  }
  manualEntries.unshift(entry)

  recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Manual revenue entry: ${input.entryType} = ${input.value}. ${input.notes}`,
    approvalStatus: 'not_required'
  })

  return entry
}

export function getManualRevenueEntries(): ManualRevenueEntry[] {
  return [...manualEntries]
}

export function createRevenuePipelineSnapshot(createdBy: string): RevenuePipelineSnapshot {
  const demoRequests = sumByType('demo_request')
  const pilotRequests = sumByType('pilot_request')
  const waitingList = sumByType('waiting_list')
  const trialUsers = sumByType('trial_user')
  const paidUsers = sumByType('paid_user')
  const pipelineValue = sumByType('pipeline_value')
  const committedMrr = sumByType('committed_mrr') || null

  const hasLiveStripe = false
  const actualMrr = hasLiveStripe ? null : null

  const forecastLow = pipelineValue * 0.1
  const forecastHigh = pipelineValue * 0.3

  const recommendations: string[] = []
  if (demoRequests > 0 && pilotRequests === 0) {
    recommendations.push('Convert demo interest to pilot conversations.')
  }
  if (paidUsers === 0 && trialUsers > 0) {
    recommendations.push('Review trial conversion blockers — do not exaggerate traction.')
  }
  if (pipelineValue === 0) {
    recommendations.push('Add pipeline values from founder conversations — no invented traction.')
  }

  const snapshot: RevenuePipelineSnapshot = {
    id: `revenue-snapshot-${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdBy,
    demoRequests,
    pilotRequests,
    waitingList,
    trialUsers,
    paidUsers,
    actualMrr,
    actualArr: actualMrr !== null ? actualMrr * 12 : null,
    actualMrrLabel: hasLiveStripe ? 'live' : 'unavailable',
    committedMrr,
    committedMrrLabel: committedMrr !== null ? 'actual' : 'assumed',
    pipelineValue,
    pipelineLabel: pipelineValue > 0 ? 'actual' : 'assumed',
    conversionRate: trialUsers > 0 ? Math.round((paidUsers / trialUsers) * 100) : null,
    churnRate: null,
    pricingAssumptions: ['£25/user/month base assumption', 'Pilot pricing negotiable'],
    likelyRevenueRange: {
      low: Math.round(forecastLow),
      high: Math.round(forecastHigh),
      label: 'assumed'
    },
    confidenceLevel: paidUsers > 0 ? 'medium' : pipelineValue > 0 ? 'low' : 'low',
    forecastMrr: committedMrr,
    forecastLabel: 'assumed',
    recommendations,
    limitations: [
      'Actual MRR requires Stripe integration — not connected.',
      'Pipeline values are founder-entered — not CRM-synced.',
      'Forecasts are assumptions, not guarantees.'
    ]
  }

  pipelineSnapshots.unshift(snapshot)
  if (pipelineSnapshots.length > 50) pipelineSnapshots = pipelineSnapshots.slice(0, 50)

  recordAgentAuditEntry({
    agentId: 'revenue-agent',
    actionType: 'create_audit_note',
    summary: `Revenue pipeline snapshot: ${demoRequests} demos, pipeline £${pipelineValue}.`,
    approvalStatus: 'not_required'
  })

  return snapshot
}

export function getRevenuePipelineSnapshot(): RevenuePipelineSnapshot {
  return pipelineSnapshots[0] ?? createRevenuePipelineSnapshot('system')
}

export function buildRevenueAgentReport(): {
  snapshot: RevenuePipelineSnapshot
  manualEntries: ManualRevenueEntry[]
  separatesActualFromForecast: true
} {
  return {
    snapshot: getRevenuePipelineSnapshot(),
    manualEntries: getManualRevenueEntries(),
    separatesActualFromForecast: true
  }
}

export function resetRevenueAgentStore(): void {
  manualEntries = []
  pipelineSnapshots = []
  entryCounter = 0
}
