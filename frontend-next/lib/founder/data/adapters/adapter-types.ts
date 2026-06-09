import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { UsageMetrics } from '@/lib/founder/contracts/usage-metrics'

export type FounderAdapterSource = 'live' | 'mock'

export type FounderAdapterResult<T> = {
  data: T
  source: FounderAdapterSource
  limitations: string[]
}

export type FounderUsersAggregate = Pick<
  UsageMetrics,
  'activeUsers' | 'activeUsersTrendPercent' | 'totalSessions'
>

export type FounderHomesAggregate = {
  totalHomes: number
}

/** Fields that must never appear in founder adapter output. */
export const FORBIDDEN_IDENTIFIABLE_FIELDS = [
  'childName',
  'child_name',
  'staffName',
  'staff_name',
  'providerName',
  'provider_name',
  'homeName',
  'home_name',
  'firstName',
  'first_name',
  'lastName',
  'last_name',
  'email',
  'address',
  'narrative',
  'comment',
  'safeguarding_detail'
] as const

export type FounderContractInputs = {
  usageMetrics: UsageMetrics
  orbConversationAnalytics: OrbConversationAnalytics
  providerAnalytics: ProviderAnalytics
  readinessMetrics: ReadinessMetrics
  billingMetrics: BillingMetrics
}
