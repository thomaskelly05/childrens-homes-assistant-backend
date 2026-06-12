import type {
  FounderAgentActionType,
  FounderAgentForbiddenAction,
  FounderAgentPermissionLevel
} from './founder-agent-types'

export const GLOBAL_FORBIDDEN_ACTIONS: FounderAgentForbiddenAction[] = [
  'auto_merge',
  'auto_publish',
  'auto_send_external_email',
  'auto_override_launch_gate',
  'auto_delete_failed_runs',
  'auto_weaken_safety_scoring'
]

export const EXTERNAL_ACTION_TYPES: FounderAgentActionType[] = [
  'draft_linkedin_post',
  'draft_provider_email',
  'draft_partner_follow_up',
  'draft_founder_update'
]

export const SAFEGUARDING_ACTION_TYPES: FounderAgentActionType[] = [
  'analyse_latest_run',
  'run_synthetic_evaluation',
  'generate_synthetic_scenarios'
]

export const LAUNCH_GATE_ACTION_TYPES: FounderAgentActionType[] = [
  'prepare_launch_gate_evidence',
  'create_draft_pr_summary'
]

export const REVENUE_CLAIM_ACTION_TYPES: FounderAgentActionType[] = ['draft_founder_update']

export function actionRequiresApproval(
  actionType: FounderAgentActionType,
  options?: { isExternal?: boolean; isSafeguarding?: boolean; isLaunchGate?: boolean; isRevenueClaim?: boolean }
): boolean {
  if (options?.isExternal || EXTERNAL_ACTION_TYPES.includes(actionType)) return true
  if (options?.isSafeguarding) return true
  if (options?.isLaunchGate || LAUNCH_GATE_ACTION_TYPES.includes(actionType)) return true
  if (options?.isRevenueClaim || REVENUE_CLAIM_ACTION_TYPES.includes(actionType)) return true
  if (actionType === 'create_draft_pr_summary') return true
  if (actionType === 'prepare_privacy_review_prompt' || actionType === 'prepare_retention_review_prompt') return true
  return false
}

export function permissionAllowsAction(
  level: FounderAgentPermissionLevel,
  actionType: FounderAgentActionType
): boolean {
  if (level === 'observe_only') {
    return actionType === 'update_coverage_map' || actionType === 'analyse_latest_run'
  }
  if (level === 'prepare_only') {
    return actionType !== 'run_synthetic_evaluation'
  }
  if (level === 'approval_required') {
    return true
  }
  if (level === 'system_action_allowed') {
    return true
  }
  return false
}

export function isForbiddenAction(action: FounderAgentForbiddenAction): boolean {
  return GLOBAL_FORBIDDEN_ACTIONS.includes(action)
}

export function refusesForbiddenExecution(action: FounderAgentForbiddenAction): {
  allowed: false
  reason: string
} {
  const messages: Record<FounderAgentForbiddenAction, string> = {
    auto_merge: 'Agents cannot auto-merge. Tom must approve all PR merges.',
    auto_publish: 'Agents cannot auto-publish. External content requires founder approval.',
    auto_send_external_email: 'Agents cannot auto-send external messages. Draft only.',
    auto_override_launch_gate: 'Agents cannot override launch gates.',
    auto_delete_failed_runs: 'Failed runs remain visible for audit.',
    auto_weaken_safety_scoring: 'Agents cannot weaken safety scoring or thresholds.'
  }
  return { allowed: false, reason: messages[action] }
}
