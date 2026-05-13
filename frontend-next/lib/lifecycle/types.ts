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
