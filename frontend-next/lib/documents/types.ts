export type HomeDocumentStatus = 'draft' | 'uploaded' | 'processing' | 'review' | 'review_required' | 'returned_for_update' | 'action_plan_open' | 'approved' | 'signed_off' | 'archived'

export type HomeDocumentType =
  | 'reg44_report'
  | 'reg45_report'
  | 'lac_review'
  | 'care_plan'
  | 'risk_assessment'
  | 'placement_plan'
  | 'statement_of_purpose'
  | 'missing_protocol'
  | 'behaviour_support_plan'
  | 'safeguarding_report'
  | 'medication_audit'
  | 'fire_safety'
  | 'staff_supervision'
  | 'training_record'
  | 'policy'
  | 'inspection_report'
  | 'complaint_record'

export type ExtractedFinding = {
  id: string
  title: string
  summary: string
  regulation?: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
  actionIds: string[]
  evidenceRequired: string[]
  chronologyEventId?: string
}

export type HomeDocument = {
  id: string
  homeId: string
  title: string
  documentType: HomeDocumentType
  uploadedAt: string
  uploadedBy: string
  periodStart?: string
  periodEnd?: string
  fileName: string
  fileUrl: string
  status: HomeDocumentStatus
  extractedText?: string
  extractedFindings: ExtractedFinding[]
  linkedActions: string[]
  linkedEvidence: string[]
  regulation?: string
  reviewRequiredBy?: string
  tags: string[]
}
