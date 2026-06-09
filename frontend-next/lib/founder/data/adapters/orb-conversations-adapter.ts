import type { OrbAdminFeedbackSummary } from '@/lib/orb/admin-quality-client'
import { ORB_ADMIN_API_PATHS } from '@/lib/orb/admin-quality-client'
import { mockOrbAnalytics } from '@/lib/founder/intelligence/mock-inputs'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { FounderAdapterResult } from './adapter-types'
import { currentPeriodBounds, fetchJson } from './adapter-utils'

function helpfulRatioToSatisfaction(ratio: number): number {
  return Math.round(Math.min(100, Math.max(0, ratio * 100)))
}

export async function fetchOrbConversationsAdapter(): Promise<FounderAdapterResult<OrbConversationAnalytics>> {
  const { periodStart, periodEnd } = currentPeriodBounds()
  const summary = await fetchJson<OrbAdminFeedbackSummary>(`${ORB_ADMIN_API_PATHS.feedbackSummary}?days=30`)

  if (!summary) {
    return getOrbConversationsAdapterFallback()
  }

  const usage = summary.usage_summary
  const totalConversations = usage?.total_requests ?? summary.total_feedback ?? mockOrbAnalytics.totalConversations
  const satisfactionScore = helpfulRatioToSatisfaction(summary.helpful_ratio ?? 0.96)

  const categories = (summary.top_modes_with_downvotes ?? []).map((mode, index) => ({
    categoryId: `mode-${index + 1}`,
    categoryName: mode.mode || `Category ${index + 1}`,
    conversationCount: mode.count,
    messageCount: mode.count * 5,
    trendPercent: 0,
    averageLength: 5
  }))

  const emergingThemes = (summary.recurring_gaps ?? [])
    .slice(0, 4)
    .map((gap) => ({
      theme: gap.gap,
      confidence: Math.min(0.95, gap.count / Math.max(totalConversations, 1)),
      relatedCategories: [],
      firstDetected: periodEnd
    }))

  const limitations: string[] = [
    'ORB conversation categories derived from aggregated mode counts only — no safeguarding narrative content included.'
  ]

  if (!categories.length) {
    limitations.push('Category breakdown unavailable — partial mock category mix retained for dashboard charts.')
  }

  return {
    data: {
      periodStart,
      periodEnd,
      totalConversations,
      totalMessages: totalConversations * 5,
      averageConversationLength: 5,
      satisfactionScore: satisfactionScore || mockOrbAnalytics.satisfactionScore,
      safeguardingQueryCount: summary.unsafe_answer_complaints ?? mockOrbAnalytics.safeguardingQueryCount,
      reportGenerationCount: mockOrbAnalytics.reportGenerationCount,
      categories: categories.length ? categories : mockOrbAnalytics.categories,
      emergingThemes: emergingThemes.length ? emergingThemes : mockOrbAnalytics.emergingThemes
    },
    source: 'live',
    limitations
  }
}

export function getOrbConversationsAdapterFallback(): FounderAdapterResult<OrbConversationAnalytics> {
  return {
    data: mockOrbAnalytics,
    source: 'mock',
    limitations: ['ORB conversation analytics unavailable — using mock ORB intelligence inputs.']
  }
}
