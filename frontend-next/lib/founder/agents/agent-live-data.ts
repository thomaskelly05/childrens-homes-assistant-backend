import { hasAnyLiveFounderIntelligence } from '@/lib/founder/data/founder-live-availability'
import { getFounderContractInputs } from '@/lib/founder/intelligence-service'
import type { AgentRunResult } from './types'

const WAITING_SUMMARY =
  'Waiting for live founder data. Connect live usage, revenue, ORB analytics and readiness sources to activate this agent.'

export function isAgentLiveDataAvailable(): boolean {
  const inputs = getFounderContractInputs()
  return hasAnyLiveFounderIntelligence({
    usageMetrics: inputs.usageMetrics,
    orbConversationAnalytics: inputs.orbConversationAnalytics,
    providerAnalytics: inputs.providerAnalytics,
    readinessMetrics: inputs.readinessMetrics,
    billingMetrics: inputs.billingMetrics,
    dataSourceStatus: inputs.dataSourceStatus
  })
}

export function agentResultWithoutLiveData(title: string): AgentRunResult {
  return {
    title,
    summary: WAITING_SUMMARY,
    recommendations: [],
    status: 'idle'
  }
}
