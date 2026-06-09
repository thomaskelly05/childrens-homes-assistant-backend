import type { OrbAdminUsageSummary } from '@/lib/orb/admin-quality-client'
import { ORB_ADMIN_API_PATHS } from '@/lib/orb/admin-quality-client'
import { mockUsageMetrics } from '@/lib/founder/intelligence/mock-inputs'
import type { FounderAdapterResult, FounderUsersAggregate } from './adapter-types'
import { currentPeriodBounds, fetchJson } from './adapter-utils'

export async function fetchUsersAdapter(): Promise<FounderAdapterResult<FounderUsersAggregate>> {
  const limitations: string[] = []

  const usage = await fetchJson<OrbAdminUsageSummary>(`${ORB_ADMIN_API_PATHS.billingUsage}?days=30`)
  if (!usage || typeof usage.total_active_users !== 'number') {
    return {
      data: {
        activeUsers: mockUsageMetrics.activeUsers,
        activeUsersTrendPercent: mockUsageMetrics.activeUsersTrendPercent,
        totalSessions: mockUsageMetrics.totalSessions
      },
      source: 'mock',
      limitations: ['User counts unavailable — using estimated mock active user metrics.']
    }
  }

  const trend =
    usage.daily_usage_trend.length >= 2
      ? Math.round(
          ((usage.daily_usage_trend.at(-1)?.requests ?? 0) /
            Math.max(usage.daily_usage_trend[0]?.requests ?? 1, 1) -
            1) *
            100
        )
      : mockUsageMetrics.activeUsersTrendPercent

  const totalSessions = usage.total_requests || mockUsageMetrics.totalSessions

  if (usage.total_active_users === 0) {
    limitations.push('Live user feed returned zero active users — counts may be incomplete.')
  }

  return {
    data: {
      activeUsers: usage.total_active_users,
      activeUsersTrendPercent: trend,
      totalSessions
    },
    source: 'live',
    limitations
  }
}

/** Sync fallback for server render or pre-probe state. */
export function getUsersAdapterFallback(): FounderAdapterResult<FounderUsersAggregate> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    data: {
      activeUsers: mockUsageMetrics.activeUsers,
      activeUsersTrendPercent: mockUsageMetrics.activeUsersTrendPercent,
      totalSessions: mockUsageMetrics.totalSessions
    },
    source: 'mock',
    limitations: [
      `User metrics estimated from mock inputs for ${periodStart} to ${periodEnd}.`
    ]
  }
}
