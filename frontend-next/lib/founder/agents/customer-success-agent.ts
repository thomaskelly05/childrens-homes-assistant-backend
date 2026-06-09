import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runCustomerSuccessAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Customer Success Pulse')
  }

  return {
    title: 'Customer Success Pulse',
    summary: 'Live user and provider analytics are connected. Review engagement trends from connected sources on the command centre.',
    recommendations: [
      'Schedule outreach with providers showing declining live usage',
      'Identify power users from connected adoption data',
      'Review onboarding flow for low-adoption features'
    ],
    status: 'active'
  }
}
