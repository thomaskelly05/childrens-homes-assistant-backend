import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { buildFounderProxyHeaders, requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

const BACKEND_PREFIX = '/orb/admin/evaluation'

async function proxyEvaluation(
  request: Request,
  backendPath: string,
  init?: RequestInit
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const controller = new AbortController()
  const isLiveRun = backendPath.includes('/runs') && init?.method === 'POST'
  const timer = setTimeout(() => controller.abort(), isLiveRun ? 300_000 : 12_000)

  try {
    const upstream = await fetch(`${backendOrigin}${backendPath}`, {
      ...init,
      headers: {
        ...buildFounderProxyHeaders(request, cookieHeader),
        ...(init?.headers ?? {})
      },
      cache: 'no-store',
      signal: controller.signal
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => 'ORB Evaluation upstream unavailable')
      return NextResponse.json(
        { error: detail.slice(0, 240) || 'ORB Evaluation upstream unavailable' },
        { status: upstream.status >= 500 ? 503 : upstream.status }
      )
    }

    const payload = await upstream.json().catch(() => ({}))
    const data =
      payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data: unknown }).data
        : payload

    return NextResponse.json(sanitiseFounderPayload({ success: true, data }), { status: 200 })
  } catch {
    return NextResponse.json({ error: 'ORB Evaluation temporarily unavailable' }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}

export async function handleEvaluationScenariosGet(request: Request): Promise<NextResponse> {
  return proxyEvaluation(request, `${BACKEND_PREFIX}/scenarios`)
}

export async function handleEvaluationScenariosGeneratePost(request: Request): Promise<NextResponse> {
  const body = await request.text()
  return proxyEvaluation(request, `${BACKEND_PREFIX}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
}

export async function handleEvaluationRunsGet(request: Request): Promise<NextResponse> {
  return proxyEvaluation(request, `${BACKEND_PREFIX}/overview`)
}

export async function handleEvaluationRunsPost(request: Request): Promise<NextResponse> {
  const body = await request.text()
  return proxyEvaluation(request, `${BACKEND_PREFIX}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
}

export async function handleEvaluationRunGet(request: Request, runId: string): Promise<NextResponse> {
  void runId
  return proxyEvaluation(request, `${BACKEND_PREFIX}/overview`)
}

export async function handleEvaluationRetestPost(
  request: Request,
  runId: string
): Promise<NextResponse> {
  const body = await request.text()
  return proxyEvaluation(request, `${BACKEND_PREFIX}/runs/${encodeURIComponent(runId)}/retest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
}

export async function handleEvaluationCreateFixPost(
  request: Request,
  resultId: string
): Promise<NextResponse> {
  void resultId
  const body = await request.text()
  return proxyEvaluation(request, `${BACKEND_PREFIX}/overview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
}
