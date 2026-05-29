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

export type OrbSuggestedReplyItem = {
  action: OrbOutputReuseAction
  label: string
  prefill?: string
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
      {
        action: 'more_detailed',
        label: 'Staff briefing',
        prefill: 'Turn this policy card into a concise staff briefing for the team.'
      },
      {
        action: 'manager_oversight',
        label: 'Supervision questions',
        prefill: 'Create supervision questions from this policy card.'
      },
      { action: 'checklist', label: 'Audit checklist' },
      { action: 'what_missing', label: 'What is missing?' }
    ]
  }

  if (kind === 'reg44' || kind === 'reg45' || /\breg\s*44\b/.test(content)) {
    return [
      {
        action: 'shift_builder',
        label: 'Create action plan',
        prefill: 'Create an action plan from this Reg 44 review.'
      },
      { action: 'manager_oversight', label: 'Manager oversight note' },
      {
        action: 'ofsted_lens',
        label: 'RI governance lens',
        prefill: 'Add a responsible individual governance lens to this Reg 44 review.'
      },
      { action: 'what_missing', label: 'What is missing?' }
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
      { action: 'child_voice', label: 'Add child voice prompt' },
      { action: 'manager_oversight', label: 'Manager oversight note' },
      { action: 'what_missing', label: 'What is missing?' }
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

  return []
}
