/**
 * Builds founder contract inputs from live adapters.
 * In live-only mode, unavailable sources return empty data — never mock fallback.
 */

import { currentPeriodBounds } from './adapters/adapter-utils'
import type { BillingMetrics } from '@/lib/founder/contracts/billing-metrics'
import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { UsageMetrics } from '@/lib/founder/contracts/usage-metrics'
import { buildLiveMetricsFromBootstrap } from '@/lib/founder/bootstrap/founder-bootstrap-metrics'
import type { FounderBootstrapPayload } from '@/lib/founder/bootstrap/founder-bootstrap-client'
import {
  deriveSourceConnectionStatuses,
  detectFounderDataSourcesSync,
  type FounderDataSourceAvailability,
  type FounderDataSourceKey,
  type FounderSourceConnectionStatus,
  type FounderSourceMode
} from './founder-data-source'
import { isFounderLiveOnlyMode, resolveFounderSourceMode } from './founder-data-mode'
import {
  fetchAiUsageAdapter,
  fetchBillingAdapter,
  fetchFeatureEventsAdapter,
  fetchHomesAdapter,
  fetchOrbConversationsAdapter,
  fetchProvidersAdapter,
  fetchReadinessAdapter,
  fetchUsersAdapter,
  getAiUsageAdapterFallback,
  getBillingAdapterFallback,
  getFeatureEventsAdapterFallback,
  getHomesAdapterFallback,
  getOrbConversationsAdapterFallback,
  getProvidersAdapterFallback,
  getReadinessAdapterFallback,
  getUsersAdapterFallback,
  type FounderAdapterSource
} from './adapters'

export type FounderDataSourceStatus = {
  source: FounderSourceMode
  generatedAt: string
  limitations: string[]
  availability: Omit<FounderDataSourceAvailability, 'sourceMode'>
  sourceConnections: Record<FounderDataSourceKey, FounderSourceConnectionStatus>
}

export type FounderLiveMetrics = {
  usageMetrics: UsageMetrics
  orbConversationAnalytics: OrbConversationAnalytics
  providerAnalytics: ProviderAnalytics
  readinessMetrics: ReadinessMetrics
  billingMetrics: BillingMetrics
  dataSourceStatus: FounderDataSourceStatus
}

let cachedLiveMetrics: FounderLiveMetrics | null = null
let loadPromise: Promise<FounderLiveMetrics> | null = null

function mergeAdapterSources(sources: FounderAdapterSource[]): FounderSourceMode {
  if (isFounderLiveOnlyMode()) return 'live-only'
  const liveCount = sources.filter((s) => s === 'live').length
  return resolveFounderSourceMode(liveCount, sources.length)
}

function buildUsageMetrics(
  users: ReturnType<typeof getUsersAdapterFallback>,
  features: ReturnType<typeof getFeatureEventsAdapterFallback>,
  orb: OrbConversationAnalytics
): UsageMetrics {
  const { periodStart, periodEnd } = currentPeriodBounds()
  return {
    periodStart,
    periodEnd,
    activeUsers: users.data.activeUsers,
    activeUsersTrendPercent: users.data.activeUsersTrendPercent,
    totalSessions: users.data.totalSessions,
    dictateMinutes: 0,
    reportBuilderGenerations: 0,
    chronologyBuilds: 0,
    riskAssessmentReviews: 0,
    orbConversations: orb.totalConversations,
    featureUsage: features.data
  }
}

function applyHomesCount(providerAnalytics: ProviderAnalytics, totalHomes: number): ProviderAnalytics {
  return {
    ...providerAnalytics,
    totalHomes: totalHomes > 0 ? totalHomes : providerAnalytics.totalHomes
  }
}

function applyAiUsageToBilling(
  billing: BillingMetrics,
  aiUsage: ReturnType<typeof getAiUsageAdapterFallback>
): BillingMetrics {
  if (aiUsage.source !== 'live') return billing

  return {
    ...billing,
    openAiSpendGbp: aiUsage.data.openAiSpendGbp,
    totalConversations: aiUsage.data.totalRequests || billing.totalConversations,
    modelBreakdown: aiUsage.data.modelBreakdown
  }
}

function buildRecordCounts(
  users: ReturnType<typeof getUsersAdapterFallback>,
  providers: ReturnType<typeof getProvidersAdapterFallback>,
  homes: ReturnType<typeof getHomesAdapterFallback>,
  orb: ReturnType<typeof getOrbConversationsAdapterFallback>,
  billing: ReturnType<typeof getBillingAdapterFallback>,
  aiUsage: ReturnType<typeof getAiUsageAdapterFallback>,
  readiness: ReturnType<typeof getReadinessAdapterFallback>
) {
  return {
    users: users.data.activeUsers,
    providers: providers.data.totalProviders,
    homes: homes.data.totalHomes,
    orbConversations: orb.data.totalConversations,
    featureEvents: 0,
    billing: billing.data.openAiSpendGbp > 0 || billing.data.totalMrrGbp > 0 ? 1 : 0,
    aiUsage: aiUsage.data.totalRequests,
    readiness: readiness.data.commonGaps.length + readiness.data.homes.length
  } satisfies Partial<Record<FounderDataSourceKey, number>>
}

