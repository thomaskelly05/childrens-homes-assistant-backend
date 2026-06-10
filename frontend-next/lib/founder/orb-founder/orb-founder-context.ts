/**
 * ORB Founder — aggregates founder intelligence context for hybrid AI responses.
 * Uses only anonymised operational intelligence from the Founder Intelligence Layer.
 */

import { getAllAgents, type AgentId } from '@/lib/founder/agents'
import type { AgentRunResult } from '@/lib/founder/agents/types'
import type { FounderDataSourceStatus } from '@/lib/founder/data/founder-live-metrics'
import {
  getChiefOfStaffBriefing,
  getFounderContractInputs,
  getFounderDashboardData
} from '@/lib/founder/intelligence-service'
import {
  calculateAiCost,
  calculateHoursReturned,
  calculateOfstedReadiness,
  calculateOrbIntelligence,
  type AiCostIntelligence,
  type HoursReturnedResult,
  type OfstedReadinessResult,
  type OrbIntelligence
} from '@/lib/founder/intelligence'
import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import type { FounderStrategicContext } from '@/lib/founder/memory/founder-memory-types'
import type { FounderDashboardData, FounderRecommendation } from '@/lib/founder/mock-data'

export type OrbFounderAgentContext = {
  id: AgentId
  name: string
  purpose: string
  latestRun: AgentRunResult
}

export type OrbFounderContext = {
  founderDashboard: FounderDashboardData
  briefing: AgentRunResult
  agents: OrbFounderAgentContext[]
  currentRecommendations: FounderRecommendation[]
  currentRisks: string[]
  orbIntelligence: OrbIntelligence
  ofstedReadiness: OfstedReadinessResult
  aiCost: AiCostIntelligence
  hoursReturned: HoursReturnedResult
  dataSourceStatus: FounderDataSourceStatus
  dataLimitations: string[]
  answerDataBasis: FounderDataSourceStatus['source']
  strategicMemory: FounderStrategicContext
}

function buildCurrentRisks(
  aiCost: AiCostIntelligence,
  orbIntelligence: OrbIntelligence,
  ofstedReadiness: OfstedReadinessResult,
  dataSourceStatus: FounderDataSourceStatus
): string[] {
  const risks: string[] = []

  if (dataSourceStatus.source === 'live-only') {
    const disconnected = Object.values(dataSourceStatus.sourceConnections).filter(
      (s) => s !== 'connected'
    ).length
    if (disconnected > 0) {
      risks.push(
        `Live-only mode — ${disconnected} data source(s) not yet connected. Unavailable metrics are hidden.`
      )
    }
  } else if (dataSourceStatus.source !== 'live') {
    risks.push(
      `Founder intelligence is running in ${dataSourceStatus.source} mode — verify figures against live billing and usage before external decisions.`
    )
  }

  if (aiCost.usageWarning === 'critical') {
    risks.push('AI cost critical — review model routing and per-provider caps before scaling')
  } else if (aiCost.usageWarning === 'elevated') {
    risks.push('AI cost elevated — monitor gross margin and unit economics')
  }

  risks.push(
    `Quality consistency as safeguarding volume grows (${orbIntelligence.safeguardingQueryVolume} safeguarding conversations this month)`
  )

  if (ofstedReadiness.score < 80) {
    risks.push(
      `Ofsted readiness at ${ofstedReadiness.score}% — gaps in ${ofstedReadiness.commonGaps.slice(0, 2).join(', ')}`
    )
  }

  if (orbIntelligence.satisfactionScore < 85) {
    risks.push(`ORB satisfaction at ${orbIntelligence.satisfactionScore}% — quality monitoring required before provider rollout`)
  }

  return risks
}

/**
 * Gather founder intelligence context from existing engines.
 * Contract inputs combine live aggregates with mock fallback where sources are unavailable.
 */
export function getOrbFounderContext(): OrbFounderContext {
  const founderDashboard = getFounderDashboardData()
  const briefing = getChiefOfStaffBriefing()
  const contractInputs = getFounderContractInputs()
  const { dataSourceStatus } = contractInputs

  const orbIntelligence = calculateOrbIntelligence(contractInputs.orbConversationAnalytics)
  const ofstedReadiness = calculateOfstedReadiness(contractInputs.readinessMetrics)
  const aiCost = calculateAiCost(contractInputs.billingMetrics)
  const hoursReturned = calculateHoursReturned(
    contractInputs.usageMetrics,
    contractInputs.orbConversationAnalytics
  )

  const agents: OrbFounderAgentContext[] = getAllAgents().map((agent) => ({
    id: agent.id as AgentId,
    name: agent.name,
    purpose: agent.purpose,
    latestRun: agent.run()
  }))

  const currentRecommendations = founderDashboard.recommendations
  const currentRisks = buildCurrentRisks(aiCost, orbIntelligence, ofstedReadiness, dataSourceStatus)

  return {
    founderDashboard,
    briefing,
    agents,
    currentRecommendations,
    currentRisks,
    orbIntelligence,
    ofstedReadiness,
    aiCost,
    hoursReturned,
    dataSourceStatus,
    dataLimitations: dataSourceStatus.limitations,
    answerDataBasis: dataSourceStatus.source,
    strategicMemory: getFounderStrategicContext()
  }
}

