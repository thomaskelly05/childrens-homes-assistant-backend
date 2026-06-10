/**
 * Founder Intelligence Centre V1 — strategic decision layer contracts.
 */

export type FounderPriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export type FounderPriorityCategory =
  | 'commercial'
  | 'product'
  | 'quality'
  | 'revenue'
  | 'relationships'
  | 'evidence'
  | 'operations'
  | 'safety'
  | 'growth'

export type FounderRiskType =
  | 'commercial'
  | 'operational'
  | 'financial'
  | 'quality'
  | 'safety'
  | 'relationship'
  | 'evidence'
  | 'product'

export type FounderOpportunityType =
  | 'provider'
  | 'investor'
  | 'partner'
  | 'product'
  | 'growth'
  | 'evidence'
  | 'grant'
  | 'technology'

export type FounderBriefingType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'investor'
  | 'board'
  | 'partnership'
  | 'launch'

export type FounderBriefingStatus = 'draft' | 'needs-review' | 'approved' | 'archived'

export type FounderNarrativePeriod = 'daily' | 'weekly' | 'monthly'

export type FounderScore = {
  overall: number
  productReadiness: number
  evidenceReadiness: number
  commercialReadiness: number
  relationshipHealth: number
  revenueReadiness: number
  qualityReadiness: number
  approvalHealth: number
  explanation: string
}

export type FounderPriority = {
  id: string
  title: string
  summary: string
  reason: string
  priority: FounderPriorityLevel
  confidence: number
  category: FounderPriorityCategory
  linkedEntityType?: string
  linkedEntityId?: string
  recommendedAction: string
}

export type FounderRisk = {
  id: string
  title: string
  summary: string
  riskType: FounderRiskType
  severity: FounderPriorityLevel
  likelihood: 'high' | 'medium' | 'low'
  mitigation: string
  linkedEntityType?: string
  linkedEntityId?: string
}

export type FounderOpportunity = {
  id: string
  title: string
  summary: string
  opportunityType: FounderOpportunityType
  valueEstimate: 'high' | 'medium' | 'low' | 'unknown'
  confidence: number
  nextAction: string
  linkedEntityType?: string
  linkedEntityId?: string
}

export type StrategicAlignmentItem = {
  id: string
  entityType: string
  entityId: string
  title: string
  alignedTo: string
  alignmentScore: number
  reason: string
  recommendedAdjustment?: string
}

export type StrategicAlignmentResult = {
  aligned: StrategicAlignmentItem[]
  misaligned: StrategicAlignmentItem[]
  deferredWarnings: string[]
  recommendedAdjustments: string[]
}

export type FounderNarrative = {
  id: string
  period: FounderNarrativePeriod
  title: string
  summary: string
  highlights: string[]
  progress: string[]
  risks: string[]
  nextMoves: string[]
  safeForExternalUse: boolean
  approvalId?: string
}

export type FounderBriefingSection = {
  id: string
  title: string
  body: string
  evidencePoints: string[]
  risks: string[]
  recommendedActions: string[]
  confidence: number
}

export type FounderBriefing = {
  id: string
  type: FounderBriefingType
  generatedAt: string
  title: string
  summary: string
  sections: FounderBriefingSection[]
  sourceSnapshotId: string
  status: FounderBriefingStatus
  approvalId?: string
  limitations: string[]
}

export type FounderIntelligenceCompanySummary = {
  companyScore: number
  companyConfidence: number
  departmentScores: Array<{ departmentId: string; name: string; score: number; confidence: number }>
  ceoAgendaCount: number
  boardReportStatus: 'not-generated' | 'draft' | 'needs-review'
  departmentRisks: string[]
  departmentOpportunities: string[]
}

export type FounderIntelligenceSnapshot = {
  id: string
  generatedAt: string
  dataBasis: string
  founderScore: FounderScore
  readinessScore: number
  topPriorities: FounderPriority[]
  risks: FounderRisk[]
  opportunities: FounderOpportunity[]
  strategicAlignment: StrategicAlignmentResult
  narrative: {
    daily: FounderNarrative
    weekly: FounderNarrative
    monthly: FounderNarrative
  }
  recommendedDecisions: string[]
  briefingIds: string[]
  limitations: string[]
  company?: FounderIntelligenceCompanySummary
}

export const EXTERNAL_BRIEFING_TYPES: FounderBriefingType[] = [
  'investor',
  'board',
  'partnership',
  'launch'
]

export function isExternalBriefingType(type: FounderBriefingType): boolean {
  return EXTERNAL_BRIEFING_TYPES.includes(type)
}
