import { fetchAiUsageAdapter } from '@/lib/founder/data/adapters/ai-usage-adapter'
import { fetchOrbConversationsAdapter } from '@/lib/founder/data/adapters/orb-conversations-adapter'
import {
  fetchFounderTelemetrySummary,
  postFounderTelemetryEvent,
  sendFounderTelemetryEvent
} from './founder-telemetry-client'
import { aggregateFounderTelemetry } from './founder-telemetry-aggregator'
import { redactTelemetryMetadata } from './founder-telemetry-redaction'
import {
  appendLocalTelemetryEvent,
  getLocalTelemetryEvents,
  setLocalTelemetryEvents
} from './founder-telemetry-store'
import type {
  FounderTelemetryEvent,
  FounderTelemetryEventInput,
  FounderTelemetrySummary
} from './founder-telemetry-types'
import { EMPTY_FOUNDER_TELEMETRY_SUMMARY } from './founder-telemetry-types'

let cachedSummary: FounderTelemetrySummary | null = null
let summaryFetchedAt = 0
const SUMMARY_TTL_MS = 30_000

function createEventId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `tel-${crypto.randomUUID()}`
  return `tel-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const key = 'founder-telemetry-session'
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const created = createEventId()
    window.sessionStorage.setItem(key, created)
    return created
  } catch {
    return null
  }
}

function normaliseEvent(input: FounderTelemetryEventInput): FounderTelemetryEvent {
  return {
    id: createEventId(),
    eventType: input.eventType,
    category: input.category,
    source: input.source,
    route: input.route ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
    userRole: input.userRole ?? null,
    sessionId: input.sessionId ?? getSessionId(),
    organisationType: input.organisationType ?? null,
    metadata: redactTelemetryMetadata(input.metadata ?? {}) as Record<string, unknown>
  }
}

export function recordFounderTelemetryEvent(input: FounderTelemetryEventInput): void {
  const event = normaliseEvent(input)
  appendLocalTelemetryEvent(event)
  cachedSummary = null
  if (typeof window !== 'undefined') {
    sendFounderTelemetryEvent(input)
  }
}

export function getFounderTelemetryEvents(): FounderTelemetryEvent[] {
  return getLocalTelemetryEvents()
}

function enrichSummary(summary: Partial<FounderTelemetrySummary>): FounderTelemetrySummary {
  const totalEvents = summary.totalEvents ?? 0
  const errors = summary.errors ?? 0
  const estimatedAiCost = summary.estimatedAiCost ?? summary.aiCostsGbp ?? 0
  return {
    ...EMPTY_FOUNDER_TELEMETRY_SUMMARY,
    ...summary,
    estimatedAiCost,
    errorRate: summary.errorRate ?? (totalEvents > 0 ? Math.round((errors / totalEvents) * 100) : 0),
    aiCostsGbp: summary.aiCostsGbp ?? estimatedAiCost,
    activeUsers: summary.activeUsers ?? 0,
    conversionEvents: summary.conversionEvents ?? 0
  }
}

export function getFounderTelemetrySummary(): FounderTelemetrySummary {
  const local = aggregateFounderTelemetry(getLocalTelemetryEvents())
  if (cachedSummary) {
    return enrichSummary({
      ...cachedSummary,
      topOrbModes: cachedSummary.topOrbModes.length ? cachedSummary.topOrbModes : local.topOrbModes,
      featureUsage: cachedSummary.featureUsage.length ? cachedSummary.featureUsage : local.featureUsage,
      activeUsers: local.activeUsers,
      conversionEvents: local.conversionEvents,
      errorRate: cachedSummary.errorRate ?? local.errorRate
    })
  }
  return local
}

export async function refreshFounderTelemetrySummary(days = 30): Promise<FounderTelemetrySummary> {
  const now = Date.now()
  if (cachedSummary && now - summaryFetchedAt < SUMMARY_TTL_MS) {
    return getFounderTelemetrySummary()
  }

  try {
    const remote = await fetchFounderTelemetrySummary(days)
    if (remote) {
      cachedSummary = remote
      summaryFetchedAt = now
    }
  } catch {
    /* keep local aggregate */
  }

  return getFounderTelemetrySummary()
}

let hydrationDone = false

/** Seed local telemetry from aggregated live adapters when persisted events are sparse. */
export async function hydrateFounderTelemetryFromLiveData(): Promise<void> {
  if (hydrationDone && getLocalTelemetryEvents().length > 20) return

  const [orbResult, aiResult] = await Promise.all([
    fetchOrbConversationsAdapter().catch(() => null),
    fetchAiUsageAdapter().catch(() => null)
  ])

  const synthetic: FounderTelemetryEvent[] = []
  const timestamp = new Date().toISOString()

  if (orbResult?.data) {
    const analytics = orbResult.data
    if (analytics.totalConversations > 0) {
      synthetic.push({
        id: createEventId(),
        eventType: 'orb-conversation',
        category: 'orb',
        source: 'orb-admin-adapter',
        timestamp,
        metadata: {
          count: analytics.totalConversations,
          satisfactionScore: analytics.satisfactionScore
        }
      })
    }
    for (const category of analytics.categories ?? []) {
      synthetic.push({
        id: createEventId(),
        eventType: 'orb-mode-usage',
        category: 'orb',
        source: 'orb-admin-adapter',
        timestamp,
        metadata: {
          mode: category.categoryName,
          count: category.conversationCount
        }
      })
    }
  }

  if (aiResult?.data) {
    synthetic.push({
      id: createEventId(),
      eventType: 'ai-cost-estimate',
      category: 'ai',
      source: 'ai-usage-adapter',
      timestamp,
      metadata: {
        estimatedCostGbp: aiResult.data.openAiSpendGbp,
        totalRequests: aiResult.data.totalRequests
      }
    })
    synthetic.push({
      id: createEventId(),
      eventType: 'ai-request',
      category: 'ai',
      source: 'ai-usage-adapter',
      timestamp,
      metadata: { count: aiResult.data.totalRequests }
    })
  }

  if (synthetic.length) {
    const merged = [...synthetic, ...getLocalTelemetryEvents()]
    setLocalTelemetryEvents(merged)
  }

  hydrationDone = true
}

export { postFounderTelemetryEvent }
