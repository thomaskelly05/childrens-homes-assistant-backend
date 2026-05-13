export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent'

export type CareActionStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'blocked'

export type EvidenceQuality = 'draft' | 'partial' | 'adequate' | 'strong' | 'review_required'

export type EvidenceType =
  | 'daily_record'
  | 'incident_record'
  | 'direct_observation'
  | 'child_voice'
  | 'professional_feedback'
  | 'family_feedback'
  | 'document'
  | 'photo'
  | 'manager_review'
  | 'audit'
  | 'regulatory_finding'

export type CareAction = {
  id: string
  title: string
  description: string
  sourceType: string
  sourceId: string
  assignedToStaffId: string
  youngPersonId?: string
  homeId: string
  dueDate: string
  priority: ActionPriority
  status: CareActionStatus
  regulation?: string
  evidenceRequired: string[]
  evidenceIds: string[]
  createdAt: string
  completedAt?: string
}

export type EvidenceItem = {
  id: string
  title: string
  description: string
  evidenceType: EvidenceType
  sourceType: string
  sourceId: string
  youngPersonId?: string
  homeId: string
  linkedRegulation?: string
  linkedReportIds: string[]
  createdBy: string
  createdAt: string
  quality: EvidenceQuality
  tags: string[]
}

export type EvidenceGap = {
  id: string
  title: string
  description: string
  regulation?: string
  youngPersonId?: string
  homeId: string
  priority: ActionPriority
  sourceEventIds: string[]
  suggestedAction: string
}
