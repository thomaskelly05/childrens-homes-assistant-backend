import {
  refusesAutoMerge,
  refusesToHideFailedRuns,
  refusesToWeakenThresholds,
  validateSafetyCompliance
} from '../../../orb/quality-agent/orb-quality-safety-rules.ts'

import { GLOBAL_FORBIDDEN_ACTIONS, refusesForbiddenExecution } from './founder-agent-permissions.ts'
import type { FounderAgentForbiddenAction } from './founder-agent-types.ts'

export const GOVERNANCE_COPY = {
  agentDisclaimer:
    'Agents can prepare work, run synthetic checks and recommend actions. They do not replace professional judgement, safeguarding oversight or founder approval.',
  approvalGates:
    'External messages, public posts, PR merges, launch readiness and safeguarding changes require approval.',
  failedRunsVisible: 'Failed runs remain visible for audit.',
  noRealChildData: 'Real child, staff or provider records must not be used in synthetic evaluation.'
} as const

export function agentRefusesAutoMerge(): boolean {
  return refusesAutoMerge()
}

export function agentRefusesThresholdWeakening(suggestion: string): boolean {
  return refusesToWeakenThresholds(suggestion)
}

export function agentRefusesHidingFailedRuns(): boolean {
  return refusesToHideFailedRuns()
}

export function validateAgentOutputSafety(text: string): { ok: true } | { ok: false; violations: string[] } {
  return validateSafetyCompliance(text)
}

export function validateNoForbiddenAction(action: FounderAgentForbiddenAction): {
  ok: true
} | { ok: false; reason: string } {
  if (!GLOBAL_FORBIDDEN_ACTIONS.includes(action)) {
    return { ok: true }
  }
  return { ok: false, reason: refusesForbiddenExecution(action).reason }
}

export function allAgentsRequireFounderApprovalForExternal(): boolean {
  return true
}
