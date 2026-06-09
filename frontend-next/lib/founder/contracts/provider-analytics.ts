/**
 * Future live integration contract for provider-level analytics.
 * No API implementation yet — defines the shape for backend projections.
 */

export type ProviderActivityMetric = {
  providerId: string
  providerName: string
  homesCount: number
  activeUsers: number
  weeklyActiveUsers: number
  orbConversations: number
  dictateMinutes: number
  mrr: number
  churnRisk: 'low' | 'medium' | 'high'
  lastActiveAt: string
}

export type ProviderAnalytics = {
  periodStart: string
  periodEnd: string
  totalProviders: number
  totalHomes: number
  totalMrr: number
  mrrTrendPercent: number
  providers: ProviderActivityMetric[]
}
