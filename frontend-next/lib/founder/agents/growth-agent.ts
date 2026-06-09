import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runGrowthAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Growth Intelligence')
  }

  return {
    title: 'Growth Intelligence',
    summary: 'Live growth signals are connected. Review demo pipeline, signups and outreach priorities from connected sources.',
    recommendations: [
      'Follow up warm demo requests from live CRM or signup data',
      'Track investor interest signals from website analytics',
      'Align outreach with connected usage and provider signals'
    ],
    status: 'idle'
  }
}
