/**
 * ORB Intelligence Engine — calculates conversation patterns and emerging themes.
 * Prepares structured intelligence for live ORB analytics integration.
 */

import type { OrbConversationAnalytics } from '@/lib/founder/contracts/orb-conversation-analytics'

export type OrbCategoryIntelligence = {
  name: string
  volume: number
  trend: number
}

export type OrbIntelligence = {
  categories: OrbCategoryIntelligence[]
  mostUsedCategories: string[]
  fastestGrowingCategory: string
  emergingThemes: string[]
  safeguardingQueryVolume: number
  reportGenerationVolume: number
  averageConversationLength: number
  totalConversations: number
  satisfactionScore: number
}

export type OrbIntelligenceEngineOptions = {
  /** Future hook for AI theme extraction */
  aiExtractThemes?: (analytics: OrbConversationAnalytics) => Promise<string[]>
}

function findMostUsed(categories: OrbConversationAnalytics['categories'], count = 3): string[] {
  return [...categories]
    .sort((a, b) => b.conversationCount - a.conversationCount)
    .slice(0, count)
    .map((c) => c.categoryName)
}

function findFastestGrowing(categories: OrbConversationAnalytics['categories']): string {
  const sorted = [...categories].sort((a, b) => b.trendPercent - a.trendPercent)
  return sorted[0]?.categoryName ?? 'Unknown'
}

export function calculateOrbIntelligence(analytics: OrbConversationAnalytics): OrbIntelligence {
  return {
    categories: analytics.categories.map((c) => ({
      name: c.categoryName,
      volume: c.conversationCount,
      trend: c.trendPercent
    })),
    mostUsedCategories: findMostUsed(analytics.categories),
    fastestGrowingCategory: findFastestGrowing(analytics.categories),
    emergingThemes: analytics.emergingThemes.map((t) => t.theme),
    safeguardingQueryVolume: analytics.safeguardingQueryCount,
    reportGenerationVolume: analytics.reportGenerationCount,
    averageConversationLength: analytics.averageConversationLength,
    totalConversations: analytics.totalConversations,
    satisfactionScore: analytics.satisfactionScore
  }
}

export async function generateOrbIntelligence(
  analytics: OrbConversationAnalytics,
  options?: OrbIntelligenceEngineOptions
): Promise<OrbIntelligence> {
  const intelligence = calculateOrbIntelligence(analytics)

  if (options?.aiExtractThemes) {
    intelligence.emergingThemes = await options.aiExtractThemes(analytics)
  }

  return intelligence
}
