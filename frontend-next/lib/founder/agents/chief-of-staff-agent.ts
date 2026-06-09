import type { AgentRunResult } from './types'

export function runChiefOfStaffAgent(): AgentRunResult {
  return {
    title: 'Daily Founder Briefing',
    summary: 'MRR up 14% to £2,483. Dictate and safeguarding are the dominant growth drivers. 4,923 hours returned to direct care this month. Two providers show declining engagement — schedule outreach.',
    recommendations: [
      'Review Dictate V2 roadmap — highest-impact product bet this quarter',
      'Schedule founder calls with at-risk providers showing declining WAU',
      'Prepare investor update highlighting hours-returned impact metric',
      'Monitor AI cost trajectory — spend up 22% vs 14% MRR growth'
    ],
    status: 'active'
  }
}
