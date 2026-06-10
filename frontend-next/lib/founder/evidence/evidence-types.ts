export type EvidenceAudience =
  | 'investor'
  | 'provider'
  | 'openai'
  | 'microsoft'
  | 'innovate-uk'
  | 'dfe'
  | 'local-authority'
  | 'pilot-partner'
  | 'general'

export type EvidencePackStatus = 'draft' | 'needs-review' | 'approved' | 'archived'

export type EvidenceConfidence = 'high' | 'medium' | 'low'

export type EvidenceDataSource =
  | 'live-telemetry'
  | 'quality-lab'
  | 'founder-memory'
  | 'audit-log'
  | 'actions'
  | 'approvals'
  | 'manual'

export type EvidencePoint = {
  id: string
  claim: string
  support: string
  sourceLabel: string
  sourceType: EvidenceDataSource | string
  confidence: EvidenceConfidence
  limitation?: string
}

export type EvidenceSection = {
  id: string
  title: string
  summary: string
  evidencePoints: EvidencePoint[]
  confidence: EvidenceConfidence
  dataSource: EvidenceDataSource
  limitations: string[]
}

export type EvidenceSafetyReview = {
  safe: boolean
  issues: Array<{ code: string; message: string; severity: string }>
  requiresReview: boolean
  reviewedAt: string
}

export type EvidencePack = {
  id: string
  title: string
  audience: EvidenceAudience
  purpose: string
  status: EvidencePackStatus
  dataBasis: string
  createdAt: string
  updatedAt: string
  createdBy: string
  sections: EvidenceSection[]
  safetyReview: EvidenceSafetyReview
  approvalId?: string
  limitations: string[]
}

export type EvidenceSourceBundle = {
  strategicContext: string[]
  telemetryEvidence: EvidencePoint[]
  qualityEvidence: EvidencePoint[]
  productEvidence: EvidencePoint[]
  governanceEvidence: EvidencePoint[]
  safetyEvidence: EvidencePoint[]
  growthEvidence: EvidencePoint[]
  commercialEvidence: EvidencePoint[]
  limitations: string[]
}

export const EVIDENCE_AUDIENCE_LABELS: Record<EvidenceAudience, string> = {
  investor: 'Investor',
  provider: 'Provider',
  openai: 'OpenAI',
  microsoft: 'Microsoft',
  'innovate-uk': 'Innovate UK',
  dfe: 'DfE',
  'local-authority': 'Local Authority',
  'pilot-partner': 'Pilot Partner',
  general: 'General'
}
