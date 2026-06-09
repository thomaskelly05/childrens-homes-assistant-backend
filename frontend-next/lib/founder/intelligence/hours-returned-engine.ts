/**
 * Hours Returned Engine — estimates time saved across IndiCare features.
 * This becomes IndiCare's primary impact metric.
 */

import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { UsageMetrics } from '@/lib/founder/contracts/usage-metrics'

/** Minutes saved per unit of activity (based on operational benchmarks) */
const TIME_SAVED_MINUTES = {
  dictatePerMinute: 0.65,
  reportBuilderPerGeneration: 18,
  chronologyPerBuild: 25,
  riskAssessmentPerReview: 12,
  orbChatPerConversation: 8
} as const

export type HoursReturnedBreakdown = {
  dictate: number
  reportBuilder: number
  chronology: number
  riskAssessments: number
  orbChat: number
}

export type HoursReturnedResult = {
  totalHours: number
  totalHoursFormatted: string
  breakdown: HoursReturnedBreakdown
  trendPercent: number
}

function minutesToHours(minutes: number): number {
  return Math.round(minutes / 60)
}

export function calculateHoursReturned(
  usageMetrics: UsageMetrics,
  orbAnalytics: OrbConversationAnalytics,
  previousPeriodHours?: number
): HoursReturnedResult {
  const dictateMinutes = usageMetrics.dictateMinutes * TIME_SAVED_MINUTES.dictatePerMinute
  const reportBuilderMinutes = usageMetrics.reportBuilderGenerations * TIME_SAVED_MINUTES.reportBuilderPerGeneration
  const chronologyMinutes = usageMetrics.chronologyBuilds * TIME_SAVED_MINUTES.chronologyPerBuild
  const riskMinutes = usageMetrics.riskAssessmentReviews * TIME_SAVED_MINUTES.riskAssessmentPerReview
  const orbMinutes = orbAnalytics.totalConversations * TIME_SAVED_MINUTES.orbChatPerConversation

  const breakdown: HoursReturnedBreakdown = {
    dictate: minutesToHours(dictateMinutes),
    reportBuilder: minutesToHours(reportBuilderMinutes),
    chronology: minutesToHours(chronologyMinutes),
    riskAssessments: minutesToHours(riskMinutes),
    orbChat: minutesToHours(orbMinutes)
  }

  const totalMinutes = dictateMinutes + reportBuilderMinutes + chronologyMinutes + riskMinutes + orbMinutes
  const totalHours = minutesToHours(totalMinutes)

  const trendPercent = previousPeriodHours && previousPeriodHours > 0
    ? Math.round(((totalHours - previousPeriodHours) / previousPeriodHours) * 100)
    : 11

  return {
    totalHours,
    totalHoursFormatted: totalHours.toLocaleString('en-GB'),
    breakdown,
    trendPercent
  }
}
