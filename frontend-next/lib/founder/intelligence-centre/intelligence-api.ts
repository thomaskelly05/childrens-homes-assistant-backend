import { NextResponse } from 'next/server'

import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'
import { requireFounderSession } from '@/lib/founder/persistence/founder-api-handler'
import type { FounderBriefingType } from './intelligence-centre-types'
import {
  archiveFounderBriefing,
  generateFounderBriefing,
  generateFounderIntelligenceSnapshot,
  getFounderBriefing,
  getFounderBriefings,
  getLatestFounderIntelligenceSnapshot
} from './intelligence-store'

const VALID_BRIEFING_TYPES: FounderBriefingType[] = [
  'daily',
  'weekly',
  'monthly',
  'investor',
  'board',
  'partnership',
  'launch'
]

function isValidBriefingType(value: unknown): value is FounderBriefingType {
  return typeof value === 'string' && VALID_BRIEFING_TYPES.includes(value as FounderBriefingType)
}

export async function handleIntelligenceSnapshotGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const snapshot = getLatestFounderIntelligenceSnapshot()
  return NextResponse.json(sanitiseFounderPayload({ snapshot }))
}

export async function handleIntelligenceGeneratePost(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const actor = session.user.email ?? 'founder'
  const snapshot = await generateFounderIntelligenceSnapshot(actor)
  return NextResponse.json(sanitiseFounderPayload({ snapshot }))
}

export async function handleIntelligenceBriefingsGet(): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  return NextResponse.json(sanitiseFounderPayload({ briefings: getFounderBriefings() }))
}

export async function handleIntelligenceBriefingGeneratePost(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { type?: unknown }
  if (!isValidBriefingType(body.type)) {
    return NextResponse.json({ error: 'Invalid briefing type' }, { status: 400 })
  }

  const actor = session.user.email ?? 'founder'
  const briefing = await generateFounderBriefing(body.type, actor)
  return NextResponse.json(sanitiseFounderPayload({ briefing }))
}

export async function handleIntelligenceBriefingGet(briefingId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const briefing = getFounderBriefing(briefingId)
  if (!briefing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ briefing }))
}

export async function handleIntelligenceBriefingPatch(
  briefingId: string,
  request: Request
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = (await request.json().catch(() => ({}))) as { status?: string }
  if (body.status === 'archived') {
    const actor = session.user.email ?? 'founder'
    const briefing = await archiveFounderBriefing(briefingId, actor)
    if (!briefing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(sanitiseFounderPayload({ briefing }))
  }

  return NextResponse.json({ error: 'Unsupported patch' }, { status: 400 })
}
