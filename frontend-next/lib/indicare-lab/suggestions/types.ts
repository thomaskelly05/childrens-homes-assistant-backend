import type { RiskLevel } from '@/lib/indicare-lab/types'
import type { ReviewRiskLevel, ReviewSource, ReviewTaskType } from '@/lib/indicare-lab/review-events/types'

export type SuggestionCategory =
  | 'brain'
  | 'knowledge'
  | 'safety'
  | 'ui-ux'
  | 'workflow'
  | 'technology'
  | 'commercial'
  | 'evaluation'

export type EvidenceStrength = 'weak' | 'moderate' | 'strong'
export type SuggestionConfidence = 'low' | 'medium' | 'high'

export type EvidenceSourceType =
  | 'shadow-review-event'
  | 'detected-pattern'
  | 'benchmark-failure'
  | 'comparison-regression'
  | 'approval-item'
  | 'founder-action'

export type EvidenceSource = {
  type: EvidenceSourceType
  id: string
  label: string
  isSynthetic: boolean
  createdAt?: string
}

export type SuggestionStatus =
  | 'new'
  | 'accepted'
  | 'dismissed'
  | 'needs-evidence'
  | 'sent-to-expert-review'

export type LabSuggestion = {
  id: string
  title: string
  category: SuggestionCategory
  description: string
  whyItMatters: string
  evidenceSources: EvidenceSource[]
  evidenceStrength: EvidenceStrength
  confidence: SuggestionConfidence
  riskLevel: RiskLevel
  affectedOrbStations: ReviewSource[]
  affectedTaskTypes: ReviewTaskType[]
  recommendedAction: string
  approvalRequirement: string
  suggestedBenchmarkRetest: string | null
  buildBriefTitle: string
  status: SuggestionStatus
  createdAt: string
  isSyntheticEvidence: boolean
}

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  brain: 'Brain',
  knowledge: 'Knowledge',
  safety: 'Safety',
  'ui-ux': 'UI / UX',
  workflow: 'Workflow',
  technology: 'Technology',
  commercial: 'Commercial',
  evaluation: 'Evaluation'
}

export const EVIDENCE_STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  weak: 'Weak',
  moderate: 'Moderate',
  strong: 'Strong'
}

export const SUGGESTION_CONFIDENCE_LABELS: Record<SuggestionConfidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
}

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: 'New',
  accepted: 'Accepted',
  dismissed: 'Dismissed',
  'needs-evidence': 'Needs more evidence',
  'sent-to-expert-review': 'Sent to expert review'
}

export const EVIDENCE_SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  'shadow-review-event': 'Shadow review',
  'detected-pattern': 'Pattern',
  'benchmark-failure': 'Benchmark failure',
  'comparison-regression': 'Comparison regression',
  'approval-item': 'Approval queue',
  'founder-action': 'Founder action'
}

export function isRealEvidenceSuggestion(suggestion: LabSuggestion): boolean {
  return !suggestion.isSyntheticEvidence && suggestion.evidenceSources.some((s) => !s.isSynthetic)
}
