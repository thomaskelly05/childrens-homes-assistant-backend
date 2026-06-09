import { recordFounderTelemetryEvent } from './founder-telemetry-service'
import type { FounderTelemetryCategory, FounderTelemetryEventType } from './founder-telemetry-types'

type InstrumentOptions = {
  eventType: FounderTelemetryEventType | string
  category: FounderTelemetryCategory | string
  source: string
  route?: string
  userRole?: string | null
  metadata?: Record<string, unknown>
}

function currentRoute(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.location.pathname
}

export function instrumentFounderTelemetry(options: InstrumentOptions): void {
  recordFounderTelemetryEvent({
    eventType: options.eventType,
    category: options.category,
    source: options.source,
    route: options.route ?? currentRoute(),
    userRole: options.userRole ?? null,
    metadata: options.metadata ?? {}
  })
}

export function instrumentOrbChatSubmitted(metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'orb-chat-submitted',
    category: 'orb',
    source: 'orb-standalone',
    metadata
  })
}

export function instrumentOrbResponseGenerated(metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'orb-response-generated',
    category: 'orb',
    source: 'orb-standalone',
    metadata
  })
}

export function instrumentOrbModeUsed(mode: string, metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'orb-mode-usage',
    category: 'orb',
    source: 'orb-standalone',
    metadata: { mode, ...metadata }
  })
}

export function instrumentDictateStarted(metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'dictate-started',
    category: 'features',
    source: 'orb-dictate',
    metadata: { feature: 'dictate', ...metadata }
  })
}

export function instrumentDictateCompleted(metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'dictate-completed',
    category: 'features',
    source: 'orb-dictate',
    metadata: { feature: 'dictate', ...metadata }
  })
}

export function instrumentReportGenerated(templateId?: string): void {
  instrumentFounderTelemetry({
    eventType: 'report-generation',
    category: 'features',
    source: 'regulatory-reporting',
    metadata: { feature: 'report-generation', templateId: templateId ?? 'unknown' }
  })
}

export function instrumentRiskAssessmentGenerated(): void {
  instrumentFounderTelemetry({
    eventType: 'risk-assessment',
    category: 'features',
    source: 'regulatory-reporting',
    metadata: { feature: 'risk-assessment' }
  })
}

export function instrumentChronologyGenerated(): void {
  instrumentFounderTelemetry({
    eventType: 'chronology-generation',
    category: 'features',
    source: 'regulatory-reporting',
    metadata: { feature: 'chronology-generation' }
  })
}

export function instrumentPdfExport(format: string, feature = 'pdf-export'): void {
  instrumentFounderTelemetry({
    eventType: 'pdf-export',
    category: 'features',
    source: 'export',
    metadata: { feature, format }
  })
}

export function instrumentUserLogin(userRole?: string | null): void {
  instrumentFounderTelemetry({
    eventType: 'user-login',
    category: 'auth',
    source: 'auth',
    userRole,
    metadata: { feature: 'login' }
  })
}

export function instrumentUserSignup(userRole?: string | null): void {
  instrumentFounderTelemetry({
    eventType: 'user-signup',
    category: 'auth',
    source: 'auth',
    userRole,
    metadata: { feature: 'signup' }
  })
}

export function instrumentFeedbackSubmitted(metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'feedback',
    category: 'platform',
    source: 'orb-feedback',
    metadata: { feature: 'feedback', ...metadata }
  })
}

export function instrumentErrorEncountered(code: string, metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'error',
    category: 'platform',
    source: 'platform',
    metadata: { code, ...metadata }
  })
}

export function instrumentAiRequest(metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'ai-request',
    category: 'ai',
    source: 'ai',
    metadata
  })
}

export function instrumentAiCostEstimate(estimatedCostGbp: number, metadata: Record<string, unknown> = {}): void {
  instrumentFounderTelemetry({
    eventType: 'ai-cost-estimate',
    category: 'ai',
    source: 'ai',
    metadata: { estimatedCostGbp, ...metadata }
  })
}
