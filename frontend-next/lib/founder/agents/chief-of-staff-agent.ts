import { hasAnyLiveFounderIntelligence } from '@/lib/founder/data/founder-live-availability'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import type { AgentRunResult } from './types'

export function runChiefOfStaffAgent(): AgentRunResult {
  const inputs = getFounderContractInputs()
  const hasLive = hasAnyLiveFounderIntelligence({
    usageMetrics: inputs.usageMetrics,
    orbConversationAnalytics: inputs.orbConversationAnalytics,
    providerAnalytics: inputs.providerAnalytics,
    readinessMetrics: inputs.readinessMetrics,
    billingMetrics: inputs.billingMetrics,
    dataSourceStatus: inputs.dataSourceStatus
  })

  if (!hasLive) {
    return {
      title: 'Daily Founder Briefing',
      summary:
        'This briefing is waiting for live founder data. Connect live usage, revenue, ORB analytics and readiness sources to generate a real briefing.',
      recommendations: [],
      status: 'idle'
    }
  }

  return {
    title: 'Daily Founder Briefing',
    summary: 'Live founder intelligence is connected. Review connected sources on the command centre for current platform signals.',
    recommendations: [
      'Review connected live data sources on the founder dashboard',
      'Prioritise actions generated from live usage and readiness signals',
      'Use ORB Founder for strategic questions grounded in live aggregates only'
    ],
    status: 'active'
  }
}
