import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import {
  addManualCostEntry,
  buildFinanceReport,
  createFinanceForecast,
  createFinanceSnapshot,
  getFinanceSnapshot
} from './finance-service'
import type { FinanceCostEntry } from './finance-types'

const VALID_CATEGORIES = new Set<FinanceCostEntry['category']>([
  'hosting',
  'openai_api',
  'email_provider',
  'domain_software',
  'other'
])

export async function handleFinanceGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ snapshot: getFinanceSnapshot() }))
}

export async function handleFinanceReportGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload(buildFinanceReport()))
}

export async function handleFinanceCostEntryPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as {
    category?: string
    amountGbp?: number
    description?: string
    label?: FinanceCostEntry['label']
  }

  if (!body.category || !VALID_CATEGORIES.has(body.category as FinanceCostEntry['category'])) {
    return NextResponse.json({ error: 'Valid category required' }, { status: 400 })
  }
  if (typeof body.amountGbp !== 'number' || body.amountGbp < 0) {
    return NextResponse.json({ error: 'amountGbp must be a non-negative number' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const entry = addManualCostEntry({
    category: body.category as FinanceCostEntry['category'],
    amountGbp: body.amountGbp,
    description: body.description ?? '',
    label: body.label,
    createdBy: actor
  })

  return NextResponse.json(sanitiseFounderPayload({ entry, snapshot: createFinanceSnapshot(actor) }), { status: 201 })
}

export async function handleFinanceForecastPost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const actor = session.user.email ?? 'founder'

  const forecast = createFinanceForecast(
    {
      monthlyUsers: typeof body.monthlyUsers === 'number' ? body.monthlyUsers : undefined,
      pricePerUserGbp: typeof body.pricePerUserGbp === 'number' ? body.pricePerUserGbp : undefined,
      monthlyBurnGbp: typeof body.monthlyBurnGbp === 'number' ? body.monthlyBurnGbp : undefined,
      conversionRatePercent: typeof body.conversionRatePercent === 'number' ? body.conversionRatePercent : undefined,
      aiCostPerUserGbp: typeof body.aiCostPerUserGbp === 'number' ? body.aiCostPerUserGbp : undefined
    },
    actor
  )

  return NextResponse.json(sanitiseFounderPayload({ forecast }), { status: 201 })
}

export async function handleFinanceSnapshotPost(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  const snapshot = createFinanceSnapshot(actor)
  return NextResponse.json(sanitiseFounderPayload({ snapshot }), { status: 201 })
}
