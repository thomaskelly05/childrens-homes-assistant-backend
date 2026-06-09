import type { AgentRunResult } from './types'

export function runCustomerSuccessAgent(): AgentRunResult {
  return {
    title: 'Customer Success Pulse',
    summary: 'Two providers show declining weekly active usage. Provider B weekly active users down from 29 to 22. Power users concentrated in Dictate and ORB Chat features.',
    recommendations: [
      'Schedule founder outreach with Provider B this week',
      'Identify and celebrate power users for case study content',
      'Review onboarding flow for chronology and supervision features',
      'Send personalised feature tips to inactive users'
    ],
    status: 'active'
  }
}
