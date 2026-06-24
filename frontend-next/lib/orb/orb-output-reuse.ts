export type OrbOutputReuseAction =
  | 'improve_wording'
  | 'more_concise'
  | 'more_detailed'
  | 'recording_wording'
  | 'child_voice'
  | 'manager_oversight'
  | 'chronology'
  | 'shift_builder'
  | 'checklist'
  | 'what_missing'
  | 'ofsted_lens'
  | 'safeguarding_lens'
  | 'nvq_evidence_map'
  | 'reflective_learning'
  | 'pd_prompts'
  | 'evidence_gaps'
  | 'learner_action_plan'
  | 'supervision_reflect'
  | 'incident_reflective'
  | 'explain_criteria'
  | 'assessor_feedback'
  | 'use_template_in_write'
  | 'turn_into_record'
  | 'save_to_records'

export type OrbSuggestedReplyItem = {
  action: OrbOutputReuseAction
  label: string
  prefill?: string
  template_id?: string
}

/** Contextual reuse chips for document intelligence and action-engine results. */
export function contextualSuggestedRepliesForOutput(options: {
  outputKind?: string
  content?: string
}): OrbSuggestedReplyItem[] {
  const kind = (options.outputKind || '').toLowerCase()
  const content = (options.content || '').toLowerCase()

  if (kind === 'policy_card' || /\bpolicy card\b/.test(content)) {
    return [
      { action: 'more_detailed', label: 'Policy card' },
      {
        action: 'shift_builder',
        label: 'Action plan',
        prefill: 'Create an action plan from this policy card.'
      },
      {
        action: 'more_detailed',
        label: 'Staff summary',
        prefill: 'Turn this policy card into a concise staff summary for the team.'
      }
    ]
  }

  if (kind === 'reg44' || kind === 'reg45' || /\breg\s*44\b/.test(content)) {
    return [
      { action: 'ofsted_lens', label: 'Add Ofsted lens' },
      {
        action: 'what_missing',
        label: 'What would Reg 44 look for?',
        prefill: 'What would Reg 44 look for in this situation?'
      },
      {
        action: 'shift_builder',
        label: 'Create action plan',
        prefill: 'Create an action plan from this Reg 44 review.'
      }
    ]
  }

  if (kind === 'actions' || kind === 'action_plan' || /\baction plan\b/.test(content)) {
    return [
      { action: 'manager_oversight', label: 'Manager oversight note' },
      { action: 'checklist', label: 'Checklist' },
      { action: 'what_missing', label: 'What is missing?' }
    ]
  }

  if (kind === 'recording_quality' || /\brecording quality\b/.test(content)) {
    return [
      { action: 'recording_wording', label: 'Convert to recording wording' },
      { action: 'what_missing', label: 'What am I missing?' },
      { action: 'safeguarding_lens', label: 'Add safeguarding lens' },
      { action: 'manager_oversight', label: 'Create manager oversight note' }
    ]
  }

  if (kind === 'safeguarding' || /\bsafeguarding lens\b/.test(content)) {
    return [
      { action: 'safeguarding_lens', label: 'What needs immediate action?' },
      { action: 'manager_oversight', label: 'Manager oversight note' },
      { action: 'recording_wording', label: 'What should I record?' },
      { action: 'what_missing', label: 'What is missing?' }
    ]
  }

  if (kind === 'staff_briefing') {
    return [
      { action: 'checklist', label: 'Audit checklist' },
      { action: 'what_missing', label: 'What is missing?' }
    ]
  }

  if (
    kind === 'nvq_evidence_map' ||
    kind === 'reflective_account_plan' ||
    kind === 'assessor_feedback' ||
    /\b(nvq|diploma|reflective account|criteria|academy)\b/i.test(content)
  ) {
    return [
      { action: 'nvq_evidence_map', label: 'Map to evidence' },
      { action: 'reflective_learning', label: 'Reflective account plan' },
      { action: 'pd_prompts', label: 'Assessor questions' }
    ]
  }

  if (kind === 'supervision' || /\bsupervision\b/i.test(content)) {
    return [
      { action: 'supervision_reflect', label: 'Supervision to evidence' },
      { action: 'reflective_learning', label: 'Reflective account plan' },
      { action: 'what_missing', label: 'What is missing?' }
    ]
  }

  return []
}
