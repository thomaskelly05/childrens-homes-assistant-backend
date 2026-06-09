import type { FounderTelemetryEvent, FounderTelemetrySummary } from './founder-telemetry-types'
import { EMPTY_FOUNDER_TELEMETRY_SUMMARY } from './founder-telemetry-types'

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

export function aggregateFounderTelemetry(events: FounderTelemetryEvent[]): FounderTelemetrySummary {
  if (!events.length) return { ...EMPTY_FOUNDER_TELEMETRY_SUMMARY }

  const orbTypes = new Set([
    'orb-chat-submitted',
    'orb-response-generated',
    'orb-conversation'
  ])
  const modeCounts = new Map<string, number>()
  const featureCounts = new Map<string, number>()

  let aiRequests = 0
  let estimatedAiCost = 0
  let errors = 0
  let feedbackCount = 0
  let eventsToday = 0
  let conversionEvents = 0
  let lastUpdated: string | null = null
  const sessions = new Set<string>()

  for (const event of events) {
    if (isToday(event.timestamp)) eventsToday += 1
    if (!lastUpdated || event.timestamp > lastUpdated) lastUpdated = event.timestamp

    if (event.eventType === 'error') errors += 1
    if (event.eventType === 'feedback') feedbackCount += 1
    if (event.eventType === 'user-login' || event.eventType === 'user-signup') conversionEvents += 1
    if (event.sessionId) sessions.add(event.sessionId)
    if (event.eventType === 'ai-request' || event.eventType === 'ai-token-usage') aiRequests += 1
    if (event.eventType === 'ai-cost-estimate') {
      const cost = Number(event.metadata.estimatedCostGbp ?? event.metadata.costGbp ?? 0)
      if (!Number.isNaN(cost)) estimatedAiCost += cost
    }

    const mode = String(event.metadata.mode ?? event.metadata.orbMode ?? '')
    if (mode && (event.eventType === 'orb-mode-usage' || orbTypes.has(event.eventType))) {
      modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1)
    }

    const feature = String(event.metadata.feature ?? event.category ?? event.eventType)
    if (feature) {
      featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1)
    }
  }

  const topOrbModes = [...modeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([mode, count]) => ({ mode, count }))

  const featureUsage = [...featureCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([feature, count]) => ({ feature, count }))

  const totalEvents = events.length
  const errorRate = totalEvents > 0 ? Math.round((errors / totalEvents) * 100) : 0
  const roundedCost = Number(estimatedAiCost.toFixed(4))

  return {
    totalEvents,
    eventsToday,
    orbConversations: events.filter((event) => orbTypes.has(event.eventType)).length,
    topOrbModes,
    featureUsage,
    aiRequests,
    estimatedAiCost: roundedCost,
    errors,
    feedbackCount,
    lastUpdated,
    errorRate,
    aiCostsGbp: roundedCost,
    activeUsers: sessions.size,
    conversionEvents
  }
}
