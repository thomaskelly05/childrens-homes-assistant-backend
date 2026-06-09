import {
  canCalculateLiveHoursReturned,
  hasLiveAiUsage,
  hasLiveBillingData,
  hasLiveFeatureEvents,
  hasLiveOrbAnalytics,
  hasLiveReadinessData,
  hasLiveUserAnalytics
} from '@/lib/founder/data/founder-live-availability'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'

export type FounderOrbNoLiveAnswer = {
  answer: string
  usedSources: string[]
  suggestedFollowUps: string[]
  confidence: 'high' | 'medium' | 'low'
}

export const ORB_FOUNDER_NO_LIVE_DATA = 'I do not have live data for that yet.'

export function orbFounderNoLiveDataAnswer(usedSources: string[] = ['Founder Data Status']): FounderOrbNoLiveAnswer {
  return {
    answer: ORB_FOUNDER_NO_LIVE_DATA,
    usedSources,
    suggestedFollowUps: [
      'Which live data sources are connected?',
      'What should I focus on while live data is being connected?'
    ],
    confidence: 'low'
  }
}

export function orbFounderLiveInputs() {
  const inputs = getFounderContractInputs()
  const status = inputs.dataSourceStatus
  return {
    inputs,
    status,
    hasBilling: hasLiveBillingData(status),
    hasUsers: hasLiveUserAnalytics(status),
    hasOrb: hasLiveOrbAnalytics(status),
    hasAiUsage: hasLiveAiUsage(status),
    hasReadiness: hasLiveReadinessData(status),
    hasFeatureEvents: hasLiveFeatureEvents(status),
    canCalculateHours: canCalculateLiveHoursReturned({
      usageMetrics: inputs.usageMetrics,
      orbConversationAnalytics: inputs.orbConversationAnalytics,
      providerAnalytics: inputs.providerAnalytics,
      readinessMetrics: inputs.readinessMetrics,
      billingMetrics: inputs.billingMetrics,
      dataSourceStatus: status
    })
  }
}
