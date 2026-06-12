import { addApprovalItem } from '@/lib/founder/approvals/approval-store'
import type { ApprovalType } from '@/lib/founder/approvals/approval-types'
import { getLatestLiveQualityRun } from '@/lib/founder/quality-lab/quality-run-store'
import { getEvaluationRuns } from '@/lib/orb/evaluation/orb-evaluation-store'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'
import { analyzeOrbEvaluationRun, findLatestFailedRun } from '@/lib/orb/quality-agent/orb-quality-agent-service'

import { recordAgentAuditEntry } from './founder-agent-audit'
import { buildFounderCoverageMap, generateRecommendedScenariosForArea } from './founder-agent-coverage-map'
import { actionRequiresApproval, permissionAllowsAction } from './founder-agent-permissions'
import { getFounderAgentDefinition } from './founder-agent-registry'
import { agentRefusesAutoMerge, agentRefusesThresholdWeakening, validateAgentOutputSafety } from './founder-agent-safety'
import type {
  FounderAgentActionResult,
  FounderAgentActionType,
  FounderAgentApprovalItem,
  FounderAgentContext,
  FounderAgentId,
  FounderCoverageAreaId
} from './founder-agent-types'

let approvalCounter = 0
let approvalQueue: FounderAgentApprovalItem[] = []

function nextApprovalId(): string {
  approvalCounter += 1
  return `agent-approval-${Date.now()}-${approvalCounter}`
}

export function getAgentApprovalQueue(): FounderAgentApprovalItem[] {
  return [...approvalQueue]
}

export function getPendingAgentApprovals(): FounderAgentApprovalItem[] {
  return approvalQueue.filter((a) => a.status === 'pending' || a.status === 'changes_requested')
}

function mapActionToApprovalType(actionType: FounderAgentActionType): ApprovalType {
  const map: Partial<Record<FounderAgentActionType, ApprovalType>> = {
    draft_linkedin_post: 'linkedin-post',
    draft_provider_email: 'provider-message',
    draft_partner_follow_up: 'relationship-message',
    create_draft_pr_summary: 'technical-build-brief',
    generate_build_brief: 'technical-build-brief',
    create_product_build_brief: 'product-action',
    create_technical_fix_brief: 'technical-build-brief',
    draft_founder_update: 'founder-briefing',
    prepare_launch_gate_evidence: 'evidence-pack'
  }
  return map[actionType] ?? 'product-action'
}

