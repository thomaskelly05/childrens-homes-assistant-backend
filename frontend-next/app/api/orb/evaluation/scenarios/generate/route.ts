import { NextResponse } from 'next/server'

import { requireFounderSession } from '@/lib/founder/auth/founder-session'
import {
  generateAdversarialPack,
  generateHighRiskPack,
  generateOrbEvaluationScenarios
} from '@/lib/orb/evaluation/orb-scenario-generator'
import { handleEvaluationScenariosGeneratePost } from '@/lib/orb/evaluation/orb-evaluation-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const body = await request.json().catch(() => ({}))
  const count = Math.max(1, Math.min(Number(body.count) || 100, 5000))
  const packType = String(body.pack_type || body.packType || 'standard')

  let scenarios
  if (packType === 'high-risk') scenarios = generateHighRiskPack()
  else if (packType === 'adversarial') scenarios = generateAdversarialPack()
  else scenarios = generateOrbEvaluationScenarios(count)

  const storeHeaders = new Headers({ 'Content-Type': 'application/json' })
  const csrf = request.headers.get('x-csrf-token')
  if (csrf) storeHeaders.set('x-csrf-token', csrf)
  const authorization = request.headers.get('authorization')
  if (authorization) storeHeaders.set('authorization', authorization)

  const storeResponse = await handleEvaluationScenariosGeneratePost(
    new Request(request.url, {
      method: 'POST',
      headers: storeHeaders,
      body: JSON.stringify(scenarios)
    })
  )

  if (!storeResponse.ok) {
    const payload = await storeResponse.json().catch(() => ({}))
    return NextResponse.json(payload, { status: storeResponse.status })
  }

  return NextResponse.json({
    success: true,
    data: { scenarios, count: scenarios.length, packType, stored: true }
  })
}
