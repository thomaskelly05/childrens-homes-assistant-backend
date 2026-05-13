export type OsApiSource = 'live' | 'fallback'

export type OsApiResult<T> = {
  data: T
  source: OsApiSource
  meta?: Record<string, unknown>
  warning?: string
  error?: string
}

export type OsEnvelope<T> = {
  success?: boolean
  data?: T
  meta?: Record<string, unknown>
  detail?: string
}

export type OsTransitionPayload = {
  transition: string
  notes?: string
  comment?: string
  assigned_to_staff_id?: string | number
  assigned_to_user_id?: string | number
  assigned_role?: string
  due_date?: string
  metadata?: Record<string, unknown>
}

export type OsTransitionResult = {
  entity_type: string
  record_id: string
  source_table?: string
  source_id?: string
  transition: string
  status: string
  workflow_event_id?: string
  chronology_event_id?: string
  audit_event_id?: string
  updated_record?: Record<string, unknown>
}
