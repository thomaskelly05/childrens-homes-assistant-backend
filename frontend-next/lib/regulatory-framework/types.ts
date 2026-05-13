import { CareAction, EvidenceItem } from '@/lib/evidence/types'
import { ChronologyEvent, ChronologyEventType } from '@/lib/chronology/types'

export type RegulatoryFramework =
  | 'children_homes_regulations_2015'
  | 'quality_standards'
  | 'sccif'
  | 'reg44'
  | 'reg45'
  | 'lac_review'
  | 'ofsted_evidence'

export type EvidenceStrength = 'strong' | 'adequate' | 'partial' | 'gap' | 'review_required'

export type LinkedRecordType =
  | 'daily_log'
  | 'incident'
  | 'safeguarding'
  | 'risk_assessment'
  | 'medication'
  | 'keywork'
  | 'appointment'
  | 'document'
  | 'report'
  | 'action'
  | 'evidence'
  | 'manager_review'
  | 'reg44_report'
  | 'reg45_report'
  | 'lac_review'
  | 'staff_supervision'
  | 'training_record'
  | 'placement_plan'
  | 'care_plan'

export type RegulatoryReference = {
  id: string
  framework: RegulatoryFramework
  code: string
  title: string
  summary: string
  plainEnglish: string
  evidenceExpectations: string[]
  whatGoodEvidenceLooksLike: string[]
  whatPoorEvidenceLooksLike: string[]
  linkedRecordTypes: LinkedRecordType[]
  linkedEventTypes: ChronologyEventType[]
  inspectionPrompts: string[]
  qualityIndicators: string[]
  riskIndicators: string[]
  commonEvidenceGaps: string[]
  reportSections: string[]
}

export type RegulatoryLinkContext = {
  references: RegulatoryReference[]
  evidenceStrength: EvidenceStrength
  gaps: string[]
  suggestedNextAction: string
}

export type RegulatoryCoverageItem = {
  reference: RegulatoryReference
  events: ChronologyEvent[]
  evidence: EvidenceItem[]
  actions: CareAction[]
  evidenceStrength: EvidenceStrength
  gaps: string[]
  suggestedNextAction: string
}

export type RegulatoryCoverage = {
  items: RegulatoryCoverageItem[]
  strongEvidence: RegulatoryCoverageItem[]
  needsReview: RegulatoryCoverageItem[]
  evidenceGaps: RegulatoryCoverageItem[]
}
