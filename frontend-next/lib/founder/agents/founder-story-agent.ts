import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runFounderStoryAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Founder Story Draft')
  }

  return {
    title: 'Founder Story Draft',
    summary: 'Live impact metrics are connected. Use hours-returned and adoption data from the command centre for storytelling.',
    recommendations: [
      'Draft LinkedIn post from live hours-returned data only',
      'Prepare newsletter section grounded in connected usage signals',
      'Create investor slide using live aggregates — no estimated figures'
    ],
    status: 'idle'
  }
}
