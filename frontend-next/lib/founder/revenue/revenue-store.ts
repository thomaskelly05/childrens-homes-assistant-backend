/**
 * Founder Revenue Intelligence store — snapshots, forecasts and pricing models.
 */

import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { appendAuditLog } from '@/lib/founder/persistence/repositories/audit-log-repository'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { calculateAiMargin } from './ai-margin-engine'
import { DEFAULT_PRICING_MODELS } from './revenue-defaults'
import {
  generateAllRevenueForecastScenarios,
  generateRevenueForecastScenario,
  type ForecastInput
} from './revenue-forecast-engine'
import { buildCommercialRisks, buildFinanceRecommendations } from './revenue-risks'
import { buildRevenueSources, buildRevenueSourcesServer } from './revenue-source-builder'
import type {
  ForecastScenario,
  PricingModel,
  PricingModelStatus,
  RevenueForecast,
  RevenueSnapshot
} from './revenue-types'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'

let pricingModels: PricingModel[] = [...DEFAULT_PRICING_MODELS]
let forecasts: RevenueForecast[] = []
let cachedSnapshot: RevenueSnapshot | null = null
let snapshotCachedAt = 0
const SNAPSHOT_CACHE_MS = 15_000

function defaultForecastInput(): ForecastInput {
  const inputs = getFounderContractInputs()
  const activeOrbUser = inputs.billingMetrics.totalActiveUsers || inputs.usageMetrics.activeUsers || 10
  return {
    users: Math.max(activeOrbUser, 10),
    providers: Math.max(inputs.providerAnalytics.totalProviders, 1),
    subscriptionPriceGbp: 9.99,
    conversionRatePercent: 8,
    churnRatePercent: 4,
    aiCostPerUserGbp: inputs.billingMetrics.costPerUserGbp || 1.2,
    infrastructureCostGbp: 120
  }
}

export async function getRevenueSnapshot(options?: {
  server?: boolean
  request?: Request
  forceRefresh?: boolean
}): Promise<{
  snapshot: RevenueSnapshot
  margin: ReturnType<typeof calculateAiMargin>
  risks: ReturnType<typeof buildCommercialRisks>
  recommendations: string[]
  sourcesConnected: string[]
  unavailableSources: string[]
}> {
  const now = Date.now()
  if (!options?.forceRefresh && cachedSnapshot && now - snapshotCachedAt < SNAPSHOT_CACHE_MS) {
    const billing = getFounderContractInputs().billingMetrics
    const margin = calculateAiMargin(billing, { revenueAvailable: cachedSnapshot.mrr !== null })
    return {
      snapshot: cachedSnapshot,
      margin,
      risks: buildCommercialRisks(cachedSnapshot, margin),
      recommendations: buildFinanceRecommendations(cachedSnapshot, margin),
      sourcesConnected: [],
      unavailableSources: []
    }
  }

  const built = options?.server
    ? await buildRevenueSourcesServer(options.request)
    : buildRevenueSources()

  cachedSnapshot = built.snapshot
  snapshotCachedAt = now

  const billing = getFounderContractInputs().billingMetrics
  const margin = calculateAiMargin(billing, { revenueAvailable: built.snapshot.mrr !== null })

  return {
    snapshot: built.snapshot,
    margin,
    risks: buildCommercialRisks(built.snapshot, margin),
    recommendations: buildFinanceRecommendations(built.snapshot, margin),
    sourcesConnected: built.sourcesConnected,
    unavailableSources: built.unavailableSources
  }
}

export function getRevenueForecasts(): RevenueForecast[] {
  return [...forecasts]
}

export function getRevenueForecast(id: string): RevenueForecast | undefined {
  return forecasts.find((f) => f.id === id)
}

export async function generateRevenueForecast(
  input: Partial<ForecastInput> & { scenario?: ForecastScenario },
  actor = 'founder'
): Promise<RevenueForecast> {
  const merged = { ...defaultForecastInput(), ...input }
  const forecast = input.scenario
    ? generateRevenueForecastScenario(input.scenario, merged)
    : generateAllRevenueForecastScenarios(merged)[1]

  forecasts = [forecast, ...forecasts]

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'founder_memory',
    entityId: forecast.id,
    summary: `Revenue forecast generated (${forecast.scenario}) — modelled assumptions only`,
    status: forecast.approvalStatus ?? 'draft',
    metadata: { scenario: forecast.scenario, projectedMRR: forecast.projectedMRR }
  }).catch(() => undefined)

  return forecast
}

