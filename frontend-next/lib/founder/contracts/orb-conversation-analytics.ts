/**
 * Future live integration contract for ORB conversation analytics.
 * No API implementation yet — defines the shape for backend projections.
 */

export type OrbCategoryMetric = {
  categoryId: string
  categoryName: string
  conversationCount: number
  messageCount: number
  trendPercent: number
  averageLength: number
}

export type OrbEmergingTheme = {
  theme: string
  confidence: number
  relatedCategories: string[]
  firstDetected: string
}

export type OrbConversationAnalytics = {
  periodStart: string
  periodEnd: string
  totalConversations: number
  totalMessages: number
  averageConversationLength: number
  satisfactionScore: number
  categories: OrbCategoryMetric[]
  safeguardingQueryCount: number
  reportGenerationCount: number
  emergingThemes: OrbEmergingTheme[]
}
