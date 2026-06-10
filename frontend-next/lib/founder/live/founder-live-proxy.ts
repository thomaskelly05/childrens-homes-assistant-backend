import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { buildFounderProxyHeaders, requireFounderSession } from '@/lib/founder/auth/founder-session'
import { EMPTY_FOUNDER_TELEMETRY_SUMMARY } from '@/lib/founder/telemetry/founder-telemetry-types'
import { sanitiseFounderPayload } from '@/lib/founder/persistence/persistence-safety'

const BOOTSTRAP_CACHE_TTL_MS = 20_000
const LIVE_CACHE_TTL: Record<string, number> = {
  'orb-billing-usage': 30_000,
  'orb-feedback-summary': 30_000,
  providers: 60_000,
  homes: 60_000,
  'inspection-readiness': 60_000
}

const MAX_LIVE_CONCURRENCY = 3

const INSPECTION_READINESS_UNAVAILABLE = {
  available: false,
  source: 'inspection-readiness',
  items: [] as unknown[],
  error: 'Inspection readiness temporarily unavailable'
}

export const INSPECTION_READINESS_LIMITATION = 'Inspection readiness source temporarily unavailable'

export const FOUNDER_OPTIONAL_LIVE_SECTIONS = new Set([
  'inspection-readiness',
  'orb-billing-usage',
  'orb-feedback-summary',
  'providers',
  'homes'
])

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

const bootstrapCache = new Map<string, { expiresAt: number; payload: unknown }>()
const liveDataCache = new Map<string, { expiresAt: number; payload: unknown }>()

function cacheGet<T>(store: Map<string, { expiresAt: number; payload: unknown }>, key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.payload as T
}

function cacheSet(
  store: Map<string, { expiresAt: number; payload: unknown }>,
  key: string,
  payload: unknown,
  ttlMs: number
): void {
  store.set(key, { expiresAt: Date.now() + ttlMs, payload })
}