export function getPricingModels(): PricingModel[] {
  return pricingModels.filter((m) => m.status !== 'archived')
}

export function getAllPricingModelsIncludingArchived(): PricingModel[] {
  return [...pricingModels]
}

export async function savePricingModel(
  model: Omit<PricingModel, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor = 'founder'
): Promise<PricingModel> {
  const now = new Date().toISOString()
  const existing = model.id ? pricingModels.find((m) => m.id === model.id) : undefined

  const saved: PricingModel = existing
    ? {
        ...existing,
        ...model,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now
      }
    : {
        ...model,
        id: model.id ?? nextId('pricing'),
        createdAt: now,
        updatedAt: now
      }

  pricingModels = existing
    ? pricingModels.map((m) => (m.id === saved.id ? saved : m))
    : [saved, ...pricingModels]

  await appendAuditLog({
    actor,
    eventType: existing ? 'updated' : 'created',
    entityType: 'founder_memory',
    entityId: saved.id,
    summary: `Pricing model ${existing ? 'updated' : 'created'}: ${saved.name}`,
    status: saved.status,
    metadata: { pricePerUser: saved.pricePerUser, pricePerProvider: saved.pricePerProvider }
  }).catch(() => undefined)

  return saved
}

export async function archivePricingModel(pricingId: string, actor = 'founder'): Promise<PricingModel | undefined> {
  const model = pricingModels.find((m) => m.id === pricingId)
  if (!model) return undefined

  const archived: PricingModel = { ...model, status: 'archived' as PricingModelStatus, updatedAt: new Date().toISOString() }
  pricingModels = pricingModels.map((m) => (m.id === pricingId ? archived : m))

  await appendAuditLog({
    actor,
    eventType: 'status_changed',
    entityType: 'founder_memory',
    entityId: pricingId,
    summary: `Pricing model archived: ${model.name}`,
    status: 'archived'
  }).catch(() => undefined)

  return archived
}

export async function submitForecastForApproval(
  forecastId: string,
  actor = 'founder'
): Promise<RevenueForecast | undefined> {
  const forecast = forecasts.find((f) => f.id === forecastId)
  if (!forecast) return undefined

  const content = [
    `Revenue forecast (${forecast.scenario}) — ${forecast.limitations[0]}`,
    `12-month projected MRR: £${forecast.projectedMRR.toLocaleString('en-GB')}`,
    `12-month projected ARR: £${forecast.projectedARR.toLocaleString('en-GB')}`,
    `Projected gross margin: £${forecast.projectedGrossMargin.toLocaleString('en-GB')}`,
    `Runway impact: ${forecast.runwayImpact}`,
    `Risks: ${forecast.risks.join('; ')}`
  ].join('\n')

  const approval = createApprovalItem({
    type: 'revenue-claim',
    title: `Revenue forecast — ${forecast.scenario}`,
    content,
    requestedByAgent: 'Finance and AI Cost Agent',
    riskLevel: 'high',
    safetyCheck: 'External revenue claims require founder approval'
  })

  const updated: RevenueForecast = {
    ...forecast,
    approvalStatus: 'pending',
    approvalId: approval.id
  }
  forecasts = forecasts.map((f) => (f.id === forecastId ? updated : f))

  await appendAuditLog({
    actor,
    eventType: 'created',
    entityType: 'approval',
    entityId: approval.id,
    summary: `Revenue forecast submitted for approval: ${forecast.scenario}`,
    status: 'pending',
    linkedEntityId: forecastId,
    linkedEntityType: 'founder_memory'
  }).catch(() => undefined)

  return updated
}

export function markForecastApprovalStatus(
  forecastId: string,
  status: 'approved' | 'rejected' | 'needs-changes'
): void {
  forecasts = forecasts.map((f) =>
    f.id === forecastId ? { ...f, approvalStatus: status } : f
  )
}

export function markForecastApprovalStatusByApprovalId(
  approvalId: string,
  status: 'approved' | 'rejected' | 'needs-changes'
): void {
  forecasts = forecasts.map((f) =>
    f.approvalId === approvalId ? { ...f, approvalStatus: status } : f
  )
}

export function getApprovedRevenueForecasts(): RevenueForecast[] {
  return forecasts.filter((f) => f.approvalStatus === 'approved')
}

export function invalidateRevenueSnapshotCache(): void {
  cachedSnapshot = null
  snapshotCachedAt = 0
}
