/**
 * Intelligence Service — orchestrates all engines to produce founder dashboard data.
 * In live-only mode, missing sources show honest empty states — never mock metrics.
 */

import { getAllAgents, runAgent } from '@/lib/founder/agents'
import {
  canCalculateLiveHoursReturned,
  hasAnyLiveFounderIntelligence,
  hasLiveAiUsage,
  hasLiveBillingData,
  hasLiveFeatureEvents,
  hasLiveHomesData,
  hasLiveOrbAnalytics,
  hasLiveProvidersData,
  hasLiveReadinessData,
  hasLiveUserAnalytics
} from '@/lib/founder/data/founder-live-availability'
import {
  getFounderLiveMetricsSync,
  invalidateFounderLiveMetricsCache,
  loadFounderLiveMetrics,
  type FounderLiveMetrics
} from '@/lib/founder/data/founder-live-metrics'
import {
  getFounderTelemetryEvents,
  hydrateFounderTelemetryFromLiveData
} from '@/lib/founder/telemetry'
import type {
  FounderActivityItem,
  FounderAgent,
  FounderCostCentre,
  FounderDashboardData,
  FounderHomeReadiness,
  FounderKpi,
  FounderProductFeature,
  FounderRecommendation,
  FounderSectorTrend
} from '@/lib/founder/mock-data'
import type { FounderInsight, InsightPriority } from '@/lib/founder/intelligence/founder-insight-engine'
import {
  calculateAiCost,
  calculateHoursReturned,
  calculateOfstedReadiness,
  calculateOrbIntelligence,
  generateFounderInsightsSync
} from '@/lib/founder/intelligence'

const PRIORITY_TO_NUMBER: Record<InsightPriority, number> = { high: 1, medium: 2, low: 3 }

const UNAVAILABLE_VALUE = '—'

function unavailableKpi(id: string, label: string, hint: string): FounderKpi {
  return { id, label, value: UNAVAILABLE_VALUE, hint, unavailable: true, changeDirection: 'neutral' }
}

function insightToRecommendation(insight: FounderInsight, index: number): FounderRecommendation {
  return {
    id: `insight-${index}`,
    priority: PRIORITY_TO_NUMBER[insight.priority],
    title: insight.title,
    detail: `${insight.explanation} ${insight.action}`
  }
}

function abandonmentFromRate(rate: number): FounderProductFeature['abandonmentRisk'] {
  if (rate >= 30) return 'high'
  if (rate >= 15) return 'medium'
  return 'low'
}

function demandFromTrend(trend: number): FounderProductFeature['demand'] {
  if (trend >= 10) return 'rising'
  if (trend <= 3) return 'falling'
  return 'stable'
}

