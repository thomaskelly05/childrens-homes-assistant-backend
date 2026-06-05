export type OrbKnowledgeSourceKind =
  | 'official_guidance'
  | 'home_document'
  | 'provider_policy'
  | 'uploaded_document'
  | 'useful_link'
  | 'local_protocol'

export type OrbKnowledgeApprovalStatus = 'approved' | 'draft' | 'needs_review' | 'archived'

export type OrbKnowledgeLibraryItem = {
  id: string
  provider_id?: string | null
  user_id?: string | null
  home_id?: string | null
  title: string
  source_kind: OrbKnowledgeSourceKind
  publisher?: string | null
  url?: string | null
  file_name?: string | null
  content_text?: string | null
  summary?: string | null
  tags: string[]
  related_record_type_ids: string[]
  approval_status: OrbKnowledgeApprovalStatus
  review_due_at?: string | null
  last_checked_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export type OrbOfficialGuidanceEntry = {
  id: string
  title: string
  source_type: 'official' | 'statutory' | 'inspection_framework'
  publisher: string
  jurisdiction: string
  url: string
  last_checked_at: string
  approval_status: 'approved' | 'needs_review'
  related_record_type_ids: string[]
  related_topics: string[]
  metadata_only: true
}
