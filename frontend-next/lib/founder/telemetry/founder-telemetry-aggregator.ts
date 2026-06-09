import { getFounderTelemetryEvents } from './founder-telemetry-store'
import type { FounderTelemetrySummary } from './founder-telemetry-types'

export function getFounderTelemetrySummary(): FounderTelemetrySummary {
  const events = getFounderTelemetryEvents()

  if (events.length === 0) {
    return {
      totalEvents: 0,
      activeUsers: 0,
      orbConversations: 0,
      topOrbModes: [],
      featureUsage: [],
      aiCostsGbp: 0,
      errorRate: 0,
      conversionEvents: 0,
      lastUpdated: null
    }
  }

  const orbConversations = events
    .filter((e) => e.type === 'orb-conversation')
    .reduce((sum, e) => sum + Number(e.metadata.totalConversations ?? 1), 0)

  const activeUsers = Math.max(
    ...events
      .filter((e) => e.type === 'user-login' || e.type === 'user-signup')
      .map((e) => Number(e.metadata.activeUsers ?? e.metadata.count ?? 0)),
    0
  )

  const modeCounts = new Map<string, number>()
  for (const e of events.filter((ev) => ev.type === 'orb-mode-usage')) {
    const mode = String(e.metadata.mode ?? 'unknown')
    modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + Number(e.metadata.count ?? 1))
  }
  const topOrbModes = [...modeCounts.entries()]
    .map(([mode, count]) => ({ mode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const featureCounts = new Map<string, number>()
  for (const e of events.filter((ev) => ev.category === 'features')) {
    const feature = String(e.metadata.feature ?? e.type)
    featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1)
  }
  const featureUsage = [...featureCounts.entries()]
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)

  const aiCostsGbp = events
    .filter((e) => e.type === 'ai-cost-estimate')
    .reduce((sum, e) => sum + Number(e.metadata.spendGbp ?? 0), 0)

  const errorCount = events.filter((e) => e.type === 'error').length
  const errorRate = events.length > 0 ? Math.round((errorCount / events.length) * 100) : 0

  const conversionEvents = events.filter(
    (e) => e.type === 'user-signup' || e.type === 'subscription-event' || e.type === 'billing-event'
  ).length

  const timestamps = events.map((e) => e.timestamp).sort()
  const lastUpdated = timestamps[timestamps.length - 1] ?? null

  return {
    totalEvents: events.length,
    activeUsers,
    orbConversations,
    topOrbModes,
    featureUsage,
    aiCostsGbp,
    errorRate,
    conversionEvents,
    lastUpdated
  }
}
