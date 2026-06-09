/**
 * Future live integration contract for platform usage metrics.
 * No API implementation yet — defines the shape for backend projections.
 */

export type FeatureUsageMetric = {
  featureId: string
  featureName: string
  activeUsers: number
  sessions: number
  adoptionRate: number
  trendPercent: number
  abandonmentRate: number
  periodStart: string
  periodEnd: string
}

export type UsageMetrics = {
  periodStart: string
  periodEnd: string
  activeUsers: number
  activeUsersTrendPercent: number
  totalSessions: number
  featureUsage: FeatureUsageMetric[]
  dictateMinutes: number
  reportBuilderGenerations: number
  chronologyBuilds: number
  riskAssessmentReviews: number
  orbConversations: number
}
