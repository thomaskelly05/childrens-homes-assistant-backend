/**
 * Founder Insight Engine — generates prioritised recommendations from platform data.
 * Supports future AI integration via the optional `aiEnhance` hook.
 */

import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'
import type { ProviderAnalytics } from '@/lib/founder/contracts/provider-analytics'
import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'
import type { UsageMetrics } from '@/lib/founder/contracts/usage-metrics'

export type InsightPriority = 'high' | 'medium' | 'low'

export type FounderInsight = {
  priority: InsightPriority
  title: string
  explanation: string
  action: string
}

export type FounderInsightInput = {
  usageMetrics: UsageMetrics
  orbAnalytics: OrbConversationAnalytics
  providerAnalytics: ProviderAnalytics
  readinessMetrics: ReadinessMetrics
}

export type FounderInsightEngineOptions = {
  /** Future hook for AI-enhanced insight generation */
  aiEnhance?: (insights: FounderInsight[]) => Promise<FounderInsight[]>
}

const PRIORITY_ORDER: Record<InsightPriority, number> = { high: 0, medium: 1, low: 2 }

function sortInsights(insights: FounderInsight[]): FounderInsight[] {
  return [...insights].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
}

function generateRuleBasedInsights(input: FounderInsightInput): FounderInsight[] {
  const { usageMetrics, orbAnalytics, providerAnalytics, readinessMetrics } = input
  const insights: FounderInsight[] = []

  const dictate = usageMetrics.featureUsage.find((f) => f.featureId === 'dictate')
  if (dictate && dictate.trendPercent >= 20) {
    insights.push({
      priority: 'high',
      title: `Dictate usage increased ${dictate.trendPercent}%. Prioritise Dictate V2.`,
      explanation: `Dictate adoption is at ${dictate.adoptionRate}% with ${dictate.sessions} sessions this period. Staff are relying on voice capture for incident and daily records.`,
      action: 'Prioritise Dictate V2 with multi-speaker capture, template-aware structuring, and offline resilience.'
    })
  }

  const chronology = usageMetrics.featureUsage.find((f) => f.featureId === 'chronology')
  if (chronology && chronology.trendPercent >= 15) {
    insights.push({
      priority: 'high',
      title: 'Chronology requests increasing. Build chronology generation.',
      explanation: `Chronology Builder sessions grew ${chronology.trendPercent}% but abandonment is ${chronology.abandonmentRate}%. Managers need guided timeline assembly.`,
      action: 'Improve Chronology Builder with guided assembly, safeguarding linkage, and auto-generation from existing records.'
    })
  }

  const safeguardingShare = Math.round((orbAnalytics.safeguardingQueryCount / orbAnalytics.totalConversations) * 100)
  if (safeguardingShare >= 25) {
    insights.push({
      priority: 'high',
      title: `Safeguarding queries now account for ${safeguardingShare}% of ORB usage.`,
      explanation: `${orbAnalytics.safeguardingQueryCount} safeguarding conversations this period. County lines and online harm themes are accelerating.`,
      action: 'Expand ORB safeguarding knowledge with county lines, CSE, and online harm guidance with Ofsted-aligned outputs.'
    })
  }

  const topGap = readinessMetrics.commonGaps[0]
  if (topGap && topGap.frequency >= 10) {
    insights.push({
      priority: 'medium',
      title: `Ofsted readiness gaps show ${topGap.gap.toLowerCase()}. Add prompts across templates.`,
      explanation: `${topGap.gap} appears in ${topGap.frequency} homes. Platform average readiness is ${readinessMetrics.platformAverageScore}%.`,
      action: 'Embed child voice prompts in reports, key work sessions, and daily logs.'
    })
  }

  const atRiskProviders = providerAnalytics.providers.filter((p) => p.churnRisk !== 'low')
  if (atRiskProviders.length > 0) {
    insights.push({
      priority: 'medium',
      title: `${atRiskProviders.length} provider(s) show declining engagement.`,
      explanation: `${atRiskProviders.map((p) => p.providerName).join(', ')} have reduced weekly active usage.`,
      action: 'Schedule founder outreach and review onboarding for at-risk providers.'
    })
  }

  const fastestOrb = [...orbAnalytics.categories].sort((a, b) => b.trendPercent - a.trendPercent)[0]
  if (fastestOrb && fastestOrb.trendPercent >= 20) {
    insights.push({
      priority: 'medium',
      title: `${fastestOrb.categoryName} is the fastest-growing ORB category (+${fastestOrb.trendPercent}%).`,
      explanation: `${fastestOrb.conversationCount} conversations this period with emerging sector themes.`,
      action: `Strengthen ORB knowledge and report templates for ${fastestOrb.categoryName.toLowerCase()}.`
    })
  }

  insights.push({
    priority: 'low',
    title: 'AI cost is rising faster than MRR. Add usage monitoring and model-routing.',
    explanation: `MRR grew ${providerAnalytics.mrrTrendPercent}% while AI spend scales with conversation volume (${orbAnalytics.totalConversations} conversations).`,
    action: 'Introduce per-provider caps, conversation tiering, and cheaper routing for low-risk tasks.'
  })

  return sortInsights(insights)
}

export async function generateFounderInsights(
  input: FounderInsightInput,
  options?: FounderInsightEngineOptions
): Promise<FounderInsight[]> {
  let insights = generateRuleBasedInsights(input)

  if (options?.aiEnhance) {
    insights = await options.aiEnhance(insights)
  }

  return insights
}

/** Synchronous variant for client-side dashboard rendering */
export function generateFounderInsightsSync(input: FounderInsightInput): FounderInsight[] {
  return generateRuleBasedInsights(input)
}
