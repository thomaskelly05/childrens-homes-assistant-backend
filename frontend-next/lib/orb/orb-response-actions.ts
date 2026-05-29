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
  shift_builder: 'build_shift_plan'
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
  'shift_builder'
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
