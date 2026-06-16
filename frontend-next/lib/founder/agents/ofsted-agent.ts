import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runOfstedAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Inspection evidence preparation Assessment')
  }

  return {
    title: 'Inspection evidence preparation Assessment',
    summary: 'Live Inspection evidence preparation source is connected. Review readiness gaps and home-level scores on the command centre.',
    recommendations: [
      'Embed child voice prompts across report templates where live gaps indicate need',
      'Strengthen evaluation quality guidance in ORB outputs',
      'Update ORB knowledge base with latest SCCIF inspection themes'
    ],
    status: 'monitoring'
  }
}
