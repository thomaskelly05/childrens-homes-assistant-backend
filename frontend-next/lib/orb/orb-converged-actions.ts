/**
 * Canonical ORB converged action/lens registry — single source for practice workflows.
 * Reuses existing edit modes, document lenses, recording framework and handoff routes.
 * Do not duplicate intelligence here; wire surfaces to governed routes only.
 */

import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import {
  RESIDENTIAL_DOCUMENT_CROSS_ACTIONS,
  RESIDENTIAL_FIRST_CLASS_LENSES,
  type OrbDocumentLens
} from '@/lib/orb/document-intelligence'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type OrbConvergedSurface =
  | 'chat'
  | 'dictate'
  | 'voice'
  | 'orb_write'
  | 'templates'
  | 'documents'
  | 'saved_outputs'

export type OrbConvergedOutputTarget =
  | 'chat'
  | 'write'
  | 'saved_output'
  | 'document_analysis'
  | 'template'
  | 'dictate'

export type OrbConvergedActionCategory =
  | 'core'
  | 'quality'
  | 'safeguarding'
  | 'inspection'
  | 'create_related'
  | 'export'
  | 'document_lens'
  | 'chat_starter'
  | 'dictate_output'

export type OrbWriteAiGroup = 'converged' | 'quality' | 'safeguarding' | 'outputs'

export type OrbConvergedAction = {
  id: string
  label: string
  description: string
  category: OrbConvergedActionCategory
  surfaces: OrbConvergedSurface[]
  /** Existing route or helper — not a new AI brain. */
  route: string
  outputTarget: OrbConvergedOutputTarget
  requiresHumanReview: boolean
  highRiskCaution?: string
  editMode?: OrbDictateEditMode
  instruction?: string
  writeGroup?: OrbWriteAiGroup
  chatMode?: StandaloneOrbMode
  chatPrompt?: string
  documentLens?: OrbDocumentLens
  dictateNoteType?: OrbDictateNoteType
  hero?: boolean
}

