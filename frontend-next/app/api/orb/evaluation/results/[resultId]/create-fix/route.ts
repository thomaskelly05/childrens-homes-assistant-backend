import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import { createBuildBriefFromEvaluationResult, createFixFromResult } from '@/lib/orb/evaluation/orb-evaluation-run-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ resultId: string }> }
) {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const { resultId } = await context.params
  const body = await request.json().catch(() => ({}))
  const createBrief = Boolean(body.createBuildBrief)

  const proposal = createFixFromResult(resultId)
  if (!proposal) {
    return NextResponse.json({ error: 'Evaluation result not found' }, { status: 404 })
  }

  const buildBriefId = createBrief ? createBuildBriefFromEvaluationResult(resultId) : null

  return NextResponse.json({
    success: true,
    data: { proposal, buildBriefId }
  })
}
