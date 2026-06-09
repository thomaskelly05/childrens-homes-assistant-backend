import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runSectorIntelligenceAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Sector Intelligence Brief')
  }

  return {
    title: 'Sector Intelligence Brief',
    summary: 'Live sector intelligence requires connected anonymised aggregate sources. Review sector trends on the command centre when available.',
    recommendations: [
      'Update ORB knowledge when live sector trend data is connected',
      'Prepare sector trend report from anonymised live aggregates only',
      'Align product roadmap with connected sector signals'
    ],
    status: 'active'
  }
}