/** ORB Write assistant actions — governed Dictate edit API (`editOrbDictateDocument`). */
export const ORB_CONVERGED_WRITE_ACTIONS: OrbConvergedAction[] = [
  {
    id: 'missing',
    label: 'What am I missing?',
    description: 'Highlight missing information and evidence gaps',
    category: 'core',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:missing_information',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'missing_information',
    instruction: 'What important information might be missing from this record?',
    writeGroup: 'converged'
  },
  {
    id: 'review_record',
    label: 'Review this record',
    description: 'Holistic review for safeguarding, child voice and recording quality',
    category: 'core',
    surfaces: ['orb_write', 'chat'],
    route: 'editOrbDictateDocument:recording_quality_review',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'recording_quality_review',
    instruction:
      'Review this record for safeguarding, child voice, recording quality and professional tone — suggest improvements only',
    writeGroup: 'converged'
  },
  {
    id: 'professional',
    label: 'Make more professional',
    description: 'Improve professional tone for residential records',
    category: 'quality',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:professional_language',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'professional_language',
    instruction: 'Improve professional tone suitable for residential records',
    writeGroup: 'quality'
  },
  {
    id: 'remove_blame',
    label: 'Remove blame language',
    description: 'Reduce judgemental or blaming wording',
    category: 'quality',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:less_judgemental',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'less_judgemental',
    instruction: 'Remove judgemental or blaming language while keeping facts accurate',
    writeGroup: 'quality'
  },
  {
    id: 'child_centred',
    label: 'Make child-centred',
    description: 'Rewrite with a child-centred perspective',
    category: 'quality',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:child_voice',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'child_voice',
    instruction: 'Rewrite with a child-centred perspective while keeping facts accurate',
    writeGroup: 'quality'
  },
  {
    id: 'grammar',
    label: 'Improve grammar',
    description: 'Grammar and clarity without changing meaning',
    category: 'quality',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:spelling_grammar',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'spelling_grammar',
    instruction: 'Improve grammar and clarity without changing meaning',
    writeGroup: 'quality'
  },
  {
    id: 'check_spelling_grammar',
    label: 'Check spelling and grammar',
    description: 'Spelling and grammar suggestions — adult accepts before applying',
    category: 'quality',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:spelling_grammar',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'spelling_grammar',
    instruction:
      'Check spelling and grammar — suggest corrections only, do not change meaning or direct quotes without marking them',
    writeGroup: 'quality'
  },
  {
    id: 'check_names_dates_times',
    label: 'Check names, dates and times',
    description: 'Verify names, dates and times are consistent and complete',
    category: 'quality',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:missing_information',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'missing_information',
    instruction: 'Check names, dates and times for consistency and completeness — suggest fixes only',
    writeGroup: 'quality'
  },
  {
    id: 'apply_therapeutic_style',
    label: 'Apply therapeutic style',
    description: 'Trauma-informed, emotionally literate wording',
    category: 'quality',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:therapeutic_rewrite',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'therapeutic_rewrite',
    instruction:
      'Rewrite with therapeutic, trauma-informed language — behaviour as communication, non-blaming',
    writeGroup: 'quality'
  },
  {
    id: 'apply_child_centred_style',
    label: 'Apply child-centred style',
    description: 'Child voice and impact centred in the record',
    category: 'quality',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:child_voice',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'child_voice',
    instruction: 'Rewrite with a child-centred perspective while keeping facts accurate',
    writeGroup: 'quality'
  },
  {
    id: 'apply_concise_professional_style',
    label: 'Apply concise professional style',
    description: 'Shorter, clear professional residential wording',
    category: 'quality',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:concise_summary',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'concise_summary',
    instruction: 'Make this more concise while keeping essential facts and child voice',
    writeGroup: 'quality'
  },
  {
    id: 'apply_inspection_ready_style',
    label: 'Apply inspection evidence preparation style',
    description: 'Evidence-focused, audit-ready structure',
    category: 'inspection',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:inspection_evidence_support',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'inspection_evidence_support',
    instruction: 'Polish for inspection evidence — impact on child clear, structure audit-ready',
    writeGroup: 'quality'
  },
  {
    id: 'record_properly',
    label: 'Record this properly',
    description: 'Turn rough notes into a professional residential record',
    category: 'core',
    surfaces: ['orb_write', 'chat', 'dictate'],
    route: 'editOrbDictateDocument:professional_language',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'professional_language',
    instruction:
      'Turn rough notes into a professional residential record with observable facts and child-centred language',
    writeGroup: 'converged'
  },
  {
    id: 'safeguarding_gaps',
    label: 'Check safeguarding gaps',
    description: 'Identify safeguarding gaps and escalation prompts',
    category: 'safeguarding',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:safeguarding_lens',
    outputTarget: 'write',
    requiresHumanReview: true,
    highRiskCaution: 'Adult reviews safeguarding suggestions before applying or sharing.',
    editMode: 'safeguarding_lens',
    instruction: 'Identify safeguarding gaps and suggest additions — adult reviews before applying',
    writeGroup: 'safeguarding'
  },
  {
    id: 'safeguarding_lens',
    label: 'Add safeguarding lens',
    description: 'Add safeguarding considerations to the record',
    category: 'safeguarding',
    surfaces: ['orb_write', 'documents'],
    route: 'editOrbDictateDocument:safeguarding_lens',
    outputTarget: 'write',
    requiresHumanReview: true,
    highRiskCaution: 'Adult reviews safeguarding suggestions before applying or sharing.',
    editMode: 'safeguarding_lens',
    instruction: 'Add safeguarding considerations and escalation prompts — adult reviews before applying',
    writeGroup: 'converged'
  },
  {
    id: 'ofsted_ready',
    label: 'Check Inspection evidence preparation',
    description: 'Review for Inspection evidence preparation without regulatory judgements',
    category: 'inspection',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:inspection_evidence_support',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'inspection_evidence_support',
    instruction: 'Review for Inspection evidence preparation without making regulatory judgements',
    writeGroup: 'safeguarding'
  },
  {
    id: 'ofsted_lens',
    label: 'Add Ofsted/inspection lens',
    description: 'Inspection evidence preparation lens on the draft',
    category: 'inspection',
    surfaces: ['orb_write', 'documents', 'chat'],
    route: 'editOrbDictateDocument:inspection_evidence_support',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'inspection_evidence_support',
    instruction: 'Review for Inspection evidence preparation without making regulatory judgements',
    writeGroup: 'converged'
  },
  {
    id: 'recording_quality',
    label: 'Check recording quality',
    description: 'Child-centred recording quality review',
    category: 'safeguarding',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:recording_quality_review',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'recording_quality_review',
    instruction: 'Review recording quality, observable facts and child-centred language',
    writeGroup: 'safeguarding'
  },
  {
    id: 'child_voice_check',
    label: 'Check child voice',
    description: 'Whether the child’s perspective is visible in the record',
    category: 'safeguarding',
    surfaces: ['orb_write'],
    route: 'editOrbDictateDocument:child_voice',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'child_voice',
    instruction: 'Check whether child voice is present and suggest improvements without inventing quotes',
    writeGroup: 'safeguarding'
  },
  {
    id: 'manager_oversight',
    label: 'Check manager oversight',
    description: 'Manager review and escalation points',
    category: 'safeguarding',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:manager_oversight',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'manager_oversight',
    instruction: 'Check manager oversight, escalation and follow-up points',
    writeGroup: 'safeguarding'
  },
  {
    id: 'guidance_check',
    label: 'Check against selected guidance',
    description: 'Compare draft against residential guidance and quality standards',
    category: 'inspection',
    surfaces: ['orb_write', 'documents'],
    route: 'editOrbDictateDocument:sccif_lens',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'sccif_lens',
    instruction:
      'Check this record against residential guidance and quality standards — highlight gaps without regulatory judgements',
    writeGroup: 'converged'
  },
  {
    id: 'chronology',
    label: 'Create chronology entry',
    description: 'Safeguarding file chronology entry',
    category: 'create_related',
    surfaces: ['orb_write', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:chronology_conversion',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'chronology_conversion',
    instruction: 'Turn this into a chronology entry suitable for a safeguarding file',
    writeGroup: 'converged'
  },
  {
    id: 'manager_summary',
    label: 'Create manager summary',
    description: 'Concise manager oversight summary',
    category: 'create_related',
    surfaces: ['orb_write', 'chat', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:manager_note',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'manager_note',
    instruction: 'Create a concise manager summary suitable for oversight',
    writeGroup: 'converged'
  },
  {
    id: 'handover',
    label: 'Create handover',
    description: 'Safe shift handover with priorities and risks',
    category: 'create_related',
    surfaces: ['orb_write', 'chat', 'dictate', 'templates'],
    route: 'editOrbDictateDocument:handover_conversion',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'handover_conversion',
    instruction: 'Turn this into a safe shift handover with priorities, risks and manager attention points',
    writeGroup: 'converged'
  },
  {
    id: 'action_plan',
    label: 'Create action plan',
    description: 'Practical action plan with owners and follow-up',
    category: 'create_related',
    surfaces: ['orb_write', 'dictate', 'templates', 'documents'],
    route: 'editOrbDictateDocument:action_plan',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'action_plan',
    instruction: 'Create a practical action plan with owners and follow-up from this record',
    writeGroup: 'converged'
  },
  {
    id: 'social_worker_update',
    label: 'Create social worker update',
    description: 'RI / social worker summary from the record',
    category: 'create_related',
    surfaces: ['orb_write', 'dictate'],
    route: 'editOrbDictateDocument:ri_summary',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'ri_summary',
    instruction: 'Create a concise update suitable for social worker or reviewing inspector',
    writeGroup: 'converged'
  },
  {
    id: 'prepare_pdf',
    label: 'Prepare PDF',
    description: 'Polish formatting for PDF export',
    category: 'export',
    surfaces: ['orb_write'],
    route: 'editOrbDictateDocument:professional_language + exportOrbWritePdf',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'professional_language',
    instruction: 'Polish formatting and headings so this is ready to export as PDF',
    writeGroup: 'outputs'
  },
  {
    id: 'save_draft',
    label: 'Save draft',
    description: 'Save local ORB Write draft',
    category: 'export',
    surfaces: ['orb_write'],
    route: 'saveOrbWriteLocalDraft',
    outputTarget: 'write',
    requiresHumanReview: true
  },
  {
    id: 'mark_reviewed',
    label: 'Mark reviewed / finalise',
    description: 'Mark document reviewed before export',
    category: 'export',
    surfaces: ['orb_write'],
    route: 'orb-write-toolbar:finalise',
    outputTarget: 'write',
    requiresHumanReview: true,
    highRiskCaution: 'Finalise only after adult review.'
  }
]

/** Chat empty-state starters — conversational entry points. */
export const ORB_CONVERGED_CHAT_STARTER_ACTIONS: OrbConvergedAction[] = [
  {
    id: 'starter_handover',
    label: 'Create handover / shift plan',
    description: 'Start a handover or shift plan conversation',
    category: 'chat_starter',
    surfaces: ['chat'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatPrompt: 'Create a handover / shift plan'
  },
  {
    id: 'starter_review_practice',
    label: 'Review written practice',
    description: 'Reflect on written practice with ORB',
    category: 'chat_starter',
    surfaces: ['chat'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatPrompt: 'Review written practice'
  },
  {
    id: 'starter_safeguarding',
    label: 'Think through safeguarding concern',
    description: 'Step-by-step safeguarding thinking',
    category: 'chat_starter',
    surfaces: ['chat'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatMode: 'Safeguarding Thinking',
    chatPrompt: 'Think through a safeguarding concern',
    highRiskCaution: 'ORB supports thinking — escalate to your safeguarding lead when required.'
  },
  {
    id: 'starter_inspection',
    label: 'Prepare for inspection / Ofsted evidence',
    description: 'Inspection and evidence preparation',
    category: 'chat_starter',
    surfaces: ['chat'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatMode: 'Ofsted Lens',
    chatPrompt: 'Prepare for inspection / Ofsted evidence'
  },
  {
    id: 'starter_record_properly',
    label: 'Record this properly',
    description: 'Professional recording support',
    category: 'chat_starter',
    surfaces: ['chat'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatMode: 'Record This Properly',
    chatPrompt: 'Record this properly'
  },
  {
    id: 'starter_manager_summary',
    label: 'Create manager summary',
    description: 'Manager oversight summary from chat',
    category: 'chat_starter',
    surfaces: ['chat'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatPrompt: 'Create manager summary'
  },
  {
    id: 'starter_reg44_action_plan',
    label: 'Build action plan from Reg 44 / Statement of Purpose',
    description: 'Reg 44 or Statement of Purpose action planning',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatMode: 'Reg 44 / Reg 45 Prep',
    chatPrompt: 'Build action plan from Reg 44 / Statement of Purpose'
  },
  {
    id: 'starter_recent_changes',
    label: 'Summarise recent changes',
    description: 'Orientation on what changed in policy or practice',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatPrompt: 'Summarise recent changes',
    documentLens: 'summary'
  },
  {
    id: 'starter_easy_read_briefing',
    label: 'Turn policy into easy-read briefing',
    description: 'Plain-English briefing from policy text',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatPrompt: 'Turn policy into easy-read briefing',
    documentLens: 'explain'
  },
  {
    id: 'starter_compare_documents',
    label: 'Compare documents',
    description: 'Compare two policy or report versions',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'compareOrbStandaloneDocuments',
    outputTarget: 'document_analysis',
    requiresHumanReview: true,
    chatPrompt: 'Compare documents'
  },
  {
    id: 'starter_create_staff_briefing',
    label: 'Create staff briefing',
    description: 'Staff briefing from document or comparison',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'standalone-client:sendMessage',
    outputTarget: 'chat',
    requiresHumanReview: true,
    chatPrompt: 'Create staff briefing',
    documentLens: 'staff_briefing'
  },
  {
    id: 'starter_create_action_plan_comparison',
    label: 'Create action plan from comparison',
    description: 'Action plan from document changes',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'compareOrbStandaloneDocuments',
    outputTarget: 'document_analysis',
    requiresHumanReview: true,
    chatPrompt: 'Create action plan from comparison'
  },
  {
    id: 'starter_review_sop',
    label: 'Review against Statement of Purpose',
    description: 'Statement of Purpose alignment check',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'runOrbDocumentIntelligence',
    outputTarget: 'document_analysis',
    requiresHumanReview: true,
    chatPrompt: 'Review against Statement of Purpose',
    documentLens: 'summary'
  },
  {
    id: 'starter_review_quality_standards',
    label: 'Review against Quality Standards',
    description: 'Residential quality standards thinking',
    category: 'chat_starter',
    surfaces: ['chat', 'documents'],
    route: 'runOrbDocumentIntelligence',
    outputTarget: 'document_analysis',
    requiresHumanReview: true,
    chatPrompt: 'Review against Quality Standards',
    documentLens: 'ofsted'
  }
]

/** Document comparison — converged metadata (UI routes to compareOrbStandaloneDocuments). */
export const ORB_CONVERGED_COMPARISON_ACTIONS: OrbConvergedAction[] = [
  {
    id: 'compare_documents',
    label: 'Compare documents',
    description: 'Compare two documents with ORB',
    category: 'document_lens',
    surfaces: ['documents', 'saved_outputs', 'chat'],
    route: 'compareOrbStandaloneDocuments',
    outputTarget: 'document_analysis',
    requiresHumanReview: true
  },
  {
    id: 'summarise_recent_changes',
    label: 'Summarise recent changes',
    description: 'Orientation on what changed between versions',
    category: 'document_lens',
    surfaces: ['documents', 'saved_outputs'],
    route: 'compareOrbStandaloneDocuments:recent_changes',
    outputTarget: 'document_analysis',
    requiresHumanReview: true
  },
  {
    id: 'create_easy_read_briefing',
    label: 'Create easy-read briefing',
    description: 'Plain-English briefing from comparison',
    category: 'document_lens',
    surfaces: ['documents', 'saved_outputs'],
    route: 'compareOrbStandaloneDocuments:easy_read_briefing',
    outputTarget: 'write',
    requiresHumanReview: true
  },
  {
    id: 'create_staff_briefing',
    label: 'Create staff briefing',
    description: 'Shift-ready staff briefing from documents',
    category: 'document_lens',
    surfaces: ['documents', 'saved_outputs', 'templates'],
    route: 'runOrbDocumentIntelligence:staff_briefing',
    outputTarget: 'write',
    requiresHumanReview: true,
    documentLens: 'staff_briefing'
  },
  {
    id: 'create_action_plan_from_comparison',
    label: 'Create action plan from comparison',
    description: 'Manager action plan from document diff',
    category: 'document_lens',
    surfaces: ['documents', 'saved_outputs'],
    route: 'compareOrbStandaloneDocuments:action_plan',
    outputTarget: 'write',
    requiresHumanReview: true,
    editMode: 'action_plan',
    instruction: 'Create a practical action plan with owners and follow-up from this comparison'
  }
]

/** Primary Dictate hero output types — aligned with recording framework. */
export const ORB_CONVERGED_DICTATE_OUTPUTS: OrbConvergedAction[] = [
  {
    id: 'daily_record',
    label: 'Daily Record',
    description: 'Shift events and presentation',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates'],
    route: 'generateOrbDictateNote:daily_record',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'daily_record'
  },
  {
    id: 'incident_record',
    label: 'Incident Report',
    description: 'Behaviour, injury or serious events',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates'],
    route: 'generateOrbDictateNote:incident_record',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'incident_record'
  },
  {
    id: 'missing_episode',
    label: 'Missing From Home',
    description: 'Missing and return conversation',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates'],
    route: 'generateOrbDictateNote:missing_episode_note',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'missing_episode_note'
  },
  {
    id: 'safeguarding_concern',
    label: 'Safeguarding Concern',
    description: 'Concern with escalation',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates'],
    route: 'generateOrbDictateNote:safeguarding_concern_record',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'safeguarding_concern_record',
    highRiskCaution: 'Adult reviews safeguarding records before sharing.'
  },
  {
    id: 'chronology_entry',
    label: 'Chronology Entry',
    description: 'Safeguarding file chronology',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates', 'orb_write'],
    route: 'generateOrbDictateNote:chronology_entry',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'chronology_entry'
  },
  {
    id: 'handover_note',
    label: 'Handover',
    description: 'Safe shift handover',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates', 'orb_write'],
    route: 'generateOrbDictateNote:handover_note',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'handover_note'
  },
  {
    id: 'manager_summary',
    label: 'Manager Summary',
    description: 'Manager review and actions',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates', 'orb_write'],
    route: 'generateOrbDictateNote:manager_oversight_note',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'manager_oversight_note'
  },
  {
    id: 'action_plan_output',
    label: 'Action Plan',
    description: 'Follow-up actions and owners',
    category: 'dictate_output',
    surfaces: ['dictate', 'templates', 'orb_write'],
    route: 'generateOrbDictateNote:action_plan',
    outputTarget: 'dictate',
    requiresHumanReview: true,
    dictateNoteType: 'action_plan'
  }
]

/** Document lenses — mirrors `RESIDENTIAL_FIRST_CLASS_LENSES` with converged metadata. */
export const ORB_CONVERGED_DOCUMENT_LENSES: OrbConvergedAction[] = RESIDENTIAL_FIRST_CLASS_LENSES.map(
  (entry, index) => ({
    id: `doc_lens_${entry.lens}_${index}`,
    label: entry.label,
    description: entry.description || entry.label,
    category: 'document_lens' as const,
    surfaces: ['documents', 'saved_outputs'] as OrbConvergedSurface[],
    route: 'runOrbDocumentIntelligence',
    outputTarget: 'document_analysis' as const,
    requiresHumanReview: true,
    documentLens: entry.lens,
    hero: entry.hero
  })
)

export const ORB_CONVERGED_DOCUMENT_CROSS_ACTIONS = RESIDENTIAL_DOCUMENT_CROSS_ACTIONS

export const ORB_CONVERGED_WRITE_PANEL_GROUPS: Array<{
  key: string
  title: string
  actionIds: string[]
}> = [
  {
    key: 'core',
    title: 'Core actions',
    actionIds: ['missing', 'review_record', 'professional', 'remove_blame', 'child_centred', 'grammar', 'record_properly']
  },
  {
    key: 'spelling',
    title: 'Spelling & grammar',
    actionIds: ['check_spelling_grammar', 'grammar', 'check_names_dates_times']
  },
  {
    key: 'style',
    title: 'Writing style',
    actionIds: [
      'apply_therapeutic_style',
      'apply_child_centred_style',
      'apply_concise_professional_style',
      'apply_inspection_ready_style'
    ]
  },
  {
    key: 'safety',
    title: 'Safety & quality',
    actionIds: [
      'safeguarding_gaps',
      'ofsted_ready',
      'recording_quality',
      'child_voice_check',
      'manager_oversight',
      'guidance_check',
      'safeguarding_lens',
      'ofsted_lens'
    ]
  },
  {
    key: 'create_related',
    title: 'Create related',
    actionIds: ['chronology', 'manager_summary', 'handover', 'action_plan', 'social_worker_update']
  },
  {
    key: 'export',
    title: 'Export & final',
    actionIds: ['prepare_pdf']
  }
]

export function convergedActionsForSurface(surface: OrbConvergedSurface): OrbConvergedAction[] {
  return [
    ...ORB_CONVERGED_WRITE_ACTIONS,
    ...ORB_CONVERGED_CHAT_STARTER_ACTIONS,
    ...ORB_CONVERGED_DICTATE_OUTPUTS,
    ...ORB_CONVERGED_DOCUMENT_LENSES,
    ...ORB_CONVERGED_COMPARISON_ACTIONS
  ].filter((action) => action.surfaces.includes(surface))
}

export function convergedWriteActionById(id: string): OrbConvergedAction | undefined {
  return ORB_CONVERGED_WRITE_ACTIONS.find((action) => action.id === id)
}

export function convergedWriteActionsForPanel(): OrbConvergedAction[] {
  const ids = new Set(
    ORB_CONVERGED_WRITE_PANEL_GROUPS.flatMap((group) => group.actionIds)
  )
  return ORB_CONVERGED_WRITE_ACTIONS.filter(
    (action) => ids.has(action.id) && action.editMode && action.instruction
  )
}

export function convergedChatStarters(): Array<{ text: string; mode?: StandaloneOrbMode }> {
  return ORB_CONVERGED_CHAT_STARTER_ACTIONS.map((starter) => ({
    text: starter.chatPrompt || starter.label,
    mode: starter.chatMode
  }))
}

export function convergedDictateHeroNoteTypes(): readonly OrbDictateNoteType[] {
  return ORB_CONVERGED_DICTATE_OUTPUTS.map((output) => output.dictateNoteType!).filter(Boolean)
}

export function convergedDocumentLenses(heroOnly = false): OrbConvergedAction[] {
  return ORB_CONVERGED_DOCUMENT_LENSES.filter((lens) => !heroOnly || lens.hero)
}
