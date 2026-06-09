import type { AgentRunResult } from './types'

export function runProductAgent(): AgentRunResult {
  return {
    title: 'Product Intelligence Report',
    summary: 'Dictate V2 and Chronology Builder improvements are the highest-impact product bets. Dictate adoption at 94% (+28%). Chronology Builder shows high demand but 34% abandonment.',
    recommendations: [
      'Prioritise Dictate V2 with multi-speaker capture and offline resilience',
      'Redesign Chronology Builder onboarding to reduce 34% abandonment',
      'Add guided timeline assembly with safeguarding linkage',
      'Deprioritise Supervision Builder — falling demand and high abandonment'
    ],
    status: 'active'
  }
}
