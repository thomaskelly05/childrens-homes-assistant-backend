import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { buildFounderProxyHeaders, requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

const BACKEND_PREFIX = '/orb/admin/quality-lab'

async function proxyQualityLab(
  request: Request,
  backendPath: string,
  init?: RequestInit
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const controller = new AbortController()
  const isLiveRun = backendPath.endsWith('/runs') && init?.method === 'POST'
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
      const detail = await upstream.text().catch(() => 'Quality Lab upstream unavailable')
      return NextResponse.json(
        { error: detail.slice(0, 240) || 'Quality Lab upstream unavailable' },
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
    return NextResponse.json({ error: 'Quality Lab temporarily unavailable' }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}

export async function handleQualityLabOverviewGet(request: Request): Promise<NextResponse> {
  return proxyQualityLab(request, `${BACKEND_PREFIX}/overview`)
}

export async function handleQualityLabRunsPost(request: Request): Promise<NextResponse> {
  const body = await request.text()
  return proxyQualityLab(request, `${BACKEND_PREFIX}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
}

export async function handleQualityLabEvaluatePost(request: Request): Promise<NextResponse> {
  const body = await request.text()
  return proxyQualityLab(request, `${BACKEND_PREFIX}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })
}