export function buildLiveMetricsFromAdapters(
  users: ReturnType<typeof getUsersAdapterFallback>,
  providers: ReturnType<typeof getProvidersAdapterFallback>,
  homes: ReturnType<typeof getHomesAdapterFallback>,
  orb: ReturnType<typeof getOrbConversationsAdapterFallback>,
  features: ReturnType<typeof getFeatureEventsAdapterFallback>,
  billing: ReturnType<typeof getBillingAdapterFallback>,
  aiUsage: ReturnType<typeof getAiUsageAdapterFallback>,
  readiness: ReturnType<typeof getReadinessAdapterFallback>,
  availability: Omit<FounderDataSourceAvailability, 'sourceMode'>
): FounderLiveMetrics {
  const providerAnalytics = applyHomesCount(providers.data, homes.data.totalHomes)
  const usageMetrics = buildUsageMetrics(users, features, orb.data)
  const billingMetrics = applyAiUsageToBilling(billing.data, aiUsage)

  const recordCounts = buildRecordCounts(users, providers, homes, orb, billing, aiUsage, readiness)
  const sourceConnections = deriveSourceConnectionStatuses(availability, recordCounts)

  const limitations = [
    ...users.limitations,
    ...providers.limitations,
    ...homes.limitations,
    ...orb.limitations,
    ...features.limitations,
    ...billing.limitations,
    ...aiUsage.limitations,
    ...readiness.limitations
  ]

  const source = mergeAdapterSources([
    users.source,
    providers.source,
    homes.source,
    orb.source,
    features.source,
    billing.source,
    aiUsage.source,
    readiness.source
  ])

  return {
    usageMetrics,
    orbConversationAnalytics: orb.data,
    providerAnalytics,
    readinessMetrics: readiness.data,
    billingMetrics,
    dataSourceStatus: {
      source,
      generatedAt: new Date().toISOString(),
      limitations: [...new Set(limitations)],
      availability,
      sourceConnections
    }
  }
}

/** Synchronous metrics — uses cache or empty/unavailable adapters for first paint. */
export function getFounderLiveMetricsSync(): FounderLiveMetrics {
  if (cachedLiveMetrics) return cachedLiveMetrics

  const syncAvailability = detectFounderDataSourcesSync()
  const { sourceMode, ...availability } = syncAvailability

  cachedLiveMetrics = buildLiveMetricsFromAdapters(
    getUsersAdapterFallback(),
    getProvidersAdapterFallback(),
    getHomesAdapterFallback(),
    getOrbConversationsAdapterFallback(),
    getFeatureEventsAdapterFallback(),
    getBillingAdapterFallback(),
    getAiUsageAdapterFallback(),
    getReadinessAdapterFallback(),
    availability
  )

  cachedLiveMetrics.dataSourceStatus.source = sourceMode
  return cachedLiveMetrics
}

/** Hydrate live metrics cache from bootstrap without additional live fetches. */
export function seedLiveMetricsFromBootstrap(bootstrap: FounderBootstrapPayload): FounderLiveMetrics {
  const metrics = buildLiveMetricsFromBootstrap(bootstrap)
  cachedLiveMetrics = metrics
  return metrics
}

/** Loads live metrics — prefers bootstrap cache, then adapters. Mock fallback only when data mode allows it. */
export async function loadFounderLiveMetrics(): Promise<FounderLiveMetrics> {
  if (cachedLiveMetrics) return cachedLiveMetrics
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const { getLastFounderBootstrap } = await import('@/lib/founder/persistence/founder-persistence-sync')
      const bootstrap = getLastFounderBootstrap()
      if (bootstrap) {
        return seedLiveMetricsFromBootstrap(bootstrap)
      }
    } catch {
      /* fall through to adapter fetch */
    }

    const { sourceMode, ...availability } = detectFounderDataSourcesSync()

    const [users, providers, homes, orb, features, aiUsage, readiness] = await Promise.all([
      availability.usersAvailable ? fetchUsersAdapter() : Promise.resolve(getUsersAdapterFallback()),
      availability.providersAvailable ? fetchProvidersAdapter() : Promise.resolve(getProvidersAdapterFallback()),
      availability.homesAvailable ? fetchHomesAdapter() : Promise.resolve(getHomesAdapterFallback()),
      availability.orbConversationsAvailable
        ? fetchOrbConversationsAdapter()
        : Promise.resolve(getOrbConversationsAdapterFallback()),
      availability.featureEventsAvailable
        ? fetchFeatureEventsAdapter()
        : Promise.resolve(getFeatureEventsAdapterFallback()),
      availability.aiUsageAvailable ? fetchAiUsageAdapter() : Promise.resolve(getAiUsageAdapterFallback()),
      availability.readinessAvailable ? fetchReadinessAdapter() : Promise.resolve(getReadinessAdapterFallback())
    ])

    const billing = availability.billingAvailable
      ? await fetchBillingAdapter({
          totalProviders: providers.data.totalProviders,
          totalMrr: providers.data.totalMrr
        })
      : getBillingAdapterFallback()

    const metrics = buildLiveMetricsFromAdapters(
      users,
      providers,
      homes,
      orb,
      features,
      billing,
      aiUsage,
      readiness,
      availability
    )

    metrics.dataSourceStatus.source = sourceMode
    cachedLiveMetrics = metrics
    return metrics
  })().finally(() => {
    loadPromise = null
  })

  return loadPromise
}

export function invalidateFounderLiveMetricsCache() {
  cachedLiveMetrics = null
}

export function getFounderDataSourceStatus(): FounderDataSourceStatus {
  return getFounderLiveMetricsSync().dataSourceStatus
}