function buildKpis(
  metrics: FounderLiveMetrics,
  hoursReturned: ReturnType<typeof calculateHoursReturned> | null,
  orbIntelligence: ReturnType<typeof calculateOrbIntelligence> | null,
  aiCost: ReturnType<typeof calculateAiCost> | null
): FounderKpi[] {
  const { providerAnalytics, usageMetrics, dataSourceStatus } = metrics
  const status = dataSourceStatus

  const mrrKpi: FounderKpi = hasLiveBillingData(status) && providerAnalytics.totalMrr > 0
    ? {
        id: 'mrr',
        label: 'Monthly Recurring Revenue',
        value: `£${providerAnalytics.totalMrr.toLocaleString('en-GB')}`,
        change: providerAnalytics.mrrTrendPercent !== 0 ? `${providerAnalytics.mrrTrendPercent > 0 ? '+' : ''}${providerAnalytics.mrrTrendPercent}%` : undefined,
        changeDirection: providerAnalytics.mrrTrendPercent > 0 ? 'up' : providerAnalytics.mrrTrendPercent < 0 ? 'down' : 'neutral',
        hint: 'vs last month'
      }
    : unavailableKpi('mrr', 'Monthly Recurring Revenue', 'Live billing source not connected')

  const activeUsersKpi: FounderKpi = hasLiveUserAnalytics(status) && usageMetrics.activeUsers > 0
    ? {
        id: 'active-users',
        label: 'Active Users',
        value: String(usageMetrics.activeUsers),
        change: usageMetrics.activeUsersTrendPercent !== 0 ? `${usageMetrics.activeUsersTrendPercent > 0 ? '+' : ''}${usageMetrics.activeUsersTrendPercent}%` : undefined,
        changeDirection: usageMetrics.activeUsersTrendPercent > 0 ? 'up' : usageMetrics.activeUsersTrendPercent < 0 ? 'down' : 'neutral',
        hint: '30-day active'
      }
    : unavailableKpi('active-users', 'Active Users', 'Live user analytics not connected')

  const providersKpi: FounderKpi = hasLiveProvidersData(status) && providerAnalytics.totalProviders > 0
    ? { id: 'providers', label: 'Providers', value: String(providerAnalytics.totalProviders), changeDirection: 'neutral' }
    : unavailableKpi('providers', 'Providers', 'Live provider source not connected')

  const homesKpi: FounderKpi = hasLiveHomesData(status) && providerAnalytics.totalHomes > 0
    ? { id: 'homes', label: "Children's Homes", value: String(providerAnalytics.totalHomes), changeDirection: 'neutral' }
    : unavailableKpi('homes', "Children's Homes", 'Live homes source not connected')

  const hoursKpi: FounderKpi =
    hoursReturned && canCalculateLiveHoursReturned(metrics) && hoursReturned.totalHours > 0
      ? {
          id: 'hours',
          label: 'Hours Returned to Direct Care',
          value: hoursReturned.totalHoursFormatted,
          change: hoursReturned.trendPercent !== 0 ? `${hoursReturned.trendPercent > 0 ? '+' : ''}${hoursReturned.trendPercent}%` : undefined,
          changeDirection: hoursReturned.trendPercent > 0 ? 'up' : hoursReturned.trendPercent < 0 ? 'down' : 'neutral',
          hint: 'estimated this month'
        }
      : unavailableKpi('hours', 'Hours Returned to Direct Care', 'Requires live feature usage events')

  const satisfactionKpi: FounderKpi =
    orbIntelligence && hasLiveOrbAnalytics(status) && orbIntelligence.satisfactionScore > 0
      ? {
          id: 'satisfaction',
          label: 'Average ORB Satisfaction',
          value: `${orbIntelligence.satisfactionScore}%`,
          changeDirection: 'neutral'
        }
      : unavailableKpi('satisfaction', 'Average ORB Satisfaction', 'Live ORB analytics not connected')

  const conversationsKpi: FounderKpi =
    orbIntelligence && hasLiveOrbAnalytics(status) && orbIntelligence.totalConversations > 0
      ? {
          id: 'conversations',
          label: 'ORB Conversations This Month',
          value: orbIntelligence.totalConversations.toLocaleString('en-GB'),
          changeDirection: 'neutral'
        }
      : unavailableKpi('conversations', 'ORB Conversations This Month', 'Live ORB analytics not connected')

  const aiCostKpi: FounderKpi =
    aiCost && hasLiveAiUsage(status) && aiCost.raw.openAiSpendGbp > 0
      ? {
          id: 'ai-cost',
          label: 'Current AI Cost',
          value: aiCost.openAiSpend,
          changeDirection: 'neutral',
          hint: 'this month'
        }
      : unavailableKpi('ai-cost', 'Current AI Cost', 'Live AI usage source not connected')

  return [mrrKpi, activeUsersKpi, providersKpi, homesKpi, hoursKpi, satisfactionKpi, conversationsKpi, aiCostKpi]
}

