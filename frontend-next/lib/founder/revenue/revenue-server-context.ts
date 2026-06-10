/**
 * Server-side revenue context — fetches live founder data without browser fetch.
 */

import { cookies } from 'next/headers'

import { getInternalBackendOrigin } from '@/lib/auth/api-base'
import { buildFounderProxyHeaders } from '@/lib/founder/auth/founder-session'
import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import { currentPeriodBounds } from '@/lib/founder/data/adapters/adapter-utils'
import type { OrbAdminUsageSummary } from '@/lib/orb/admin-quality-client'

export type ServerRevenueContext = {
  billingUsage: OrbAdminUsageSummary | null
  providerAnalytics: ProviderAnalytics
  telemetrySummary: {
    totalEvents: number
    orbConversations: number
    aiCostsGbp: number
    subscriptionEvents: number
    signupEvents: number
  }
  billingConnected: boolean
  limitations: string[]
}

function emptyProviderAnalytics(): ProviderAnalytics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    periodStart,
    periodEnd,
    totalProviders: 0,
    totalHomes: 0,
    totalMrr: 0,
    mrrTrendPercent: 0,
    providers: []
  }
}

async function fetchBackendJson<T>(
  request: Request | undefined,
  path: string,
  query?: Record<string, string>
): Promise<T | null> {
  const cookieHeader = (await cookies()).toString()
  const backendOrigin = getInternalBackendOrigin()
  const url = new URL(`${backendOrigin}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value)
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8_000)

  try {
    const headers = request
      ? buildFounderProxyHeaders(request, cookieHeader)
      : { cookie: cookieHeader, accept: 'application/json' }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: controller.signal
    })
    if (!response.ok) return null
    const body = await response.json().catch(() => null)
    if (!body || typeof body !== 'object') return null
    if ('data' in body) return (body as { data: T }).data
    return body as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function buildServerRevenueContext(request?: Request): Promise<ServerRevenueContext> {
  const limitations: string[] = []
  const { periodStart, periodEnd } = currentPeriodBounds()

  const [billingUsage, providersPayload, telemetrySummary] = await Promise.all([
    fetchBackendJson<OrbAdminUsageSummary>(request, '/orb/admin/billing/usage', { days: '30' }),
    fetchBackendJson<{ providers?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>>; count?: number }>(
      request,
      '/api/providers'
    ),
    fetchBackendJson<{
      total_events?: number
      orb_conversations?: number
      ai_costs_gbp?: number
      events_by_type?: Record<string, number>
    }>(request, '/founder-os/telemetry/summary', { days: '30' })
  ])

  const rows = providersPayload?.providers ?? providersPayload?.items ?? []
  const providerAnalytics: ProviderAnalytics = {
    periodStart,
    periodEnd,
    totalProviders: providersPayload?.count ?? rows.length,
    totalHomes: rows.reduce((sum, row) => sum + (typeof row.homes_count === 'number' ? row.homes_count : 0), 0),
    totalMrr: 0,
    mrrTrendPercent: 0,
    providers: []
  }

  const billingConnected = Boolean(
    billingUsage &&
      ((billingUsage.total_requests ?? 0) > 0 ||
        (billingUsage.estimated_total_cost ?? 0) > 0 ||
        (billingUsage.total_active_users ?? 0) > 0)
  )

  if (!billingConnected) {
    limitations.push('Live billing source not connected.')
  }

  if (providerAnalytics.totalMrr <= 0) {
    limitations.push('MRR requires a live billing rollup — not yet connected.')
  }

  const eventsByType = telemetrySummary?.events_by_type ?? {}

  return {
    billingUsage,
    providerAnalytics,
    telemetrySummary: {
      totalEvents: telemetrySummary?.total_events ?? 0,
      orbConversations: telemetrySummary?.orb_conversations ?? 0,
      aiCostsGbp: telemetrySummary?.ai_costs_gbp ?? billingUsage?.estimated_total_cost ?? 0,
      subscriptionEvents: eventsByType['subscription-event'] ?? 0,
      signupEvents: eventsByType['user-signup'] ?? 0
    },
    billingConnected,
    limitations
  }
}

export function billingMetricsFromServerContext(ctx: ServerRevenueContext): BillingMetrics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  const usage = ctx.billingUsage
  const openAiSpendGbp = usage?.estimated_total_cost ?? ctx.telemetrySummary.aiCostsGbp ?? 0
  const totalConversations = usage?.total_requests ?? 0
  const totalActiveUsers = usage?.total_active_users ?? 0
  const totalProviders = ctx.providerAnalytics.totalProviders
  const totalMrr = ctx.providerAnalytics.totalMrr

  return {
    periodStart,
    periodEnd,
    openAiSpendGbp,
    totalConversations,
    totalActiveUsers,
    totalProviders,
    totalMrrGbp: totalMrr,
    costPerUserGbp: totalActiveUsers > 0 ? Number((openAiSpendGbp / totalActiveUsers).toFixed(2)) : 0,
    costPerProviderGbp: totalProviders > 0 ? Number((openAiSpendGbp / totalProviders).toFixed(2)) : 0,
    costPerConversationGbp:
      totalConversations > 0 ? Number((openAiSpendGbp / totalConversations).toFixed(2)) : 0,
    grossMarginPercent:
      totalMrr > 0 ? Number((((totalMrr - openAiSpendGbp) / totalMrr) * 100).toFixed(1)) : 0,
    modelBreakdown: []
  }
}