/**
 * Serialise founder context for AI consumption — strips identifiable home names
 * and activity feed entries that could imply provider identity.
 */
export function serializeOrbFounderContextForAi(context: OrbFounderContext): string {
  const isLiveOnly = context.answerDataBasis === 'live-only' || context.answerDataBasis === 'live'

  const anonymised = {
    dataSourceStatus: {
      mode: context.answerDataBasis,
      generatedAt: context.dataSourceStatus.generatedAt,
      limitations: context.dataLimitations,
      availability: context.dataSourceStatus.availability,
      sourceConnections: context.dataSourceStatus.sourceConnections,
      instruction: isLiveOnly
        ? 'Live-only mode: only present metrics marked as available from connected sources. If a metric is missing or shows "—", say "I do not have live data for that yet." Never invent numbers.'
        : 'IMPORTANT: Figures below may include mock or estimated data. Do NOT present them as verified live platform truth. State uncertainty when answering.'
    },
    kpis: context.founderDashboard.kpis.map((k) => ({
      label: k.label,
      value: k.value,
      change: k.change,
      hint: k.hint,
      dataBasis: context.answerDataBasis
    })),
    briefing: {
      title: context.briefing.title,
      summary: context.briefing.summary,
      recommendations: context.briefing.recommendations,
      status: context.briefing.status
    },
    agents: context.agents.map((a) => ({
      id: a.id,
      name: a.name,
      purpose: a.purpose,
      status: a.latestRun.status,
      summary: a.latestRun.summary,
      recommendations: a.latestRun.recommendations
    })),
    currentRecommendations: context.currentRecommendations.map((r) => ({
      priority: r.priority,
      title: r.title,
      detail: r.detail
    })),
    currentRisks: context.currentRisks,
    orbIntelligence: {
      totalConversations: context.orbIntelligence.totalConversations,
      satisfactionScore: context.orbIntelligence.satisfactionScore,
      safeguardingQueryVolume: context.orbIntelligence.safeguardingQueryVolume,
      fastestGrowingCategory: context.orbIntelligence.fastestGrowingCategory,
      emergingThemes: context.orbIntelligence.emergingThemes,
      categories: context.orbIntelligence.categories.map((c) => ({
        name: c.name,
        volume: c.volume,
        trend: c.trend
      }))
    },
    ofstedReadiness: {
      score: context.ofstedReadiness.score,
      status: context.ofstedReadiness.status,
      commonGaps: context.ofstedReadiness.commonGaps,
      platformAverageScore: context.ofstedReadiness.platformAverageScore,
      homeCount: context.ofstedReadiness.homes.length
    },
    aiCost: {
      openAiSpend: context.aiCost.openAiSpend,
      costPerUser: context.aiCost.costPerUser,
      costPerConversation: context.aiCost.costPerConversation,
      grossMargin: context.aiCost.grossMargin,
      usageWarning: context.aiCost.usageWarning,
      usageWarningLabel: context.aiCost.usageWarningLabel
    },
    hoursReturned: {
      totalHoursFormatted: context.hoursReturned.totalHoursFormatted,
      trendPercent: context.hoursReturned.trendPercent,
      breakdown: context.hoursReturned.breakdown
    },
    productIntelligence: {
      mostUsed: context.founderDashboard.productIntelligence.mostUsed,
      topDemand: context.founderDashboard.productIntelligence.topDemand,
      highestAbandonmentRisk: context.founderDashboard.productIntelligence.highestAbandonmentRisk
    },
    sectorIntelligence: context.founderDashboard.sectorIntelligence.map((t) => ({
      label: t.label,
      change: t.change,
      direction: t.direction,
      tone: t.tone
    })),
    founderStrategicMemory: {
      instruction:
        'Use only the founder strategic memory below for strategy, decisions, principles and deferred work. Do not invent memory. If a field is empty, say it is not recorded yet.',
      primaryObjective: context.strategicMemory.primaryObjective || null,
      secondaryObjectives: context.strategicMemory.secondaryObjectives,
      deferredObjectives: context.strategicMemory.deferredObjectives,
      currentProductFocus: context.strategicMemory.currentProductFocus || null,
      currentCommercialFocus: context.strategicMemory.currentCommercialFocus || null,
      currentRisks: context.strategicMemory.currentRisks,
      operatingPrinciples: context.strategicMemory.operatingPrinciples,
      importantDecisions: context.strategicMemory.importantDecisions,
      keyRelationships: context.strategicMemory.keyRelationships,
      memoryUpdatedAt: context.strategicMemory.memoryUpdatedAt || null,
      activeMemoryCount: context.strategicMemory.activeMemoryCount
    }
  }

  return JSON.stringify(anonymised, null, 2)
}
