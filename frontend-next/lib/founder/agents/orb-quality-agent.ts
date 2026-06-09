import { agentResultWithoutLiveData, isAgentLiveDataAvailable } from './agent-live-data'
import type { AgentRunResult } from './types'

export function runOrbQualityAgent(): AgentRunResult {
  if (!isAgentLiveDataAvailable()) {
    return agentResultWithoutLiveData('ORB Quality Review')
  }

  return {
    title: 'ORB Quality Review',
    summary: 'Live ORB analytics are connected. Review satisfaction scores and category demand from connected ORB data.',
    recommendations: [
      'Audit safeguarding output quality from live ORB conversation patterns',
      'Strengthen evaluation language in chronology ORB outputs',
      'Expand guidance for fastest-growing live ORB categories'
    ],
    status: 'monitoring'
  }
}
