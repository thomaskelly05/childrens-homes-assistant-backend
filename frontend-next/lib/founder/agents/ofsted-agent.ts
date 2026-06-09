import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runOfstedAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('Ofsted Readiness Assessment')
  }

  return {
    title: 'Ofsted Readiness Assessment',
    summary: 'Live Ofsted readiness source is connected. Review readiness gaps and home-level scores on the command centre.',
    recommendations: [
      'Embed child voice prompts across report templates where live gaps indicate need',
      'Strengthen evaluation quality guidance in ORB outputs',
      'Update ORB knowledge base with latest SCCIF inspection themes'
    ],
    status: 'monitoring'
  }
}
