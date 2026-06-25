import {
  DEMO_ABUSE_INDICATORS,
  DEMO_HOMES,
  DEMO_PROVIDERS,
  DEMO_SAFETY_FLAGS,
  DEMO_SUPPORT_TICKETS,
  DEMO_USAGE_ACTIVITY,
  DEMO_USERS
} from './demo-data'
import { getAdminDataMode } from './admin-data-mode'
import type { AdminOverviewMetrics, LiveUsageMetrics } from './types'

export function buildAdminOverviewMetrics(): AdminOverviewMetrics {
  const mode = getAdminDataMode()
  if (mode === 'live') {
    // Phase 1: live API not wired — return zeros with honest labelling via data mode badge
    return {
      totalUsers: 0,
      activeUsers: 0,
      disabledUsers: 0,
      invitedUsers: 0,
      providers: 0,
      homes: 0,
      openSafetyFlags: 0,
      suspiciousActivityAlerts: 0,
      onboardingProviders: 0,
      supportActionsPending: 0
    }
  }

  const users = DEMO_USERS
  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === 'active').length,
    disabledUsers: users.filter((u) => u.status === 'disabled' || u.status === 'deleted').length,
    invitedUsers: users.filter((u) => u.status === 'invited').length,
    providers: DEMO_PROVIDERS.length,
    homes: DEMO_HOMES.length,
    openSafetyFlags: DEMO_SAFETY_FLAGS.filter((f) => f.status === 'open' || f.status === 'reviewing').length,
    suspiciousActivityAlerts: DEMO_ABUSE_INDICATORS.filter(
      (a) => a.status === 'open' || a.status === 'investigating'
    ).length,
    onboardingProviders: DEMO_PROVIDERS.filter((p) => p.status === 'onboarding').length,
    supportActionsPending: DEMO_SUPPORT_TICKETS.filter(
      (t) => t.status === 'pending' || t.status === 'in-progress' || t.status === 'escalated'
    ).length
  }
}

export function buildLiveUsageMetrics(): LiveUsageMetrics {
  const mode = getAdminDataMode()
  if (mode === 'live') {
    return {
      activeUsersToday: 0,
      activeUsersThisWeek: 0,
      stationUsage: { chat: 0, write: 0, dictate: 0, voice: 0, communicate: 0 },
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTimeMs: null,
      latestActivity: []
    }
  }

  return {
    activeUsersToday: 14,
    activeUsersThisWeek: 47,
    stationUsage: {
      chat: 128,
      write: 89,
      dictate: 34,
      voice: 12,
      communicate: 21
    },
    totalRequests: 284,
    failedRequests: 3,
    averageResponseTimeMs: null,
    latestActivity: DEMO_USAGE_ACTIVITY
  }
}
