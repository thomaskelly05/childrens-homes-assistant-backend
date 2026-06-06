/** Dictate studio quick-edit modes. Cross-surface practice actions: `lib/orb/orb-converged-actions.ts`. */
export type OrbDictateEditMode =
  | 'spelling_grammar'
  | 'therapeutic_rewrite'
  | 'ofsted_ready'
  | 'factual_tone'
  | 'professional_language'
  | 'child_voice'
  | 'safeguarding_lens'
  | 'manager_oversight'
  | 'chronology_conversion'
  | 'handover_conversion'
  | 'concise_summary'
  | 'action_plan'
  | 'ri_summary'
  | 'missing_information'
  | 'recording_quality_review'
  | 'less_judgemental'
  | 'parent_friendly'
  | 'sccif_lens'
  | 'professional_curiosity'
  | 'evidence_of_impact'
  | 'manager_note'
  | 'safeguarding_concern'
  | 'supervision_reflection'

export type OrbDictateQuickAction = {
  id: string
  label: string
  mode: OrbDictateEditMode
  instruction: string
  group: 'wording' | 'practice' | 'inspection' | 'convert'
}

export const ORB_DICTATE_QUICK_ACTIONS: OrbDictateQuickAction[] = [
  { id: 'spell', label: 'Spelling & grammar', mode: 'spelling_grammar', instruction: 'Check spelling and grammar', group: 'wording' },
  { id: 'professional', label: 'More professional', mode: 'professional_language', instruction: 'Make this more professional', group: 'wording' },
  { id: 'therapeutic', label: 'More therapeutic', mode: 'therapeutic_rewrite', instruction: 'Make this more therapeutic', group: 'wording' },
  { id: 'less_judge', label: 'Less judgemental', mode: 'less_judgemental', instruction: 'Remove judgemental language', group: 'wording' },
  { id: 'concise', label: 'More concise', mode: 'concise_summary', instruction: 'Make it shorter', group: 'wording' },
  { id: 'child_voice', label: 'Add child voice', mode: 'child_voice', instruction: 'Add child voice', group: 'practice' },
  { id: 'safeguarding', label: 'Add safeguarding', mode: 'safeguarding_lens', instruction: 'Add safeguarding considerations', group: 'practice' },
  { id: 'manager', label: 'Add manager oversight', mode: 'manager_oversight', instruction: 'Add manager oversight', group: 'practice' },
  { id: 'curiosity', label: 'Add professional curiosity', mode: 'professional_curiosity', instruction: 'Add professional curiosity', group: 'practice' },
  { id: 'impact', label: 'Add evidence of impact', mode: 'evidence_of_impact', instruction: 'Add evidence of impact', group: 'practice' },
  { id: 'ofsted', label: 'Make Ofsted-ready', mode: 'ofsted_ready', instruction: 'Make this more Ofsted-ready', group: 'inspection' },
  { id: 'sccif', label: 'Add SCCIF lens', mode: 'sccif_lens', instruction: 'Add SCCIF lens', group: 'inspection' },
  { id: 'ri', label: 'Create RI summary', mode: 'ri_summary', instruction: 'Create summary for RI', group: 'inspection' },
  { id: 'action_plan', label: 'Create action plan', mode: 'action_plan', instruction: 'Create action plan from this', group: 'inspection' },
  { id: 'missing', label: 'What is missing?', mode: 'missing_information', instruction: 'What is missing?', group: 'inspection' },
  { id: 'chronology', label: 'Chronology entry', mode: 'chronology_conversion', instruction: 'Turn this into a chronology entry', group: 'convert' },
  { id: 'handover', label: 'Handover', mode: 'handover_conversion', instruction: 'Turn this into handover', group: 'convert' },
  { id: 'manager_note', label: 'Manager note', mode: 'manager_note', instruction: 'Make suitable for Registered Manager', group: 'convert' },
  { id: 'safeguarding_concern', label: 'Safeguarding concern', mode: 'safeguarding_concern', instruction: 'Safeguarding concern record', group: 'convert' },
  { id: 'supervision', label: 'Supervision reflection', mode: 'supervision_reflection', instruction: 'Supervision reflection', group: 'convert' }
]

export const QUICK_ACTION_GROUPS: Array<{ id: OrbDictateQuickAction['group']; title: string }> = [
  { id: 'wording', title: 'Improve wording' },
  { id: 'practice', title: 'Residential practice' },
  { id: 'inspection', title: 'Inspection / leadership' },
  { id: 'convert', title: 'Convert' }
]
