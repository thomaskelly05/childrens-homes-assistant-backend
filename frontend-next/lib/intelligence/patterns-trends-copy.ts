/**
 * Shared copy for patterns and trends surfaces — calm, action-oriented language.
 */

export const PATTERNS_TRENDS_HEADING = 'Patterns and trends'

export const PATTERNS_TRENDS_INTRO =
  'Where data exists, IndiCare surfaces child-level, staff recording, and home safeguarding trends — improving, repeating, or action needed. No new analytics are invented here.'

export const PATTERN_STATUS_LABELS = {
  improving: 'Improving',
  repeating: 'Repeating',
  action_needed: 'Action needed'
} as const

export type PatternTrendStatus = keyof typeof PATTERN_STATUS_LABELS
