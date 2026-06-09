/**
 * Future live integration contract for AI billing and unit economics.
 * No API implementation yet — defines the shape for backend projections.
 */

export type ModelUsageBreakdown = {
  modelId: string
  modelName: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  estimatedCostGbp: number
}

export type BillingMetrics = {
  periodStart: string
  periodEnd: string
  openAiSpendGbp: number
  totalConversations: number
  totalActiveUsers: number
  totalProviders: number
  totalMrrGbp: number
  modelBreakdown: ModelUsageBreakdown[]
  costPerUserGbp: number
  costPerProviderGbp: number
  costPerConversationGbp: number
  grossMarginPercent: number
}