function queueApprovalIfNeeded(
  agentId: FounderAgentId,
  actionType: FounderAgentActionType,
  result: Omit<FounderAgentActionResult, 'auditRecord'>
): FounderAgentApprovalItem | undefined {
  if (!result.approvalRequired) return undefined

  const agent = getFounderAgentDefinition(agentId)
  const item: FounderAgentApprovalItem = {
    id: nextApprovalId(),
    agentId,
    actionType,
    title: `${agent.name}: ${actionType.replace(/_/g, ' ')}`,
    summary: result.summary,
    riskLevel: result.riskLevel,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  approvalQueue = [item, ...approvalQueue]

  addApprovalItem({
    type: mapActionToApprovalType(actionType),
    title: item.title,
    content: `${result.summary}\n\nRationale: ${result.rationale}\n\nNext step: ${result.suggestedNextStep}`,
    requestedByAgent: agentId,
    riskLevel: result.riskLevel === 'critical' ? 'high' : result.riskLevel,
    safetyCheck: 'Autonomous agent prepared — founder approval required before execution.'
  })

  return item
}

export function executeFounderAgentAction(input: {
  agentId: FounderAgentId
  actionType: FounderAgentActionType
  context?: FounderAgentContext
  actor?: string
  areaId?: FounderCoverageAreaId
}): FounderAgentActionResult {
  const { agentId, actionType, context = {}, actor } = input
  const agent = getFounderAgentDefinition(agentId)

  if (!permissionAllowsAction(agent.permissions, actionType)) {
    throw new Error(`${agent.name} permission level ${agent.permissions} does not allow ${actionType}`)
  }

  if (!agent.availablePreparedActions.includes(actionType) && actionType !== 'create_audit_note') {
    throw new Error(`${agent.name} cannot perform ${actionType}`)
  }

  if (!agentRefusesAutoMerge()) {
    throw new Error('Safety violation: auto-merge must always be refused')
  }

  const safetyText = `${actionType} ${agent.purpose}`
  if (agentRefusesThresholdWeakening(safetyText)) {
    throw new Error('Agent refuses threshold weakening suggestions')
  }

  const safetyCheck = validateAgentOutputSafety(safetyText)
  if (!safetyCheck.ok) {
    throw new Error(safetyCheck.violations.join('; '))
  }

  const qualityRuns = context.qualityRuns ?? []
  const evaluationRuns = context.evaluationRuns ?? getEvaluationRuns()
  const latestQualityRun = qualityRuns[0] ?? getLatestLiveQualityRun()
  const latestFailedEval = findLatestFailedRun(evaluationRuns)
  const launchGate = computeOrbLaunchQualityGate({
    runs: qualityRuns,
    evaluationRuns,
    whistleblowingCovered: context.whistleblowingCovered ?? true,
    privacyRetentionReviewed: context.privacyRetentionReviewed ?? false
  })

  let summary = ''
  let rationale = ''
  let riskLevel: FounderAgentActionResult['riskLevel'] = 'low'
  let affectedArea = agent.scope[0] ?? 'founder operations'
  let suggestedNextStep = 'Review agent output in Founder Team.'
  let relatedRunId: string | undefined

  switch (actionType) {
    case 'analyse_latest_run': {
      const targetRun = latestFailedEval ?? evaluationRuns[0]
      if (!targetRun) {
        summary = 'No evaluation runs available for analysis.'
        rationale = 'Run ORB Evaluation or Quality Lab first.'
        suggestedNextStep = 'Execute a synthetic evaluation pack.'
      } else {
        const analysis = analyzeOrbEvaluationRun(targetRun, { launchGateBlockers: launchGate.blockers })
        const criticalCount = targetRun.criticalFailures ?? analysis.failedResults.filter((r) => r.criticalFailure).length
        summary = `Analysed run ${targetRun.id}: ${analysis.failureGroups.length} failure group(s), ${criticalCount} critical.`
        rationale = analysis.suggestedNextAction
        riskLevel = criticalCount > 0 ? 'high' : 'medium'
        affectedArea = 'ORB Evaluation'
        suggestedNextStep = 'Review failure classification and approve build brief if appropriate.'
        relatedRunId = targetRun.id
      }
      break
    }
    case 'generate_build_brief':
    case 'create_product_build_brief':
    case 'create_technical_fix_brief': {
      summary = `${agent.name} prepared a build brief from latest quality signals.`
      rationale = latestFailedEval
        ? `Based on failed run ${latestFailedEval.id} with ${latestFailedEval.criticalFailures ?? 0} critical failure(s).`
        : 'Based on quality lab and telemetry observations.'
      riskLevel = latestFailedEval?.criticalFailures ? 'high' : 'medium'
      affectedArea = actionType === 'create_technical_fix_brief' ? 'technical reliability' : 'product strategy'
      suggestedNextStep = 'Approve build brief before sending to development.'
      break
    }
    case 'create_draft_pr_summary': {
      summary = 'Draft PR summary prepared. Auto-merge blocked — Tom must approve.'
      rationale = latestFailedEval
        ? `Remediation for run ${latestFailedEval.id}. No safety thresholds weakened.`
        : 'Prepared from quality observations.'
      riskLevel = 'high'
      affectedArea = 'PR workflow'
      suggestedNextStep = 'Review draft PR summary and approve creation.'
      break
    }
    case 'run_synthetic_evaluation': {
      summary = 'Synthetic evaluation recommended — safe pack only unless Tom approves large runs.'
      rationale = 'Autonomous loop may recommend but not execute expensive 1,000-scenario packs.'
      riskLevel = 'medium'
      affectedArea = 'Quality Lab'
      suggestedNextStep = 'Approve synthetic run with chosen pack size.'
      break
    }
    case 'generate_synthetic_scenarios': {
      const areaId = input.areaId ?? 'whistleblowing'
      const scenarios = generateRecommendedScenariosForArea(areaId)
      summary = `Generated ${scenarios.length} recommended scenario(s) for ${areaId.replace(/_/g, ' ')}.`
      rationale = scenarios.join('; ')
      riskLevel = 'low'
      affectedArea = 'coverage map'
      suggestedNextStep = 'Review and add scenarios to benchmark pack.'
      break
    }
    case 'update_coverage_map': {
      const map = buildFounderCoverageMap({ qualityRuns, evaluationRuns })
      summary = `Coverage map updated: ${map.weakAreas.length} weak, ${map.untestedAreas.length} untested areas.`
      rationale = `Overall strength: ${map.overallStrength}.`
      riskLevel = map.weakAreas.length > 3 ? 'high' : 'medium'
      affectedArea = 'coverage map'
      suggestedNextStep = 'Address weak and untested coverage areas.'
      break
    }
    case 'draft_linkedin_post':
    case 'draft_founder_update': {
      summary = `Draft ${actionType === 'draft_linkedin_post' ? 'LinkedIn post' : 'founder update'} prepared for review.`
      rationale = 'No exaggeration of traction. British English. Child-centred framing.'
      riskLevel = 'medium'
      affectedArea = 'public content'
      suggestedNextStep = 'Approve before publishing.'
      break
    }
    case 'draft_provider_email':
    case 'draft_partner_follow_up': {
      summary = 'External message draft prepared. Cannot be sent without approval.'
      rationale = 'Professional, non-identifiable, no real child data referenced.'
      riskLevel = 'high'
      affectedArea = 'external communications'
      suggestedNextStep = 'Review and approve before sending.'
      break
    }
    case 'prepare_launch_gate_evidence': {
      summary = `Launch gate evidence prepared. ${launchGate.blockers.length} blocker(s) remain.`
      rationale = launchGate.blockers.join('; ') || 'No blockers recorded.'
      riskLevel = launchGate.blockers.length > 0 ? 'high' : 'medium'
      affectedArea = 'launch readiness'
      suggestedNextStep = 'Review evidence pack before launch gate sign-off.'
      break
    }
    case 'prepare_privacy_review_prompt': {
      const missing = !context.privacyRetentionReviewed
      summary = missing
        ? 'Privacy review not recorded. Governance Agent recommends completion.'
        : 'Privacy review prompt prepared for confirmation.'
      rationale = 'Launch gate requires privacy review before public launch.'
      riskLevel = missing ? 'high' : 'medium'
      affectedArea = 'privacy governance'
      suggestedNextStep = 'Complete privacy review and record outcome.'
      break
    }
    case 'prepare_retention_review_prompt': {
      const missing = !context.privacyRetentionReviewed
      summary = missing
        ? 'Retention review not recorded. Governance Agent recommends completion.'
        : 'Retention review prompt prepared for confirmation.'
      rationale = 'Data retention must be reviewed before launch.'
      riskLevel = missing ? 'high' : 'medium'
      affectedArea = 'retention governance'
      suggestedNextStep = 'Complete retention review and record outcome.'
      break
    }
    case 'create_risk_register_entry': {
      summary = 'Risk register entry drafted for founder review.'
      rationale = launchGate.blockers.length
        ? `Linked to launch blockers: ${launchGate.blockers.slice(0, 2).join('; ')}`
        : 'Routine governance monitoring.'
      riskLevel = 'medium'
      affectedArea = 'risk register'
      suggestedNextStep = 'Approve risk register entry.'
      break
    }
    case 'create_pilot_summary': {
      summary = 'Pilot readiness summary prepared from available signals.'
      rationale = `Quality runs: ${qualityRuns.length}. Evaluation runs: ${evaluationRuns.length}.`
      riskLevel = 'medium'
      affectedArea = 'pilot readiness'
      suggestedNextStep = 'Review pilot evidence before provider expansion.'
      break
    }
    case 'create_audit_note': {
      summary = `${agent.name} recorded an audit note.`
      rationale = 'Routine audit trail entry.'
      riskLevel = 'low'
      affectedArea = 'audit trail'
      suggestedNextStep = 'No action required.'
      break
    }
    default:
      summary = `${agent.name} completed ${actionType}.`
      rationale = 'Standard agent action.'
  }

  const approvalRequired =
    agent.requiresFounderApproval ||
    actionRequiresApproval(actionType, {
      isExternal: ['draft_linkedin_post', 'draft_provider_email', 'draft_partner_follow_up'].includes(actionType),
      isSafeguarding: agentId === 'safeguarding-agent',
      isLaunchGate: actionType === 'prepare_launch_gate_evidence',
      isRevenueClaim: agentId === 'revenue-agent'
    })

  const auditRecord = recordAgentAuditEntry({
    agentId,
    actionType,
    summary,
    approvalStatus: approvalRequired ? 'pending' : 'not_required',
    relatedRunId,
    actor
  })

  const result: FounderAgentActionResult = {
    summary,
    rationale,
    riskLevel,
    affectedArea,
    approvalRequired,
    suggestedNextStep,
    auditRecord
  }

  queueApprovalIfNeeded(agentId, actionType, result)

  return result
}

export function approveAgentAction(approvalId: string, actor: string): FounderAgentApprovalItem | undefined {
  const index = approvalQueue.findIndex((a) => a.id === approvalId)
  if (index === -1) return undefined
  const updated: FounderAgentApprovalItem = {
    ...approvalQueue[index],
    status: 'approved',
    decidedAt: new Date().toISOString(),
    decidedBy: actor
  }
  approvalQueue = [...approvalQueue.slice(0, index), updated, ...approvalQueue.slice(index + 1)]
  recordAgentAuditEntry({
    agentId: updated.agentId,
    actionType: updated.actionType,
    summary: `Approved: ${updated.title}`,
    decision: 'approved',
    approvalStatus: 'approved',
    actor
  })
  return updated
}

export function rejectAgentAction(approvalId: string, actor: string): FounderAgentApprovalItem | undefined {
  const index = approvalQueue.findIndex((a) => a.id === approvalId)
  if (index === -1) return undefined
  const updated: FounderAgentApprovalItem = {
    ...approvalQueue[index],
    status: 'rejected',
    decidedAt: new Date().toISOString(),
    decidedBy: actor
  }
  approvalQueue = [...approvalQueue.slice(0, index), updated, ...approvalQueue.slice(index + 1)]
  recordAgentAuditEntry({
    agentId: updated.agentId,
    actionType: updated.actionType,
    summary: `Rejected: ${updated.title}`,
    decision: 'rejected',
    approvalStatus: 'rejected',
    actor
  })
  return updated
}

export function requestChangesOnAgentAction(approvalId: string, actor: string): FounderAgentApprovalItem | undefined {
  const index = approvalQueue.findIndex((a) => a.id === approvalId)
  if (index === -1) return undefined
  const updated: FounderAgentApprovalItem = {
    ...approvalQueue[index],
    status: 'changes_requested',
    decidedAt: new Date().toISOString(),
    decidedBy: actor
  }
  approvalQueue = [...approvalQueue.slice(0, index), updated, ...approvalQueue.slice(index + 1)]
  recordAgentAuditEntry({
    agentId: updated.agentId,
    actionType: updated.actionType,
    summary: `Changes requested: ${updated.title}`,
    decision: 'changes_requested',
    approvalStatus: 'pending',
    actor
  })
  return updated
}
