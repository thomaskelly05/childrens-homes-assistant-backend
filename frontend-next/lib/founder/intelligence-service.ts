/**
 * Intelligence Service — orchestrates all engines to produce founder dashboard data.
 * Replaces static mock data with generated intelligence while preserving V1 UI shapes.
 */

import { getAllAgents, runAgent } from '@/lib/founder/agents'
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
  generateFounderInsightsSync,
  mockBillingMetrics,
  mockOrbAnalytics,
  mockProviderAnalytics,
  mockReadinessMetrics,
  mockUsageMetrics
} from '@/lib/founder/intelligence'

const PRIORITY_TO_NUMBER: Record<InsightPriority, number> = { high: 1, medium: 2, low: 3 }

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
  hoursReturned: ReturnType<typeof calculateHoursReturned>,
  orbIntelligence: ReturnType<typeof calculateOrbIntelligence>,
  aiCost: ReturnType<typeof calculateAiCost>
): FounderKpi[] {
  const { totalMrr, mrrTrendPercent, totalProviders, totalHomes, activeUsers, activeUsersTrendPercent } = {
    totalMrr: mockProviderAnalytics.totalMrr,
    mrrTrendPercent: mockProviderAnalytics.mrrTrendPercent,
    totalProviders: mockProviderAnalytics.totalProviders,
    totalHomes: mockProviderAnalytics.totalHomes,
    activeUsers: mockUsageMetrics.activeUsers,
    activeUsersTrendPercent: mockUsageMetrics.activeUsersTrendPercent
  }

  return [
    {
      id: 'mrr',
      label: 'Monthly Recurring Revenue',
      value: `£${totalMrr.toLocaleString('en-GB')}`,
      change: `+${mrrTrendPercent}%`,
      changeDirection: 'up',
      hint: 'vs last month'
    },
    {
      id: 'active-users',
      label: 'Active Users',
      value: String(activeUsers),
      change: `+${activeUsersTrendPercent}%`,
      changeDirection: 'up',
      hint: '30-day active'
    },
    { id: 'providers', label: 'Providers', value: String(totalProviders), changeDirection: 'neutral' },
    { id: 'homes', label: "Children's Homes", value: String(totalHomes), changeDirection: 'neutral' },
    {
      id: 'hours',
      label: 'Hours Returned to Direct Care',
      value: hoursReturned.totalHoursFormatted,
      change: `+${hoursReturned.trendPercent}%`,
      changeDirection: 'up',
      hint: 'estimated this month'
    },
    {
      id: 'satisfaction',
      label: 'Average ORB Satisfaction',
      value: `${orbIntelligence.satisfactionScore}%`,
      change: '+2%',
      changeDirection: 'up'
    },
    {
      id: 'conversations',
      label: 'ORB Conversations This Month',
      value: orbIntelligence.totalConversations.toLocaleString('en-GB'),
      change: '+18%',
      changeDirection: 'up'
    },
    {
      id: 'ai-cost',
      label: 'Current AI Cost',
      value: aiCost.openAiSpend,
      change: '+22%',
      changeDirection: 'up',
      hint: 'this month'
    }
  ]
}

function buildActivityFeed(): FounderActivityItem[] {
  return [
    { id: '1', time: '2 min ago', role: 'Registered Manager', region: 'South East · Residential', action: 'Opened Ofsted Readiness Review', category: 'Inspection' },
    { id: '2', time: '6 min ago', role: 'Manager', region: 'Midlands · Residential', action: 'Generated Missing From Home Report', category: 'Reporting' },
    { id: '3', time: '11 min ago', role: 'Senior Staff', region: 'North West · Residential', action: 'Used Dictate for 14 minutes', category: 'Dictate' },
    { id: '4', time: '18 min ago', role: 'Deputy Manager', region: 'London · Supported Living', action: 'Reviewed risk assessment', category: 'Risk' },
    { id: '5', time: '24 min ago', role: 'Support Worker', region: 'Yorkshire · Residential', action: 'Used ORB Chat for safeguarding guidance', category: 'Safeguarding' },
    { id: '6', time: '31 min ago', role: 'Manager', region: 'East · Residential', action: 'Exported supervision record to PDF', category: 'Export' },
    { id: '7', time: '38 min ago', role: 'Registered Manager', region: 'South West · Residential', action: 'Built chronology timeline segment', category: 'Chronology' },
    { id: '8', time: '45 min ago', role: 'Deputy Manager', region: 'Scotland · Residential', action: 'Completed key work session notes via ORB Chat', category: 'Key Work' }
  ]
}

