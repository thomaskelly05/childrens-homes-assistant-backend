import type { AgentId } from '@/lib/founder/agents'

export type FounderActionPriority = 'critical' | 'high' | 'medium' | 'low'

export type FounderActionCategory =
  | 'product'
  | 'growth'
  | 'ofsted'
  | 'customer-success'
  | 'ai-cost'
  | 'sector-intelligence'
  | 'founder-story'
  | 'operations'

export type FounderActionStatus = 'new' | 'in-progress' | 'done' | 'dismissed'

export type FounderAction = {
  id: string
  title: string
  description: string
  source: string
  priority: FounderActionPriority
  category: FounderActionCategory
  status: FounderActionStatus
  createdAt: string
  dueLabel: string
  recommendedNextStep: string
  linkedAgent?: AgentId
  linkedMetric?: string
}

export const FOUNDER_ACTION_PRIORITY_ORDER: Record<FounderActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

export const FOUNDER_ACTION_STATUS_ORDER: Record<FounderActionStatus, number> = {
  new: 0,
  'in-progress': 1,
  done: 2,
  dismissed: 3
}