async function fetchLiveTarget(
  request: Request,
  cookieHeader: string,
  targetKey: keyof typeof LIVE_PROXY_TARGETS,
  query?: Record<string, string>
): Promise<{ key: string; data: unknown; error?: string }> {
  const target = LIVE_PROXY_TARGETS[targetKey]
  const queryKey = query ? JSON.stringify(query) : ''
  const cacheKey = `${targetKey}:${queryKey}`
  const ttl = LIVE_CACHE_TTL[targetKey] ?? 30_000
  const cached = cacheGet<unknown>(liveDataCache, cacheKey)
  if (cached !== null) {
    return { key: targetKey, data: cached }
  }

  const backendOrigin = getInternalBackendOrigin()
  const upstreamUrl = new URL(`${backendOrigin}${target.backendPath}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      upstreamUrl.searchParams.set(key, value)
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8_000)

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: buildFounderProxyHeaders(request, cookieHeader),
      cache: 'no-store',
      signal: controller.signal
    })

    if (!upstream.ok) {
      if (targetKey === 'inspection-readiness') {
        return {
          key: targetKey,
          data: INSPECTION_READINESS_UNAVAILABLE,
          error: 'unavailable'
        }
      }
      if (target.treat404AsEmpty && upstream.status === 404) {
        cacheSet(liveDataCache, cacheKey, target.emptyState ?? {}, ttl)
        return { key: targetKey, data: target.emptyState ?? {} }
      }
      return { key: targetKey, data: target.emptyState ?? {}, error: 'busy' }
    }

    const payload = await upstream.json().catch(() => target.emptyState ?? {})
    const data =
      payload && typeof payload === 'object' && 'data' in payload
        ? (payload as { data: unknown }).data
        : payload

    cacheSet(liveDataCache, cacheKey, data, ttl)
    return { key: targetKey, data }
  } catch {
    if (targetKey === 'inspection-readiness') {
      return {
        key: targetKey,
        data: INSPECTION_READINESS_UNAVAILABLE,
        error: 'unavailable'
      }
    }
    return { key: targetKey, data: target.emptyState ?? {}, error: 'busy' }
  } finally {
    clearTimeout(timer)
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function runWorker() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
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
  const url = new URL(request.url)
  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  const result = await fetchLiveTarget(request, cookieHeader, targetKey, query)
  const data =
    targetKey === 'inspection-readiness' && result.error === 'unavailable'
      ? INSPECTION_READINESS_UNAVAILABLE
      : result.data
  return NextResponse.json(sanitiseFounderPayload({ success: true, data }), { status: 200 })
}

export async function buildFounderBootstrapResponse(request: Request): Promise<NextResponse> {
  const session = await requireFounderSession()
  if (!session.ok) return session.response

  const url = new URL(request.url)
  const days = url.searchParams.get('days') ?? '30'
  const cacheKey = `bootstrap:${session.user?.id ?? 'founder'}:${days}`
  const cached = cacheGet<unknown>(bootstrapCache, cacheKey)
  if (cached) {
    return NextResponse.json(sanitiseFounderPayload({ success: true, data: cached }), { status: 200 })
  }

  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()

  const backendController = new AbortController()
  const backendTimer = setTimeout(() => backendController.abort(), 8_000)

  let backendPayload: Record<string, unknown> = {
    persistence: {},
    telemetrySummary: EMPTY_FOUNDER_TELEMETRY_SUMMARY,
    operatingLoopRuns: [],
    sectionErrors: {}
  }

  try {
    const upstream = await fetch(`${backendOrigin}/founder-os/bootstrap?days=${days}`, {
      method: 'GET',
      headers: buildFounderProxyHeaders(request, cookieHeader),
      cache: 'no-store',
      signal: backendController.signal
    })
    if (upstream.ok) {
      const body = await upstream.json().catch(() => ({}))
      backendPayload =
        body && typeof body === 'object' && 'data' in body
          ? ((body as { data: Record<string, unknown> }).data ?? backendPayload)
          : (body as Record<string, unknown>)
    } else {
      backendPayload.sectionErrors = { persistence: 'busy', telemetrySummary: 'busy' }
    }
  } catch {
    backendPayload.sectionErrors = { persistence: 'busy', telemetrySummary: 'busy' }
  } finally {
    clearTimeout(backendTimer)
  }

  const liveJobs: Array<{ key: keyof typeof LIVE_PROXY_TARGETS; query?: Record<string, string> }> = [
    { key: 'providers' },
    { key: 'homes' },
    { key: 'inspection-readiness' },
    { key: 'orb-billing-usage', query: { days: '30' } },
    { key: 'orb-feedback-summary', query: { days: '30' } }
  ]

  const liveResults = await mapWithConcurrency(liveJobs, MAX_LIVE_CONCURRENCY, (job) =>
    fetchLiveTarget(request, cookieHeader, job.key, job.query)
  )

  const liveSectionErrors: Record<string, string> = {}
  const limitations: string[] = []
  const liveSummary: Record<string, unknown> = {
    providers: {},
    homes: {},
    inspectionReadiness: {},
    billingUsage: {},
    feedbackSummary: {},
    sectionErrors: liveSectionErrors
  }

  for (const result of liveResults) {
    if (result.key === 'inspection-readiness') {
      if (result.error === 'unavailable') {
        liveSummary.inspectionReadiness = INSPECTION_READINESS_UNAVAILABLE
        limitations.push(INSPECTION_READINESS_LIMITATION)
      } else {
        liveSummary.inspectionReadiness = result.data
      }
      continue
    }

    if (result.error) liveSectionErrors[result.key] = 'busy'
    if (result.key === 'providers') liveSummary.providers = result.data
    if (result.key === 'homes') liveSummary.homes = result.data
    if (result.key === 'orb-billing-usage') liveSummary.billingUsage = result.data
    if (result.key === 'orb-feedback-summary') liveSummary.feedbackSummary = result.data
  }

  const inspectionReadinessUnavailable =
    typeof liveSummary.inspectionReadiness === 'object' &&
    liveSummary.inspectionReadiness !== null &&
    (liveSummary.inspectionReadiness as { available?: boolean }).available === false

  const dataSourceStatus = {
    providers: liveSectionErrors.providers ? 'busy' : 'ok',
    homes: liveSectionErrors.homes ? 'busy' : 'ok',
    readiness: inspectionReadinessUnavailable ? 'unavailable' : 'ok',
    billing: liveSectionErrors['orb-billing-usage'] ? 'busy' : 'ok',
    feedback: liveSectionErrors['orb-feedback-summary'] ? 'busy' : 'ok'
  }

  const payload = sanitiseFounderPayload({
    ...backendPayload,
    liveSummary,
    dataSourceStatus,
    limitations,
    sectionErrors: {
      ...((backendPayload.sectionErrors as Record<string, string>) ?? {}),
      ...liveSectionErrors
    }
  })

  cacheSet(bootstrapCache, cacheKey, payload, BOOTSTRAP_CACHE_TTL_MS)
  return NextResponse.json({ success: true, data: payload }, { status: 200 })
}