function buildSectorIntelligence(): FounderSectorTrend[] {
  return [
    { id: 'missing', label: 'Missing episodes', change: '+12%', direction: 'up', tone: 'amber' },
    { id: 'physical', label: 'Physical intervention', change: '-4%', direction: 'down', tone: 'emerald' },
    { id: 'cannabis', label: 'Cannabis concerns', change: '+18%', direction: 'up', tone: 'amber' },
    { id: 'online', label: 'Online harm', change: '+27%', direction: 'up', tone: 'red' },
    { id: 'exploitation', label: 'Child exploitation', change: '+21%', direction: 'up', tone: 'red' },
    { id: 'complaints', label: 'Complaints', change: '-6%', direction: 'down', tone: 'emerald' }
  ]
}

function buildAgents(): FounderAgent[] {
  return getAllAgents().map((agent) => {
    const result = agent.run()
    return {
      id: agent.id,
      name: agent.name,
      status: result.status,
      purpose: agent.purpose,
      latestInsight: result.summary
    }
  })
}

function buildCostCentre(aiCost: ReturnType<typeof calculateAiCost>): FounderCostCentre {
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

export function generateFounderDashboardData(): FounderDashboardData {
  const usageMetrics = mockUsageMetrics
  const orbAnalytics = mockOrbAnalytics
  const providerAnalytics = mockProviderAnalytics
  const readinessMetrics = mockReadinessMetrics
  const billingMetrics = mockBillingMetrics

  const orbIntelligence = calculateOrbIntelligence(orbAnalytics)
  const ofstedReadiness = calculateOfstedReadiness(readinessMetrics)
  const aiCost = calculateAiCost(billingMetrics)
  const hoursReturned = calculateHoursReturned(usageMetrics, orbAnalytics, 4435)

  const insights = generateFounderInsightsSync({
    usageMetrics,
    orbAnalytics,
    providerAnalytics,
    readinessMetrics
  })

  const features: FounderProductFeature[] = usageMetrics.featureUsage.map((f) => ({
    name: f.featureName,
    usage: f.adoptionRate,
    trend: f.trendPercent,
    abandonmentRisk: abandonmentFromRate(f.abandonmentRate),
    demand: demandFromTrend(f.trendPercent)
  }))

  const sortedByUsage = [...features].sort((a, b) => b.usage - a.usage)
  const sortedByAbandonment = [...features].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.abandonmentRisk] - order[b.abandonmentRisk]
  })

  return {
    kpis: buildKpis(hoursReturned, orbIntelligence, aiCost),
    activityFeed: buildActivityFeed(),
    orbIntelligence: {
      categories: orbIntelligence.categories,
      fastestGrowing: orbIntelligence.fastestGrowingCategory,
      emergingThemes: orbIntelligence.emergingThemes,
      safeguardingVolume: orbIntelligence.safeguardingQueryVolume,
      reportGenerationVolume: orbIntelligence.reportGenerationVolume
    },
    productIntelligence: {
      features,
      mostUsed: sortedByUsage[0]?.name ?? 'Unknown',
      leastUsed: sortedByUsage[sortedByUsage.length - 1]?.name ?? 'Unknown',
      highestAbandonmentRisk: sortedByAbandonment[0]?.name ?? 'Unknown',
      topDemand: 'Dictate V2'
    },
    ofstedIntelligence: {
      homes: buildHomes(ofstedReadiness.homes),
      commonGaps: ofstedReadiness.commonGaps
    },
    sectorIntelligence: buildSectorIntelligence(),
    recommendations: insights.slice(0, 5).map(insightToRecommendation),
    agents: buildAgents(),
    costCentre: buildCostCentre(aiCost)
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

export function getChiefOfStaffBriefing() {
  return runAgent('chief-of-staff')
}
