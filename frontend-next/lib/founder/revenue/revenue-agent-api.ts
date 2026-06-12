import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import { generateFinanceForecast } from '../finance/finance-forecast-engine'
import { addFinanceForecast } from '../finance/finance-store'

import {
  addManualRevenueEntry,
  buildRevenueAgentReport,
  createRevenuePipelineSnapshot,
  getRevenuePipelineSnapshot
} from './revenue-agent-service'

const VALID_ENTRY_TYPES = new Set([
  'demo_request',
  'pilot_request',
  'waiting_list',
  'trial_user',
  'paid_user',
  'pipeline_value',
  'committed_mrr'
])

export async function handleRevenueAgentGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ snapshot: getRevenuePipelineSnapshot() }))
}

export async function handleRevenueAgentReportGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload(buildRevenueAgentReport()))
}

export async function handleRevenueManualEntryPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    entryType?: string
    value?: number
    notes?: string
  }

  if (!body.entryType || !VALID_ENTRY_TYPES.has(body.entryType)) {
    return NextResponse.json({ error: 'Valid entryType required' }, { status: 400 })
  }
  if (typeof body.value !== 'number' || body.value < 0) {
    return NextResponse.json({ error: 'value must be a non-negative number' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const entry = addManualRevenueEntry({
    entryType: body.entryType as Parameters<typeof addManualRevenueEntry>[0]['entryType'],
    value: body.value,
    notes: body.notes ?? '',
    createdBy: actor
  })

  const snapshot = createRevenuePipelineSnapshot(actor)
  return NextResponse.json(sanitiseFounderPayload({ entry, snapshot }), { status: 201 })
}

export async function handleRevenueAgentForecastPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const actor = session.user.email ?? 'founder'

  const snapshot = getRevenuePipelineSnapshot()
  const forecast = generateFinanceForecast(
    {
      monthlyUsers: typeof body.users === 'number' ? body.users : snapshot.trialUsers + snapshot.paidUsers,
      pricePerUserGbp: typeof body.subscriptionPriceGbp === 'number' ? body.subscriptionPriceGbp : 25,
      monthlyBurnGbp: typeof body.monthlyBurnGbp === 'number' ? body.monthlyBurnGbp : 500,
      conversionRatePercent: typeof body.conversionRatePercent === 'number' ? body.conversionRatePercent : 5,
      aiCostPerUserGbp: typeof body.aiCostPerUserGbp === 'number' ? body.aiCostPerUserGbp : 3
    },
    actor
  )
  addFinanceForecast(forecast)

  return NextResponse.json(
    sanitiseFounderPayload({
      forecast,
      revenueSnapshot: snapshot,
      separatesActualFromForecast: true,
      actualMrr: snapshot.actualMrr,
      forecastMrr: forecast.projectedMrr.value
    }),
    { status: 201 }
  )
}
