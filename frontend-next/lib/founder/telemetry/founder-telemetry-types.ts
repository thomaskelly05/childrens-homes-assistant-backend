export type FounderTelemetryEventType =
  | 'user-signup'
  | 'user-login'
  | 'orb-conversation'
  | 'orb-mode-usage'
  | 'dictate-usage'
  | 'report-generation'
  | 'risk-assessment'
  | 'chronology-generation'
  | 'pdf-export'
  | 'billing-event'
  | 'subscription-event'
  | 'ai-request'
  | 'ai-token-usage'
  | 'ai-cost-estimate'
  | 'error'
  | 'feedback'
  | 'feature-request'

export type FounderTelemetryCategory =
  | 'users'
  | 'orb'
  | 'features'
  | 'billing'
  | 'ai'
  | 'errors'
  | 'feedback'
  | 'conversion'

export type FounderTelemetryEvent = {
  id: string
  type: FounderTelemetryEventType
  category: FounderTelemetryCategory
  timestamp: string
  source: string
  route?: string
  userRole?: string
  organisationType?: string
  metadata: Record<string, string | number | boolean>
}

export type FounderTelemetrySummary = {
  totalEvents: number
  activeUsers: number
  orbConversations: number
  topOrbModes: Array<{ mode: string; count: number }>
  featureUsage: Array<{ feature: string; count: number }>
  aiCostsGbp: number
  errorRate: number
  conversionEvents: number
  lastUpdated: string | null
}
