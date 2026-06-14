/**
 * ORB document intelligence roadmap — scan, OCR and natural-language editing.
 * Foundation only; do not claim full OCR/editing until implemented.
 */

export type OrbDocumentIntelligenceStageStatus = 'implemented' | 'partial' | 'planned' | 'unavailable'

export type OrbDocumentIntelligenceStage = {
  id: string
  label: string
  status: OrbDocumentIntelligenceStageStatus
  description: string
  adultReviewRequired: boolean
  safeguardingNotes: string[]
  sourceFiles?: string[]
}

export const ORB_DOCUMENT_INTELLIGENCE_SAFETY_RULES = [
  'User must confirm they are authorised to use the document.',
  'Avoid unnecessary child-identifiable information.',
  'Do not photograph children or incidents casually.',
  'Edits are proposed, not automatic.',
  'An adult approves the final output before use.',
  'Source labels stay visible where a document was used.',
  'Users can delete or clear source material they attached.'
] as const

export const ORB_NATURAL_LANGUAGE_DOCUMENT_EDITING_COPY =
  'Ask ORB to improve, summarise or restructure authorised documents. You review every change before using it.'

export const ORB_DOCUMENT_INTELLIGENCE_ROADMAP: OrbDocumentIntelligenceStage[] = [
  {
    id: 'scan_document',
    label: 'Scan document',
    status: 'planned',
    description: 'Capture a paper document from camera or file for review.',
    adultReviewRequired: true,
    safeguardingNotes: [
      'Camera is browser/device controlled.',
      'Only scan documents you are authorised to use.'
    ],
    sourceFiles: ['lib/orb/orb-composer-attachments.ts']
  },
  {
    id: 'extract_text_ocr',
    label: 'Extract text / OCR',
    status: 'planned',
    description: 'Turn scanned pages into editable text with user review.',
    adultReviewRequired: true,
    safeguardingNotes: ['OCR output must be checked before use.', 'Avoid casual photos of children or incidents.'],
    sourceFiles: ['lib/orb/document-intelligence.ts']
  },
  {
    id: 'natural_language_edit',
    label: 'Ask ORB to edit with natural language',
    status: 'partial',
    description: ORB_NATURAL_LANGUAGE_DOCUMENT_EDITING_COPY,
    adultReviewRequired: true,
    safeguardingNotes: ['Proposed edits only — adult approves final output.'],
    sourceFiles: ['lib/orb/document-intelligence.ts', 'components/orb-standalone/orb-document-panel.tsx']
  },
  {
    id: 'before_after_comparison',
    label: 'Before/after comparison',
    status: 'partial',
    description: 'Compare document versions before accepting changes.',
    adultReviewRequired: true,
    safeguardingNotes: ['Comparison is for authorised documents only.'],
    sourceFiles: ['lib/orb/document-comparison.ts']
  },
  {
    id: 'track_changed_sections',
    label: 'Track changed sections',
    status: 'planned',
    description: 'Highlight sections ORB proposes to change.',
    adultReviewRequired: true,
    safeguardingNotes: ['Changes remain proposals until the adult accepts them.']
  },
  {
    id: 'adult_review_gate',
    label: 'Adult review required',
    status: 'implemented',
    description: 'Every document output requires adult review before copying or saving.',
    adultReviewRequired: true,
    safeguardingNotes: ['ORB does not replace safeguarding procedures.'],
    sourceFiles: ['lib/orb/orb-privacy-framework.ts', 'lib/orb/orb-residential-safety-copy.ts']
  },
  {
    id: 'source_label',
    label: 'Source label',
    status: 'implemented',
    description: 'Responses show which uploaded or selected document was used.',
    adultReviewRequired: false,
    safeguardingNotes: ['Source shown where available.'],
    sourceFiles: ['lib/orb/orb-privacy-framework.ts']
  },
  {
    id: 'export_copy',
    label: 'Export / copy',
    status: 'partial',
    description: 'Copy or export reviewed outputs from ORB Write and saved outputs.',
    adultReviewRequired: true,
    safeguardingNotes: ['Review before sharing outside authorised channels.'],
    sourceFiles: ['components/orb-write/orb-write-word-processor.tsx']
  },
  {
    id: 'delete_clear_source',
    label: 'Delete / clear source',
    status: 'partial',
    description: 'Remove attached documents and clear local workspace memory.',
    adultReviewRequired: false,
    safeguardingNotes: ['Users control what stays attached or saved.'],
    sourceFiles: ['lib/orb/orb-personal-context.ts']
  },
  {
    id: 'retention_control',
    label: 'Retention control',
    status: 'partial',
    description: 'Retention summaries and privacy controls for stored outputs.',
    adultReviewRequired: false,
    safeguardingNotes: ['Retention controls are being finalised for pilot deployments.'],
    sourceFiles: ['lib/orb/orb-privacy-capability-evidence.ts']
  }
]

export function getDocumentIntelligenceStage(id: string): OrbDocumentIntelligenceStage | undefined {
  return ORB_DOCUMENT_INTELLIGENCE_ROADMAP.find((stage) => stage.id === id)
}
