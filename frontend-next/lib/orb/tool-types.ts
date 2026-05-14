export type OrbToolCategory =
  | 'care_records'
  | 'citations'
  | 'evidence_gaps'
  | 'inspection'
  | 'current_facts'
  | 'productivity'
  | 'general'
  | 'draft_write_safety'

export type OrbToolManifestItem = {
  name: string
  category: OrbToolCategory | string
  requires_confirmation: boolean
  requires_citations: boolean
}

export const orbToolCategoryLabels: Record<string, string> = {
  care_records: 'Care records',
  citations: 'Citations',
  evidence_gaps: 'Evidence gaps',
  inspection: 'Inspection',
  current_facts: 'Live tools',
  productivity: 'Productivity',
  general: 'General Q&A',
  draft_write_safety: 'Draft safety'
}

