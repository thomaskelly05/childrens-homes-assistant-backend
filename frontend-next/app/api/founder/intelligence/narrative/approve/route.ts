import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/persistence/founder-api-handler'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import { queueNarrativeForApproval } from '@/lib/founder/intelligence-centre/intelligence-store'
import type { FounderNarrativePeriod } from '@/lib/founder/intelligence-centre/intelligence-centre-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PERIODS: FounderNarrativePeriod[] = ['daily', 'weekly', 'monthly']

export async function POST(request: Request) {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { period?: string }
  const period = VALID_PERIODS.includes(body.period as FounderNarrativePeriod)
    ? (body.period as FounderNarrativePeriod)
    : 'daily'

  const actor = session.user.email ?? 'founder'
  const result = await queueNarrativeForApproval(period, actor)

  if (result.errors?.length) {
    return NextResponse.json({ error: result.errors[0] }, { status: 400 })
  }

  return NextResponse.json(sanitiseFounderPayload(result))
}
