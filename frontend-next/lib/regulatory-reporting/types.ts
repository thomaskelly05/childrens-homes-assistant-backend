import { CareAction, EvidenceGap } from '@/lib/evidence/types'

export type ReportTemplateId =
  | 'reg44'
  | 'reg44_action_plan'
  | 'reg45'
  | 'lac_review'
  | 'placement_progress'
  | 'social_worker_update'
  | 'weekly_care_summary'
  | 'monthly_manager_report'
  | 'safeguarding_chronology'
  | 'missing_episode_analysis'
  | 'incident_pattern_review'
  | 'ofsted_evidence_pack'
  | 'manager_oversight'
  | 'keywork_progress'
  | 'education_progress'
  | 'health_medication_summary'

export type ReportSourceCitation = {
  eventId: string
  label: string
  sourceType: string
  sourceId: string
}

export type ReportSection = {
  id: string
  title: string
  body: string
  citations: ReportSourceCitation[]
  evidenceGapIds: string[]
  actionIds: string[]
  regulatoryReferenceIds: string[]
  linkedRegulations: string[]
  linkedQualityStandards: string[]
  linkedSccifAreas: string[]
  evidenceGaps: string[]
  nextActions: string[]
  reviewRequired: boolean
}

export type ReportTemplate = {
  id: ReportTemplateId
  title: string
  description: string
  regulation?: string
  sections: string[]
}

export type ReportGenerationContext = {
  templateId: ReportTemplateId
  homeId: string
  youngPersonId?: string
  dateFrom?: string
  dateTo?: string
  regulation?: string
}

export type GeneratedReport = {
  id: string
  templateId: ReportTemplateId
  title: string
  status: 'draft'
  generatedAt: string
  context: ReportGenerationContext
  sections: ReportSection[]
  citations: ReportSourceCitation[]
  evidenceGaps: EvidenceGap[]
  linkedActions: CareAction[]
  sourcePanel: {
    chronologyEventIds: string[]
    documentIds: string[]
    actionIds: string[]
    evidenceIds: string[]
    missingExpectedEvidence: string[]
  }
  disclaimer: string
}
