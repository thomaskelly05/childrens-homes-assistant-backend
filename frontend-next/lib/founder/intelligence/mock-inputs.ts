/**
 * Mock platform inputs for intelligence engines.
 * Replace with live contract data when backend projections are ready.
 */

import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { UsageMetrics } from '@/lib/founder/contracts/usage-metrics'

const PERIOD_START = '2026-06-01'
const PERIOD_END = '2026-06-09'

export const mockUsageMetrics: UsageMetrics = {
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  activeUsers: 182,
  activeUsersTrendPercent: 9,
  totalSessions: 4821,
  dictateMinutes: 3840,
  reportBuilderGenerations: 734,
  chronologyBuilds: 412,
  riskAssessmentReviews: 276,
  orbConversations: 1847,
  featureUsage: [
    { featureId: 'dictate', featureName: 'Dictate', activeUsers: 171, sessions: 1240, adoptionRate: 94, trendPercent: 28, abandonmentRate: 6, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'orb-chat', featureName: 'ORB Chat', activeUsers: 160, sessions: 1847, adoptionRate: 88, trendPercent: 18, abandonmentRate: 8, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'report-builder', featureName: 'Report Builder', activeUsers: 131, sessions: 734, adoptionRate: 72, trendPercent: 11, abandonmentRate: 22, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'risk-assessment', featureName: 'Risk Assessment Review', activeUsers: 111, sessions: 276, adoptionRate: 61, trendPercent: 7, abandonmentRate: 18, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'inspection-readiness', featureName: 'Inspection evidence preparation', activeUsers: 106, sessions: 198, adoptionRate: 58, trendPercent: 14, abandonmentRate: 10, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'export-pdf', featureName: 'Export to PDF', activeUsers: 98, sessions: 412, adoptionRate: 54, trendPercent: 5, abandonmentRate: 12, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'chronology', featureName: 'Chronology Builder', activeUsers: 75, sessions: 412, adoptionRate: 41, trendPercent: 19, abandonmentRate: 34, periodStart: PERIOD_START, periodEnd: PERIOD_END },
    { featureId: 'supervision', featureName: 'Supervision Builder', activeUsers: 60, sessions: 143, adoptionRate: 33, trendPercent: 3, abandonmentRate: 41, periodStart: PERIOD_START, periodEnd: PERIOD_END }
  ]
}

export const mockOrbAnalytics: OrbConversationAnalytics = {
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  totalConversations: 1847,
  totalMessages: 9240,
  averageConversationLength: 5.0,
  satisfactionScore: 96,
  safeguardingQueryCount: 489,
  reportGenerationCount: 734,
  categories: [
    { categoryId: 'missing-from-home', categoryName: 'Missing from Home', conversationCount: 312, messageCount: 1560, trendPercent: 12, averageLength: 5.0 },
    { categoryId: 'safeguarding', categoryName: 'Safeguarding', conversationCount: 489, messageCount: 2445, trendPercent: 24, averageLength: 5.0 },
    { categoryId: 'risk-assessments', categoryName: 'Risk Assessments', conversationCount: 276, messageCount: 1380, trendPercent: 8, averageLength: 5.0 },
    { categoryId: 'key-work', categoryName: 'Key Work', conversationCount: 198, messageCount: 990, trendPercent: 6, averageLength: 5.0 },
    { categoryId: 'behaviour-support', categoryName: 'Behaviour Support', conversationCount: 164, messageCount: 820, trendPercent: 4, averageLength: 5.0 },
    { categoryId: 'child-exploitation', categoryName: 'Child Exploitation', conversationCount: 142, messageCount: 710, trendPercent: 21, averageLength: 5.0 },
    { categoryId: 'online-safety', categoryName: 'Online Safety', conversationCount: 128, messageCount: 640, trendPercent: 27, averageLength: 5.0 },
    { categoryId: 'substance-misuse', categoryName: 'Substance Misuse', conversationCount: 97, messageCount: 485, trendPercent: 9, averageLength: 5.0 }
  ],
  emergingThemes: [
    { theme: 'County lines exploitation queries rising across adolescent homes', confidence: 0.87, relatedCategories: ['child-exploitation', 'safeguarding'], firstDetected: '2026-05-28' },
    { theme: 'Managers requesting stronger chronology linkage in safeguarding outputs', confidence: 0.82, relatedCategories: ['safeguarding', 'chronology'], firstDetected: '2026-05-30' },
    { theme: 'Increased demand for Reg 44-aligned evaluation language', confidence: 0.79, relatedCategories: ['inspection-readiness'], firstDetected: '2026-06-02' },
    { theme: 'Dictate-led incident narratives reducing late record completion', confidence: 0.76, relatedCategories: ['dictate', 'reporting'], firstDetected: '2026-06-04' }
  ]
}

export const mockProviderAnalytics: ProviderAnalytics = {
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  totalProviders: 12,
  totalHomes: 27,
  totalMrr: 2483,
  mrrTrendPercent: 14,
  providers: [
    { providerId: 'p1', providerName: 'Provider A', homesCount: 4, activeUsers: 38, weeklyActiveUsers: 34, orbConversations: 312, dictateMinutes: 640, mrr: 320, churnRisk: 'low', lastActiveAt: '2026-06-09T08:12:00Z' },
    { providerId: 'p2', providerName: 'Provider B', homesCount: 3, activeUsers: 29, weeklyActiveUsers: 22, orbConversations: 198, dictateMinutes: 420, mrr: 240, churnRisk: 'medium', lastActiveAt: '2026-06-08T14:30:00Z' }
  ]
}

