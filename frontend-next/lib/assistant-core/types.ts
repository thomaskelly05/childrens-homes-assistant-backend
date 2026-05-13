export type AssistantMode =
  | 'embedded'
  | 'standalone'
  | 'report_writer'
  | 'chronology_qna'
  | 'regulatory_readiness'
  | 'safeguarding_review'
  | 'handover'
  | 'reg44_action_plan'
  | 'reg45_writer'
  | 'lac_review_writer'
  | 'safeguarding_chronology'
  | 'manager_oversight_report'
  | 'ofsted_evidence_pack'

export type AssistantConfidence = 'low' | 'medium' | 'high'

export type AssistantContext = {
  user_id?: number | null
  staff_profile?: Record<string, unknown> | null
  role?: string | null
  permissions?: string[]
  home_id?: number | null
  provider_id?: number | null
  organisation_id?: number | null
  allowed_home_ids?: number[]
  home_scope?: Record<string, unknown>
  current_route?: string | null
  current_workspace_type?: string | null
  selected_young_person_id?: number | null
  selected_record_id?: string | null
  selected_record_type?: string | null
  selected_report_id?: string | null
  selected_document_id?: string | null
  active_filters?: Record<string, unknown>
  visible_chronology_ids?: string[]
  visible_action_ids?: string[]
  visible_evidence_ids?: string[]
  regulatory_scope?: string[]
  sccif_scope?: string[]
  conversation_id?: string | null
  project_id?: string | null
  assistant_mode?: AssistantMode
  page_title?: string | null
  selected_record_summary?: string | null
}

export type AssistantCitation = {
  label: string
  source_type: string
  source_id: string
  route?: string | null
  date?: string | null
  staff_name?: string | null
  young_person_name?: string | null
  excerpt?: string
  confidence?: AssistantConfidence | string
  source_quality?: string
  regulation_links?: unknown[]
  sccif_links?: unknown[]
}

export type AssistantRelatedRecord = {
  source_type: string
  source_id: string
  title?: string
  summary?: string
  route?: string
  date?: string | null
}

export type AssistantSuggestedAction = {
  id?: string
  title: string
  priority?: string
  status?: string
  route?: string
  source_type?: string
  source_id?: string
}

export type AssistantEvidenceGap = {
  area?: string
  gap: string
  severity?: string
  source_id?: string
}

export type AssistantRegulatoryLink = {
  type?: string
  label?: string
  key?: string
  status?: string
  regulation?: string
}

export type AssistantQueryData = {
  answer: string
  citations: AssistantCitation[]
  related_records: AssistantRelatedRecord[]
  suggested_actions: AssistantSuggestedAction[]
  evidence_gaps: AssistantEvidenceGap[]
  regulatory_links: AssistantRegulatoryLink[]
  follow_up_questions: string[]
  confidence: AssistantConfidence
  review_required: boolean
  retrieval?: {
    source_count?: number
    errors?: string[]
  }
}

export type AssistantQueryRequest = {
  message: string
  mode: AssistantMode
  context: AssistantContext
  conversation_id?: string
  project_id?: string
}

export type AssistantQuerySuccess = {
  success: true
  data: AssistantQueryData
}

export type AssistantQueryError = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type AssistantQueryResponse = AssistantQuerySuccess | AssistantQueryError
