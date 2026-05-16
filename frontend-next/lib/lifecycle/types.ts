export type LifecycleEntityType =
  | 'young_person'
  | 'staff'
  | 'daily_record'
  | 'incident'
  | 'safeguarding'
  | 'risk_assessment'
  | 'medication'
  | 'health'
  | 'keywork'
  | 'appointment'
  | 'document'
  | 'reg44'
  | 'report'
  | 'reg45'
  | 'lac_review'
  | 'action'
  | 'evidence'

export type LifecycleStatus = 'open' | 'acknowledged' | 'in_review' | 'resolved' | 'reopened' | 'escalated' | 'archived'

export type LifecycleState = {
  entityType: LifecycleEntityType
  recordId: string
  status: string
  label: string
  description: string
  nextSteps: string[]
  requiredActions: string[]
  blockers: string[]
}

export type LifecycleHistoryItem = {
  id: string
  transition: string
  status: LifecycleStatus
  actor?: string
  occurredAt?: string
  notes?: string
  evidenceIds: string[]
  chronologyIds: string[]
  governanceIds: string[]
}

export type OperationalLifecycleView = {
  id: string
  entityType: string
  title: string
  currentState: LifecycleStatus
  transition?: string
  assignedTo?: string
  assignedRole?: string
  resolvedBy?: string
  resolvedAt?: string
  resolutionReason?: string
  reviewNotes?: string
  escalatedBy?: string
  escalatedAt?: string
  escalationReason?: string
  signoffState?: string
  signedOffBy?: string
  signedOffAt?: string
  evidenceIds: string[]
  chronologyIds: string[]
  governanceIds: string[]
  history: LifecycleHistoryItem[]
  summary: string
}
