import type { OrbResponseFollowUpAction } from '@/components/orb-standalone/orb-assistant-message'

/** Maps UI follow-up action ids to backend ORB action engine ids. */
export const FRONTEND_TO_BACKEND_ORB_ACTION: Partial<Record<OrbResponseFollowUpAction, string>> = {
  what_missing: 'what_am_i_missing',
  recording_wording: 'convert_to_recording_wording',
  manager_oversight: 'create_manager_oversight_note',
  chronology: 'create_chronology_suggestion',
  ofsted_lens: 'add_ofsted_lens',
  safeguarding_lens: 'add_safeguarding_lens',
  checklist: 'create_checklist',
  improve_wording: 'convert_to_recording_wording',
  more_concise: 'make_more_concise',
  more_detailed: 'make_more_detailed',
  child_voice: 'add_child_voice_prompt',
  shift_builder: 'build_shift_plan',
  nvq_evidence_map: 'map_to_nvq_evidence',
  reflective_learning: 'create_reflective_account_plan',
  pd_prompts: 'create_professional_discussion_prompts',
  evidence_gaps: 'identify_learning_evidence_gaps',
  learner_action_plan: 'create_learner_action_plan',
  supervision_reflect: 'supervision_to_learning_evidence',
  incident_reflective: 'incident_to_reflective_learning',
  explain_criteria: 'explain_nvq_criteria',
  assessor_feedback: 'assessor_feedback_draft'
}

export const BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS = new Set<OrbResponseFollowUpAction>([
  'what_missing',
  'recording_wording',
  'manager_oversight',
  'chronology',
  'ofsted_lens',
  'safeguarding_lens',
  'checklist',
  'improve_wording',
  'more_concise',
  'more_detailed',
  'child_voice',
  'shift_builder',
  'nvq_evidence_map',
  'reflective_learning',
  'pd_prompts',
  'evidence_gaps',
  'learner_action_plan',
  'supervision_reflect',
  'incident_reflective',
  'explain_criteria',
  'assessor_feedback'
])

/** Backend action ids for toolbar shortcuts not exposed as follow-up chips. */
export const BACKEND_ORB_STANDALONE_ACTION_IDS = {
  supervision_prompt: 'supervision_prompt',
  therapeutic_reframe: 'therapeutic_reframe',
  shift_handover_summary: 'shift_handover_summary'
} as const

export function isBackendSupportedOrbResponseAction(
  action: OrbResponseFollowUpAction
): boolean {
  return BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS.has(action)
}

export function backendOrbActionIdForFollowUp(action: OrbResponseFollowUpAction): string | null {
  return FRONTEND_TO_BACKEND_ORB_ACTION[action] ?? null
}
