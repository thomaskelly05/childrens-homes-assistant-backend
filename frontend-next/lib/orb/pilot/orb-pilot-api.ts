import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { proxyRequestToBackend } from '@/lib/auth/backend-proxy'
import { buildFounderProxyHeaders, requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

const BACKEND_PREFIX = '/orb/pilot'

async function proxyFounderPilot(
  request: Request,
  backendPath: string,
  init?: RequestInit
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

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
      const detail = await upstream.text().catch(() => 'ORB pilot upstream unavailable')
      return NextResponse.json(
        { error: detail.slice(0, 240) || 'ORB pilot upstream unavailable' },
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
    return NextResponse.json({ error: 'ORB pilot temporarily unavailable' }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}

export async function handleOrbPilotFeedbackPost(request: Request): Promise<Response> {
  return proxyRequestToBackend(request, ['orb', 'pilot', 'feedback'])
}

export async function handleFounderOrbPilotFeedbackGet(request: Request): Promise<NextResponse> {
  return proxyFounderPilot(request, `${BACKEND_PREFIX}/feedback/admin`)
}

export async function handleFounderOrbPilotSummaryGet(request: Request): Promise<NextResponse> {
  return proxyFounderPilot(request, `${BACKEND_PREFIX}/summary/admin`)
}
