import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runProductAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Product Intelligence Report')
  }

  return {
    title: 'Product Intelligence Report',
    summary: 'Live feature usage events are connected. Review adoption, abandonment and demand signals on the command centre.',
    recommendations: [
      'Prioritise the highest-adoption live feature for the next build cycle',
      'Address features with elevated abandonment from live usage data',
      'Deprioritise low-adoption features until live demand increases'
    ],
    status: 'active'
  }
}
