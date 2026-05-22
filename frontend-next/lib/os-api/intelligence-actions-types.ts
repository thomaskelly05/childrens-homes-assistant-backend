export type IntelligenceActionPriority = 'low' | 'medium' | 'high' | 'urgent'
export type IntelligenceActionStatus =
  | 'proposed'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'dismissed'
  | 'superseded'

export type IntelligenceActionRecord = {
  id: string
  home_id?: string | null
  child_id?: string | null
  staff_id?: string | null
  source_finding_id?: string | null
  source_finding_type?: string | null
  source_service?: string | null
  action_type: string
  title: string
  summary?: string | null
  priority: IntelligenceActionPriority
  status: IntelligenceActionStatus
  owner_role?: string
  owner_user_id?: string | null
  due_date?: string | null
  linked_record_ids?: string[]
  linked_evidence_ids?: string[]
  linked_action_ids?: string[]
  regulatory_links?: string[]
  sccif_links?: string[]
  quality_standard_links?: string[]
  reason?: string | null
  suggested_next_step?: string | null
  manager_decision?: string | null
  manager_decision_reason?: string | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
  audit_trail?: Array<{ at: string; event: string; actor_id?: string | null; reason?: string | null; notes?: string | null }>
  decision_support_notice?: string
}

export type IntelligenceActionSummary = {
  total: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  by_type: Record<string, number>
  urgent_count: number
  proposed_count: number
  decision_support_notice?: string
}

export type IntelligenceActionsListData = {
  actions: IntelligenceActionRecord[]
  total: number
  persistence_available: boolean
  action_notice?: string
}

export type IntelligenceActionCreatePayload = {
  home_id?: string | null
  child_id?: string | null
  staff_id?: string | null
  source_finding_id?: string | null
  source_finding_type?: string | null
  source_service?: string | null
  action_type: string
  title: string
  summary?: string | null
  priority?: IntelligenceActionPriority
  owner_role?: string
  reason?: string | null
  suggested_next_step?: string | null
  linked_record_ids?: string[]
  regulatory_links?: string[]
  sccif_links?: string[]
  quality_standard_links?: string[]
}

export type IntelligenceActionDecisionPayload = {
  decision: 'accept' | 'dismiss' | 'in_progress' | 'complete' | 'supersede'
  reason?: string | null
  manager_notes?: string | null
}

export type IntelligenceOversightReviewCreatePayload = {
  home_id?: string | null
  child_id?: string | null
  staff_id?: string | null
  review_type: string
  source?: string | null
  finding_ids?: string[]
  action_ids?: string[]
  decision: string
  decision_reason?: string | null
  manager_notes?: string | null
  follow_up_required?: boolean
  follow_up_date?: string | null
}

export type IntelligenceAttentionFeed = {
  urgent: Array<{ id: string; label: string; title: string; priority?: string; status?: string; href?: string; summary?: string }>
  high_priority: Array<{ id: string; label: string; title: string; priority?: string; status?: string; href?: string; summary?: string }>
  awaiting_decision: Array<{ id: string; label: string; title: string; priority?: string; status?: string; href?: string; summary?: string }>
  follow_ups_due: Array<{ id: string; label: string; title: string; href?: string; summary?: string }>
  in_progress_due?: Array<{ id: string; label: string; title: string; href?: string; summary?: string }>
  summary: Record<string, number>
  decision_support_notice?: string
  action_notice?: string
}
