import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import {
  mergeFounderProxyHeaders,
  requireFounderSession
} from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

import type { OrbEvaluationRun } from './orb-evaluation-types'

const BACKEND_PREFIX = '/orb/admin/evaluation'
const PERSISTENCE_RUNS = '/founder-os/persistence/orb-evaluation-runs'

type UpstreamJson = Record<string, unknown> & { success?: boolean; data?: unknown }

function unwrapData(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: unknown }).data
  }
  return payload
}

function normalisePersistedRuns(items: unknown): OrbEvaluationRun[] {
  if (!Array.isArray(items)) return []
  const runs: OrbEvaluationRun[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const record = (item as { record?: unknown }).record ?? item
    if (!record || typeof record !== 'object') continue
    const run = (record as { run?: OrbEvaluationRun }).run ?? (record as OrbEvaluationRun)
    if (run && typeof run === 'object' && 'id' in run) {
      runs.push(run)
    }
  }
  return runs.sort((a, b) => {
    const aTime = a.completedAt ?? a.startedAt
    const bTime = b.completedAt ?? b.startedAt
    return bTime.localeCompare(aTime)
  })
}

async function upstreamJson(
  request: Request,
  cookieHeader: string,
  backendPath: string,
  init?: RequestInit
): Promise<{ ok: true; status: number; payload: unknown } | { ok: false; status: number; detail: string }> {
  const backendOrigin = getInternalBackendOrigin()
  const upstream = await fetch(`${backendOrigin}${backendPath}`, {
    ...init,
    headers: mergeFounderProxyHeaders(request, cookieHeader, init?.headers),
    cache: 'no-store'
  })

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => 'ORB Evaluation upstream unavailable')
    return {
      ok: false,
      status: upstream.status >= 500 ? 503 : upstream.status,
      detail: detail.slice(0, 240) || 'ORB Evaluation upstream unavailable'
    }
  }

  const payload = await upstream.json().catch(() => ({}))
  return { ok: true, status: upstream.status, payload }
}

async function proxyEvaluation(
  request: Request,
  backendPath: string,
  init?: RequestInit
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const controller = new AbortController()
  const isLongRun = backendPath.includes('/runs') && init?.method === 'POST'
  const timer = setTimeout(() => controller.abort(), isLongRun ? 300_000 : 12_000)

  try {
    const result = await upstreamJson(request, cookieHeader, backendPath, {
      ...init,
      signal: controller.signal
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.detail }, { status: result.status })
    }

    const data = unwrapData(result.payload)
    return NextResponse.json(sanitiseFounderPayload({ success: true, data }), {
      status: result.status
    })
  } catch {
    return NextResponse.json({ error: 'ORB Evaluation temporarily unavailable' }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPersistedRuns(request: Request, cookieHeader: string): Promise<OrbEvaluationRun[]> {
  const result = await upstreamJson(request, cookieHeader, PERSISTENCE_RUNS)
  if (!result.ok) return []
  const data = unwrapData(result.payload) as UpstreamJson | undefined
  const items = data && typeof data === 'object' && 'items' in data ? data.items : []
  return normalisePersistedRuns(items)
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
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

  try {
    const [overviewResult, runs] = await Promise.all([
      upstreamJson(request, cookieHeader, `${BACKEND_PREFIX}/overview`, {
        signal: controller.signal
      }),
      fetchPersistedRuns(request, cookieHeader)
    ])

    if (!overviewResult.ok) {
      if (runs.length > 0) {
        return NextResponse.json(
          sanitiseFounderPayload({
            success: true,
            data: {
              overview: null,
              runs,
              count: runs.length,
              overviewError: overviewResult.detail
            }
          }),
          { status: 200 }
        )
      }
      return NextResponse.json({ error: overviewResult.detail }, { status: overviewResult.status })
    }

    const overview = unwrapData(overviewResult.payload)
    return NextResponse.json(
      sanitiseFounderPayload({
        success: true,
        data: {
          overview,
          runs,
          count: runs.length
        }
      }),
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'ORB Evaluation temporarily unavailable' }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}

export async function handleEvaluationRunsPost(request: Request): Promise<NextResponse> {
  const bodyText = await request.text()
  let parsedBody: Record<string, unknown> = {}
  try {
    parsedBody = JSON.parse(bodyText) as Record<string, unknown>
  } catch {
    parsedBody = {}
  }

  const response = await proxyEvaluation(request, `${BACKEND_PREFIX}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyText
  })

  if (process.env.NODE_ENV === 'development') {
    const payload = await response.clone().json().catch(() => ({})) as {
      data?: { run_id?: string; mode?: string; status?: string }
    }
    console.info('[orb-evaluation] POST /runs', {
      mode: parsedBody.mode ?? parsedBody.pack_type ?? parsedBody.pack,
      pack: parsedBody.pack_type ?? parsedBody.pack,
      backendStatus: response.status,
      runId: payload.data?.run_id
    })
  }

  return response
}

export async function handleEvaluationRunGet(request: Request, runId: string): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const encoded = encodeURIComponent(runId)
  const result = await upstreamJson(request, cookieHeader, `${PERSISTENCE_RUNS}/${encoded}`)

  if (!result.ok) {
    return NextResponse.json({ error: result.detail }, { status: result.status })
  }

  const record = unwrapData(result.payload) as { run?: OrbEvaluationRun } | OrbEvaluationRun | undefined
  const run =
    record && typeof record === 'object' && 'run' in record
      ? (record as { run?: OrbEvaluationRun }).run
      : (record as OrbEvaluationRun | undefined)

  if (!run || typeof run !== 'object' || !('id' in run)) {
    return NextResponse.json({ error: 'Evaluation run not found' }, { status: 404 })
  }

  return NextResponse.json(sanitiseFounderPayload({ success: true, data: { run } }), { status: 200 })
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
  void request
  void resultId
  return NextResponse.json({ error: 'Use /api/orb/evaluation/results/[resultId]/create-fix' }, { status: 404 })
}
