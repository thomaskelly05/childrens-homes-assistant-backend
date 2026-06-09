/** Founder telemetry event types — anonymised operational metadata only. */

export const FOUNDER_TELEMETRY_EVENT_TYPES = [
  'orb-chat-submitted',
  'orb-response-generated',
  'orb-mode-usage',
  'orb-conversation',
  'dictate-started',
  'dictate-completed',
  'report-generation',
  'risk-assessment',
  'chronology-generation',
  'pdf-export',
  'user-login',
  'user-signup',
  'feedback',
  'error',
  'ai-request',
  'ai-token-usage',
  'ai-cost-estimate',
  'billing-event',
  'subscription-event',
  'feature-request'
] as const

export type FounderTelemetryEventType = (typeof FOUNDER_TELEMETRY_EVENT_TYPES)[number]

export type FounderTelemetryCategory =
  | 'orb'
  | 'features'
  | 'auth'
  | 'ai'
  | 'platform'
  | 'billing'
  | 'conversion'

export type FounderTelemetryEvent = {
  id: string
  eventType: FounderTelemetryEventType | string
  category: FounderTelemetryCategory | string
  source: string
  route?: string | null
  timestamp: string
  userRole?: string | null
  sessionId?: string | null
  organisationType?: string | null
  metadata: Record<string, unknown>
}

export type FounderTelemetryEventInput = Omit<FounderTelemetryEvent, 'id' | 'timestamp'> & {
  timestamp?: string
}

export type FounderTelemetrySummary = {
  totalEvents: number
  eventsToday: number
  orbConversations: number
  topOrbModes: Array<{ mode: string; count: number }>
  featureUsage: Array<{ feature: string; count: number }>
  aiRequests: number
  estimatedAiCost: number
  errors: number
  feedbackCount: number
  lastUpdated: string | null
  /** Derived error percentage for staff agent compatibility */
  errorRate: number
  /** Alias for estimated AI spend in GBP */
  aiCostsGbp: number
  /** Distinct session count when available from local events */
  activeUsers: number
  /** Login and signup events combined */
  conversionEvents: number
}

export const EMPTY_FOUNDER_TELEMETRY_SUMMARY: FounderTelemetrySummary = {
  totalEvents: 0,
  eventsToday: 0,
  orbConversations: 0,
  topOrbModes: [],
  featureUsage: [],
  aiRequests: 0,
  estimatedAiCost: 0,
  errors: 0,
  feedbackCount: 0,
  lastUpdated: null,
  errorRate: 0,
  aiCostsGbp: 0,
  activeUsers: 0,
  conversionEvents: 0
}