function buildActivityFeed(_metrics: FounderLiveMetrics): FounderActivityItem[] {
  const events = getFounderTelemetryEvents()
  if (events.length === 0) return []

  return events.slice(0, 20).map((event) => ({
    id: event.id,
    time: new Date(event.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    role: event.userRole ?? 'platform',
    region: event.organisationType ?? '—',
    action: event.type.replace(/-/g, ' '),
    category: event.category
  }))
}

function buildSectorIntelligence(metrics: FounderLiveMetrics): FounderSectorTrend[] {
  if (!hasAnyLiveFounderIntelligence(metrics)) return []
  return []
}

function buildAgents(metrics: FounderLiveMetrics): FounderAgent[] {
  const hasLive = hasAnyLiveFounderIntelligence(metrics)
  return getAllAgents().map((agent) => {
    const result = agent.run()
    return {
      id: agent.id,
      name: agent.name,
      status: result.status,
      purpose: agent.purpose,
      latestInsight: hasLive ? result.summary : 'Waiting for live founder data.'
    }
  })
}

function buildCostCentre(
  aiCost: ReturnType<typeof calculateAiCost> | null,
  metrics: FounderLiveMetrics
): FounderCostCentre {
  if (!aiCost || !hasLiveAiUsage(metrics.dataSourceStatus)) {
    return {
      openAiSpend: UNAVAILABLE_VALUE,
      costPerUser: UNAVAILABLE_VALUE,
      costPerConversation: UNAVAILABLE_VALUE,
      revenuePerProvider: UNAVAILABLE_VALUE,
      grossMargin: UNAVAILABLE_VALUE,
      usageWarning: 'normal',
      usageWarningLabel: 'Live AI usage source not connected'
    }
  }

  return {
    openAiSpend: aiCost.openAiSpend,
    costPerUser: aiCost.costPerUser,
    costPerConversation: aiCost.costPerConversation,
    revenuePerProvider: aiCost.revenuePerProvider,
    grossMargin: aiCost.grossMargin,
    usageWarning: aiCost.usageWarning,
    usageWarningLabel: aiCost.usageWarningLabel
  }
}

function buildHomes(homes: ReturnType<typeof calculateOfstedReadiness>['homes']): FounderHomeReadiness[] {
  return homes.map((home) => ({
    id: home.id,
    name: home.name,
    score: home.score,
    status: home.status,
    statusTone: home.statusTone
  }))
}

export function generateFounderDashboardData(metrics = getFounderLiveMetricsSync()): FounderDashboardData {
  const {
    usageMetrics,
    orbConversationAnalytics,
    providerAnalytics,
    readinessMetrics,
    billingMetrics,
    dataSourceStatus
  } = metrics

  const hasLive = hasAnyLiveFounderIntelligence(metrics)

  const orbIntelligence = hasLiveOrbAnalytics(dataSourceStatus)
    ? calculateOrbIntelligence(orbConversationAnalytics)
    : null
  const ofstedReadiness = hasLiveReadinessData(dataSourceStatus)
    ? calculateOfstedReadiness(readinessMetrics)
    : null
  const aiCost = hasLiveAiUsage(dataSourceStatus) ? calculateAiCost(billingMetrics) : null
  const hoursReturned =
    canCalculateLiveHoursReturned(metrics) && hasLive
      ? calculateHoursReturned(usageMetrics, orbConversationAnalytics)
      : null

  const insights = hasLive
    ? generateFounderInsightsSync({
        usageMetrics,
        orbAnalytics: orbConversationAnalytics,
        providerAnalytics,
        readinessMetrics
      })
    : []

  const features: FounderProductFeature[] = hasLiveFeatureEvents(dataSourceStatus)
    ? usageMetrics.featureUsage.map((f) => ({
        name: f.featureName,
        usage: f.adoptionRate,
        trend: f.trendPercent,
        abandonmentRisk: abandonmentFromRate(f.abandonmentRate),
        demand: demandFromTrend(f.trendPercent)
      }))
    : []

  const sortedByUsage = [...features].sort((a, b) => b.usage - a.usage)
  const sortedByAbandonment = [...features].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.abandonmentRisk] - order[b.abandonmentRisk]
  })

  return {
    dataSourceStatus,
    kpis: buildKpis(metrics, hoursReturned, orbIntelligence, aiCost),
    activityFeed: buildActivityFeed(metrics),
    orbIntelligence: {
      categories: orbIntelligence?.categories ?? [],
      fastestGrowing: orbIntelligence?.fastestGrowingCategory ?? '—',
      emergingThemes: orbIntelligence?.emergingThemes ?? [],
      safeguardingVolume: orbIntelligence?.safeguardingQueryVolume ?? 0,
      reportGenerationVolume: orbIntelligence?.reportGenerationVolume ?? 0
    },
    productIntelligence: {
      features,
      mostUsed: sortedByUsage[0]?.name ?? '—',
      leastUsed: sortedByUsage[sortedByUsage.length - 1]?.name ?? '—',
      highestAbandonmentRisk: sortedByAbandonment[0]?.name ?? '—',
      topDemand: hasLiveFeatureEvents(dataSourceStatus) ? (sortedByUsage[0]?.name ?? '—') : '—'
    },
    ofstedIntelligence: {
      homes: ofstedReadiness ? buildHomes(ofstedReadiness.homes) : [],
      commonGaps: ofstedReadiness?.commonGaps ?? []
    },
    sectorIntelligence: buildSectorIntelligence(metrics),
    recommendations: insights.slice(0, 5).map(insightToRecommendation),
    agents: buildAgents(metrics),
    costCentre: buildCostCentre(aiCost, metrics)
  }
}

/** Cached singleton for client-side rendering */
let cachedDashboardData: FounderDashboardData | null = null

export function getFounderDashboardData(): FounderDashboardData {
  if (!cachedDashboardData) {
    cachedDashboardData = generateFounderDashboardData()
  }
  return cachedDashboardData
}

export function invalidateFounderDashboardCache() {
  cachedDashboardData = null
  invalidateFounderLiveMetricsCache()
}

export async function refreshFounderDashboardData(): Promise<FounderDashboardData> {
  const metrics = await loadFounderLiveMetrics()
  hydrateFounderTelemetryFromLiveData()
  cachedDashboardData = generateFounderDashboardData(metrics)
  return cachedDashboardData
}

export function getChiefOfStaffBriefing() {
  return runAgent('chief-of-staff')
}

export function getFounderContractInputs() {
  const metrics = getFounderLiveMetricsSync()
  return {
    usageMetrics: metrics.usageMetrics,
    orbConversationAnalytics: metrics.orbConversationAnalytics,
    providerAnalytics: metrics.providerAnalytics,
    readinessMetrics: metrics.readinessMetrics,
    billingMetrics: metrics.billingMetrics,
    dataSourceStatus: metrics.dataSourceStatus
  }
}

export function hasLiveFounderIntelligence(): boolean {
  return hasAnyLiveFounderIntelligence(getFounderLiveMetricsSync())
}
