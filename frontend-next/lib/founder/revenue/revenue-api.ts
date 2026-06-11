import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import type { ForecastScenario, PricingModelStatus } from './revenue-types'
import {
  archivePricingModel,
  generateRevenueForecast,
  getPricingModels,
  getRevenueForecasts,
  savePricingModel,
  submitForecastForApproval
} from './revenue-store'
import { getRevenueSnapshotServer } from './revenue-store.server'

const VALID_SCENARIOS = new Set<ForecastScenario>(['conservative', 'base', 'growth', 'aggressive'])
const VALID_PRICING_STATUS = new Set<PricingModelStatus>(['active', 'draft', 'archived'])

function parseScenario(value: unknown): ForecastScenario | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase() as ForecastScenario
  return VALID_SCENARIOS.has(normalised) ? normalised : null
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export async function handleRevenueSnapshotGet(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const payload = await getRevenueSnapshotServer(request, { forceRefresh: true })
  return NextResponse.json(sanitiseFounderPayload(payload))
}

export async function handleRevenueForecastsGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ forecasts: getRevenueForecasts() }))
}

export async function handleRevenueForecastPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const scenario = body.scenario ? parseScenario(body.scenario) : null
  if (body.scenario && !scenario) {
    return NextResponse.json({ error: 'Invalid forecast scenario' }, { status: 400 })
  }

  const users = parseNumber(body.users)
  const providers = parseNumber(body.providers)
  const subscriptionPriceGbp = parseNumber(body.subscriptionPriceGbp)
  if (users !== undefined && users < 0) {
    return NextResponse.json({ error: 'users must be non-negative' }, { status: 400 })
  }
  if (providers !== undefined && providers < 0) {
    return NextResponse.json({ error: 'providers must be non-negative' }, { status: 400 })
  }
  if (subscriptionPriceGbp !== undefined && subscriptionPriceGbp < 0) {
    return NextResponse.json({ error: 'subscriptionPriceGbp must be non-negative' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const forecast = await generateRevenueForecast(
    {
      scenario: scenario ?? undefined,
      users,
      providers,
      subscriptionPriceGbp,
      conversionRatePercent: parseNumber(body.conversionRatePercent),
      churnRatePercent: parseNumber(body.churnRatePercent),
      aiCostPerUserGbp: parseNumber(body.aiCostPerUserGbp),
      infrastructureCostGbp: parseNumber(body.infrastructureCostGbp)
    },
    actor
  )

  if (body.submitForApproval === true) {
    await submitForecastForApproval(forecast.id, actor)
  }

  return NextResponse.json(sanitiseFounderPayload({ forecast }), { status: 201 })
}

export async function handleRevenuePricingGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ models: getPricingModels() }))
}

export async function handleRevenuePricingPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const pricePerUser = parseNumber(body.pricePerUser)
  if (pricePerUser === undefined || pricePerUser < 0) {
    return NextResponse.json({ error: 'pricePerUser is required and must be non-negative' }, { status: 400 })
  }

  const status = typeof body.status === 'string' ? (body.status as PricingModelStatus) : 'draft'
  if (!VALID_PRICING_STATUS.has(status)) {
    return NextResponse.json({ error: 'Invalid pricing status' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const model = await savePricingModel(
    {
      id: typeof body.id === 'string' ? body.id : undefined,
      name: body.name.trim(),
      pricePerUser,
      pricePerProvider: parseNumber(body.pricePerProvider),
      includedUsage: typeof body.includedUsage === 'string' ? body.includedUsage : '',
      overageModel: typeof body.overageModel === 'string' ? body.overageModel : '',
      targetCustomer: typeof body.targetCustomer === 'string' ? body.targetCustomer : '',
      marginNotes: typeof body.marginNotes === 'string' ? body.marginNotes : '',
      status
    },
    actor
  )

  return NextResponse.json(sanitiseFounderPayload({ model }), { status: 201 })
}

export async function handleRevenuePricingPatch(
  request: Request,
  pricingId: string
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const actor = session.user.email ?? 'founder'

  if (body.archive === true) {
    const archived = await archivePricingModel(pricingId, actor)
    if (!archived) return NextResponse.json({ error: 'Pricing model not found' }, { status: 404 })
    return NextResponse.json(sanitiseFounderPayload({ model: archived }))
  }

  const existing = getPricingModels().find((m) => m.id === pricingId)
  if (!existing) return NextResponse.json({ error: 'Pricing model not found' }, { status: 404 })

  const status =
    typeof body.status === 'string' && VALID_PRICING_STATUS.has(body.status as PricingModelStatus)
      ? (body.status as PricingModelStatus)
      : existing.status

  const model = await savePricingModel(
    {
      id: pricingId,
      name: typeof body.name === 'string' ? body.name.trim() : existing.name,
      pricePerUser: parseNumber(body.pricePerUser) ?? existing.pricePerUser,
      pricePerProvider: parseNumber(body.pricePerProvider) ?? existing.pricePerProvider,
      includedUsage: typeof body.includedUsage === 'string' ? body.includedUsage : existing.includedUsage,
      overageModel: typeof body.overageModel === 'string' ? body.overageModel : existing.overageModel,
      targetCustomer: typeof body.targetCustomer === 'string' ? body.targetCustomer : existing.targetCustomer,
      marginNotes: typeof body.marginNotes === 'string' ? body.marginNotes : existing.marginNotes,
      status
    },
    actor
  )

  return NextResponse.json(sanitiseFounderPayload({ model }))
}
