/**
 * Founder telemetry service — records live platform events with anonymised metadata only.
 */

import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateOrbIntelligence
} from '@/lib/founder/intelligence'
import type { FounderTelemetryEvent, FounderTelemetryEventType } from './founder-telemetry-types'
import { addFounderTelemetryEvent, getFounderTelemetryEvents, setFounderTelemetryEvents } from './founder-telemetry-store'

const FORBIDDEN_METADATA_KEYS = [
  'childName',
  'staffName',
  'providerName',
  'address',
  'safeguardingNarrative',
  'recordText',
  'child_name',
  'staff_name',
  'provider_name'
]

function sanitiseMetadata(
  metadata: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) continue
    if (typeof value === 'string' && value.length > 200) continue
    clean[key] = value
  }
  return clean
}

const TYPE_TO_CATEGORY: Record<FounderTelemetryEventType, FounderTelemetryEvent['category']> = {
  'user-signup': 'users',
  'user-login': 'users',
  'orb-conversation': 'orb',
  'orb-mode-usage': 'orb',
  'dictate-usage': 'features',
  'report-generation': 'features',
  'risk-assessment': 'features',
  'chronology-generation': 'features',
  'pdf-export': 'features',
  'billing-event': 'billing',
  'subscription-event': 'billing',
  'ai-request': 'ai',
  'ai-token-usage': 'ai',
  'ai-cost-estimate': 'ai',
  error: 'errors',
  feedback: 'feedback',
  'feature-request': 'feedback'
}

export function recordFounderTelemetryEvent(
  event: Omit<FounderTelemetryEvent, 'id' | 'category'> & {
    category?: FounderTelemetryEvent['category']
  }
): FounderTelemetryEvent {
  const category = event.category ?? TYPE_TO_CATEGORY[event.type]
  return addFounderTelemetryEvent({
    ...event,
    category,
    metadata: sanitiseMetadata(event.metadata)
  })
}

/**
 * Hydrate telemetry from live founder adapters (no mock events).
 */
export function hydrateFounderTelemetryFromLiveData(): void {
  const inputs = getFounderContractInputs()
  const { usageMetrics, orbConversationAnalytics, billingMetrics, dataSourceStatus } = inputs
  const newEvents: FounderTelemetryEvent[] = []
  const now = new Date().toISOString()

  if (usageMetrics.activeUsers > 0) {
    newEvents.push({
      id: 'live-active-users',
      type: 'user-login',
      category: 'users',
      timestamp: now,
      source: 'users-adapter',
      metadata: {
        activeUsers: usageMetrics.activeUsers,
        totalSessions: usageMetrics.totalSessions
      }
    })
  }

  const orbIntel = calculateOrbIntelligence(orbConversationAnalytics)
  if (orbIntel.totalConversations > 0) {
    newEvents.push({
      id: 'live-orb-conversations',
      type: 'orb-conversation',
      category: 'orb',
      timestamp: now,
      source: 'orb-conversations-adapter',
      metadata: {
        totalConversations: orbIntel.totalConversations,
        safeguardingVolume: orbIntel.safeguardingQueryVolume
      }
    })

    for (const cat of orbIntel.categories) {
      if (cat.volume > 0) {
        newEvents.push({
          id: `live-orb-mode-${cat.name}`,
          type: 'orb-mode-usage',
          category: 'orb',
          timestamp: now,
          source: 'orb-conversations-adapter',
          metadata: { mode: cat.name, count: cat.volume }
        })
      }
    }
  }

  for (const feature of usageMetrics.featureUsage) {
    if (feature.adoptionRate > 0) {
      const typeMap: Record<string, FounderTelemetryEventType> = {
        dictate: 'dictate-usage',
        chronology: 'chronology-generation',
        'report-builder': 'report-generation',
        'risk-assessment': 'risk-assessment'
      }
      newEvents.push({
        id: `live-feature-${feature.featureId}`,
        type: typeMap[feature.featureId] ?? 'dictate-usage',
        category: 'features',
        timestamp: now,
        source: 'feature-events-adapter',
        metadata: {
          feature: feature.featureName,
          adoptionRate: feature.adoptionRate,
          trendPercent: feature.trendPercent
        }
      })
    }
  }

  const aiCost = calculateAiCost(billingMetrics)
  if (aiCost.raw.openAiSpendGbp > 0) {
    newEvents.push({
      id: 'live-ai-cost',
      type: 'ai-cost-estimate',
      category: 'ai',
      timestamp: now,
      source: 'billing-adapter',
      metadata: {
        spendGbp: aiCost.raw.openAiSpendGbp,
        costPerConversation: aiCost.raw.costPerConversationGbp
      }
    })
  }

  if (billingMetrics.totalMrrGbp > 0) {
    newEvents.push({
      id: 'live-billing',
      type: 'billing-event',
      category: 'billing',
      timestamp: now,
      source: 'billing-adapter',
      metadata: { mrrGbp: billingMetrics.totalMrrGbp }
    })
  }

  if (dataSourceStatus.limitations.length > 0) {
    for (const [i, limitation] of dataSourceStatus.limitations.entries()) {
      newEvents.push({
        id: `live-limitation-${i}`,
        type: 'error',
        category: 'errors',
        timestamp: now,
        source: 'founder-data-source',
        metadata: { message: limitation.slice(0, 120) }
      })
    }
  }

  const existingManual = getFounderTelemetryEvents().filter((e) => !e.id.startsWith('live-'))
  setFounderTelemetryEvents([...newEvents, ...existingManual])
}
