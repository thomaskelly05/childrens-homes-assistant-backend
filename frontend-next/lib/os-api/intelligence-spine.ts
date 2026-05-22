import 'server-only'

import { osServerPost } from './server-client'

export type IntelligenceSpineRequest = {
  home_id?: string | number | null
  child_id?: string | number | null
  staff_id?: string | number | null
  mode?: 'home' | 'child' | 'staff' | 'inspection' | 'manager_daily_brief'
  days?: number
  include_live_records?: boolean
  records?: Array<Record<string, unknown>>
}

export type IntelligenceSpinePayload = {
  metadata?: {
    live_records_requested?: boolean
    live_records_found?: number
    supplied_records_found?: number
    total_records_analysed?: number
    collector_warnings?: string[]
    generated_at?: string
    mode?: string
    snapshot?: Record<string, unknown>
  }
  manager_daily_brief?: {
    headline?: string
    urgent_review?: string[]
    safeguarding_signals?: string[]
    children_to_review?: string[]
    staff_support_signals?: string[]
    records_needing_signoff?: string[]
    overdue_actions?: string[]
    ofsted_evidence_risks?: string[]
    quality_of_recording?: string[]
    positive_progress?: string[]
    suggested_manager_actions?: string[]
    decision_support_notice?: string
  }
  summary?: {
    headline?: string
    evidence_status?: string
    pattern_count?: number
    priority_action_count?: number
    manager_oversight_count?: number
  }
  patterns?: Array<{ pattern_type: string; severity: string; summary: string }>
  ofsted_simulation?: Array<{
    judgement_area: string
    evidence_strength: string
    likely_strengths?: string[]
    likely_challenges?: string[]
    missing_evidence?: string[]
    inspection_questions?: string[]
  }>
  evidence_graph?: { graph_summary?: string; evidence_gaps?: string[] }
  record_quality?: Array<{
    record_id: string
    record_type: string
    overall_quality: string
    therapeutic_language_flags?: string[]
    manager_review_required?: boolean
  }>
  priority_actions?: Array<{ title: string; priority: string; suggested_next_step: string }>
  proposed_actions?: Array<{
    id?: string
    action_type?: string
    title: string
    summary?: string
    priority: string
    status?: string
    reason?: string
    suggested_next_step?: string
    regulatory_links?: string[]
    sccif_links?: string[]
    manager_decision?: string | null
  }>
  action_summary?: {
    total?: number
    by_status?: Record<string, number>
    by_priority?: Record<string, number>
    by_type?: Record<string, number>
    urgent_count?: number
    proposed_count?: number
  }
  action_notice?: string
  what_has_improved?: string[]
  what_has_deteriorated?: string[]
  manager_review_required?: string[]
  decision_support_notice?: string
}

const emptySpine: IntelligenceSpinePayload = {
  summary: { headline: '', evidence_status: 'limited', pattern_count: 0, priority_action_count: 0, manager_oversight_count: 0 },
  patterns: [],
  ofsted_simulation: [],
  evidence_graph: { graph_summary: '', evidence_gaps: [] },
  record_quality: [],
  priority_actions: [],
  what_has_improved: [],
  what_has_deteriorated: [],
  manager_review_required: [],
  metadata: { collector_warnings: [] }
}

export type {
  IntelligenceActionRecord,
  IntelligenceActionSummary,
  IntelligenceActionsListData,
  IntelligenceActionCreatePayload,
  IntelligenceActionDecisionPayload,
  IntelligenceOversightReviewCreatePayload,
  IntelligenceAttentionFeed
} from './intelligence-actions-types'

export {
  bulkCreateIntelligenceActions,
  completeIntelligenceAction,
  createIntelligenceAction,
  createOversightReview,
  decideIntelligenceAction,
  fetchIntelligenceActions,
  fetchIntelligenceActionSummary,
  fetchIntelligenceAttentionFeed,
  proposeIntelligenceActions
} from './intelligence-actions'

export function postIntelligenceSpine(body: IntelligenceSpineRequest) {
  return osServerPost<IntelligenceSpinePayload>(
    '/intelligence/spine',
    {
      mode: body.mode || 'manager_daily_brief',
      home_id: body.home_id ?? undefined,
      child_id: body.child_id ?? undefined,
      staff_id: body.staff_id ?? undefined,
      days: body.days ?? 1,
      include_live_records: body.include_live_records ?? true,
      records: body.records ?? [],
      include_patterns: true,
      include_ofsted_simulation: true,
      include_record_quality: true,
      include_evidence_graph: true,
      use_snapshot_cache: true
    },
    emptySpine
  )
}