export const mockReadinessMetrics: ReadinessMetrics = {
  assessedAt: '2026-06-09T06:00:00Z',
  platformAverageScore: 81,
  commonGaps: [
    { gap: 'Missing child voice', frequency: 18 },
    { gap: 'Late records', frequency: 14 },
    { gap: 'Weak evaluation', frequency: 12 },
    { gap: 'Chronology gaps', frequency: 11 },
    { gap: 'Unsigned records', frequency: 9 },
    { gap: 'Incomplete safeguarding follow-up', frequency: 8 },
    { gap: 'Weak management oversight', frequency: 7 }
  ],
  homes: [
    {
      homeId: 'home-a',
      homeName: 'Home A',
      providerId: 'p1',
      overallScore: 94,
      lastAssessedAt: '2026-06-09T06:00:00Z',
      gaps: ['Minor chronology gaps'],
      categoryScores: [
        { categoryId: 'child-voice', categoryName: 'Child voice', score: 92, weight: 1, gapCount: 1 },
        { categoryId: 'safeguarding', categoryName: 'Safeguarding', score: 96, weight: 1, gapCount: 0 },
        { categoryId: 'chronology', categoryName: 'Chronology', score: 90, weight: 1, gapCount: 1 },
        { categoryId: 'management-oversight', categoryName: 'Management oversight', score: 95, weight: 1, gapCount: 0 },
        { categoryId: 'missing-from-home', categoryName: 'Missing from home recording', score: 94, weight: 1, gapCount: 0 },
        { categoryId: 'risk-assessments', categoryName: 'Risk assessments', score: 93, weight: 1, gapCount: 0 },
        { categoryId: 'evaluation-quality', categoryName: 'Evaluation quality', score: 91, weight: 1, gapCount: 1 },
        { categoryId: 'action-completion', categoryName: 'Action completion', score: 97, weight: 1, gapCount: 0 }
      ]
    },
    {
      homeId: 'home-b',
      homeName: 'Home B',
      providerId: 'p1',
      overallScore: 81,
      lastAssessedAt: '2026-06-09T06:00:00Z',
      gaps: ['Weak evaluation', 'Late records'],
      categoryScores: [
        { categoryId: 'child-voice', categoryName: 'Child voice', score: 78, weight: 1, gapCount: 2 },
        { categoryId: 'safeguarding', categoryName: 'Safeguarding', score: 85, weight: 1, gapCount: 1 },
        { categoryId: 'chronology', categoryName: 'Chronology', score: 80, weight: 1, gapCount: 1 },
        { categoryId: 'management-oversight', categoryName: 'Management oversight', score: 82, weight: 1, gapCount: 1 },
        { categoryId: 'missing-from-home', categoryName: 'Missing from home recording', score: 84, weight: 1, gapCount: 0 },
        { categoryId: 'risk-assessments', categoryName: 'Risk assessments', score: 79, weight: 1, gapCount: 1 },
        { categoryId: 'evaluation-quality', categoryName: 'Evaluation quality', score: 74, weight: 1, gapCount: 2 },
        { categoryId: 'action-completion', categoryName: 'Action completion', score: 86, weight: 1, gapCount: 1 }
      ]
    },
    {
      homeId: 'home-c',
      homeName: 'Home C',
      providerId: 'p2',
      overallScore: 69,
      lastAssessedAt: '2026-06-09T06:00:00Z',
      gaps: ['Missing child voice', 'Chronology gaps', 'Weak management oversight'],
      categoryScores: [
        { categoryId: 'child-voice', categoryName: 'Child voice', score: 58, weight: 1, gapCount: 3 },
        { categoryId: 'safeguarding', categoryName: 'Safeguarding', score: 72, weight: 1, gapCount: 2 },
        { categoryId: 'chronology', categoryName: 'Chronology', score: 64, weight: 1, gapCount: 3 },
        { categoryId: 'management-oversight', categoryName: 'Management oversight', score: 65, weight: 1, gapCount: 2 },
        { categoryId: 'missing-from-home', categoryName: 'Missing from home recording', score: 70, weight: 1, gapCount: 1 },
        { categoryId: 'risk-assessments', categoryName: 'Risk assessments', score: 68, weight: 1, gapCount: 2 },
        { categoryId: 'evaluation-quality', categoryName: 'Evaluation quality', score: 62, weight: 1, gapCount: 3 },
        { categoryId: 'action-completion', categoryName: 'Action completion', score: 74, weight: 1, gapCount: 1 }
      ]
    }
  ]
}

export const mockBillingMetrics: BillingMetrics = {
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  openAiSpendGbp: 184,
  totalConversations: 1847,
  totalActiveUsers: 182,
  totalProviders: 12,
  totalMrrGbp: 2483,
  costPerUserGbp: 1.01,
  costPerProviderGbp: 15.33,
  costPerConversationGbp: 0.1,
  grossMarginPercent: 91.2,
  modelBreakdown: [
    { modelId: 'gpt-4o', modelName: 'GPT-4o', requestCount: 4200, inputTokens: 8400000, outputTokens: 1200000, estimatedCostGbp: 142 },
    { modelId: 'gpt-4o-mini', modelName: 'GPT-4o Mini', requestCount: 8900, inputTokens: 4200000, outputTokens: 980000, estimatedCostGbp: 42 }
  ]
}
