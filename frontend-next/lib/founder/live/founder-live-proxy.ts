import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { buildFounderProxyHeaders, requireFounderSession } from '@/lib/founder/auth/founder-session'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

type LiveProxyTarget = {
  backendPath: string
  emptyState?: unknown
  treat404AsEmpty?: boolean
}

const LIVE_PROXY_TARGETS: Record<string, LiveProxyTarget> = {
  providers: {
    backendPath: '/api/providers',
    emptyState: { providers: [], items: [], count: 0 }
  },
  homes: {
    backendPath: '/api/homes',
    emptyState: { homes: [], items: [], count: 0 }
  },
  'inspection-readiness': {
    backendPath: '/api/inspection-readiness/dashboard',
    emptyState: {
      generated_at: null,
      key_gaps: [],
      homes: [],
      summary: { total_homes: 0, average_score: 0 }
    },
    treat404AsEmpty: true
  },
  'orb-feedback-summary': {
    backendPath: '/orb/admin/feedback/summary',
    emptyState: {
      total_feedback: 0,
      thumbs_up: 0,
      thumbs_down: 0,
      helpful_ratio: 0,
      recurring_gaps: [],
      usage_summary: {
        total_active_users: 0,
        total_requests: 0,
        estimated_total_cost: 0,
        prompt_tier_split: {}
      }
    },
    treat404AsEmpty: true
  },
  'orb-billing-usage': {
    backendPath: '/orb/admin/billing/usage',
    emptyState: {
      total_active_users: 0,
      total_requests: 0,
      estimated_total_cost: 0,
      prompt_tier_split: {},
      daily_usage_trend: [],
      budget_warnings: []
    },
    treat404AsEmpty: true
  }
}

export async function proxyFounderLiveData(
  request: Request,
  targetKey: keyof typeof LIVE_PROXY_TARGETS
): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const target = LIVE_PROXY_TARGETS[targetKey]
  if (!target) {
    return NextResponse.json({ error: 'Unknown founder live data target' }, { status: 404 })
  }

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const url = new URL(request.url)
  const upstreamUrl = new URL(`${backendOrigin}${target.backendPath}`)
  url.searchParams.forEach((value, key) => upstreamUrl.searchParams.append(key, value))

  const upstream = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: buildFounderProxyHeaders(request, cookieHeader),
    cache: 'no-store'
  }).catch(() => null)

  if (!upstream) {
    return NextResponse.json(
      sanitiseFounderPayload({ success: true, data: target.emptyState ?? {} }),
      { status: 200 }
    )
  }

  if (!upstream.ok) {
    if (target.treat404AsEmpty && upstream.status === 404) {
      return NextResponse.json(
        sanitiseFounderPayload({ success: true, data: target.emptyState ?? {} }),
        { status: 200 }
      )
    }
    if (upstream.status === 401) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    if (upstream.status === 403) {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 })
    }
    return NextResponse.json(
      sanitiseFounderPayload({ success: true, data: target.emptyState ?? {} }),
      { status: 200 }
    )
  }

  const payload = await upstream.json().catch(() => target.emptyState ?? {})
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload

  return NextResponse.json(sanitiseFounderPayload({ success: true, data }), { status: 200 })
}
