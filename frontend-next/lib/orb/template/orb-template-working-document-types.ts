/** Types for ORB template working documents — mirrors backend schema. */

export type OrbTemplateSectionType =
  | 'narrative'
  | 'checklist'
  | 'table'
  | 'chart'
  | 'action_plan'
  | 'reflection'
  | 'evidence'
  | 'signatures'

export type OrbTemplateDocumentType =
  | 'short_record'
  | 'long_record'
  | 'report'
  | 'audit'
  | 'tracker'
  | 'care_plan_contribution'
  | 'risk_assessment'
  | 'evidence_pack'
  | 'letter'
  | 'communication_pack'
  | 'supervision_document'
  | 'action_plan'
  | 'chronology'
  | 'review_document'

export type OrbTemplateSourceChip = {
  chip_id: string
  label: string
  chip_type: 'practice_anchor' | 'regulation_anchor' | 'home_document' | 'template_source'
  reference_id?: string | null
  metadata_only: boolean
}

export type OrbTemplateWorkingDocumentSection = {
  section_id: string
  heading: string
  guidance?: string | null
  prompt?: string | null
  body: string
  required: boolean
  section_type: OrbTemplateSectionType
  orb_assist_enabled: boolean
  home_document_context_enabled: boolean
  sort_order: number
}

export type OrbTemplateWorkingDocumentTable = {
  table_id: string
  table_type: string
  title: string
  columns: string[]
  rows: Array<Record<string, unknown>>
  editable: boolean
  guidance?: string | null
  empty_state_guidance?: string | null
}

export type OrbTemplateWorkingDocumentChart = {
  chart_id: string
  chart_type: string
  title: string
  source_table_id?: string | null
  data: Record<string, unknown>
  optional: boolean
  has_data: boolean
  empty_state_guidance: string
}

export type OrbTemplateWorkingDocument = {
  document_id: string
  template_id: string
  title: string
  description?: string | null
  document_type: OrbTemplateDocumentType
  lifecycle_group?: string | null
  category?: string | null
  station_availability: string[]
  safeguarding_level: string
  regulation_anchors: string[]
  home_document_context_allowed: boolean
  allowed_home_document_types: string[]
  sections: OrbTemplateWorkingDocumentSection[]
  fields: Array<Record<string, unknown>>
  tables: OrbTemplateWorkingDocumentTable[]
  charts: OrbTemplateWorkingDocumentChart[]
  action_plans: OrbTemplateWorkingDocumentTable[]
  review_prompts: string[]
  child_voice_prompts: string[]
  therapeutic_guidance: string[]
  what_to_avoid: string[]
  source_chips: OrbTemplateSourceChip[]
  linked_home_document_ids: string[]
  home_document_chips: OrbTemplateSourceChip[]
  save_destination: string
  export_options: string[]
  review_before_use_reminder: string
  compliance_disclaimer: string
  home_document_disclaimer: string
  safety_standards: string
  rendered_body: string
  source_station: string
  status: 'draft' | 'reviewed' | 'finalised' | 'archived'
  owner_user_id?: string | null
  home_id?: string | null
  child_id?: string | null
  audit_trail: Array<Record<string, unknown>>
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

export const ORB_WORKING_DOCUMENT_API = {
  search: '/templates/working-document/search',
  build: '/templates/working-document/build',
  open: (templateId: string) => `/templates/working-document/${encodeURIComponent(templateId)}/open`,
  components: (templateId: string) =>
    `/templates/working-document/${encodeURIComponent(templateId)}/components`,
  fromAnswer: (templateId: string) =>
    `/templates/working-document/${encodeURIComponent(templateId)}/from-answer`,
  fromDictation: (templateId: string) =>
    `/templates/working-document/${encodeURIComponent(templateId)}/from-dictation`,
  sectionOrbHelp: '/templates/working-document/section-orb-help',
  generateChart: '/templates/working-document/generate-chart',
  save: '/templates/working-document/save',
  homeDocuments: (templateId: string) =>
    `/templates/working-document/${encodeURIComponent(templateId)}/home-documents`
} as const
