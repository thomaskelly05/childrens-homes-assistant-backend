import { getQualityRuns } from '@/lib/founder/quality-lab/quality-run-store'
import { getEvaluationRuns } from '@/lib/orb/evaluation/orb-evaluation-store'
import { computeOrbLaunchQualityGate } from '@/lib/orb/quality/launch-quality-gate'
import { findLatestFailedRun } from '@/lib/orb/quality-agent/orb-quality-agent-service'

import {
  executeFounderAgentAction,
  getAgentApprovalQueue,
  getPendingAgentApprovals
} from './founder-agent-actions'
import { getAgentAuditTrail } from './founder-agent-audit'
import { buildFounderCoverageMap } from './founder-agent-coverage-map'
import { generateFounderChiefOfStaffBrief } from './founder-chief-of-staff'
import { getAllFounderAgentDefinitions, getFounderAgentDefinition } from './founder-agent-registry'
import type {
  FounderAgentActionType,
  FounderAgentContext,
  FounderAgentId,
  FounderAgentLiveState,
  FounderCoverageAreaId
} from './founder-agent-types'

function deriveAgentStatus(
  agentId: FounderAgentId,
  context: FounderAgentContext,
  pendingCount: number
): FounderAgentLiveState['status'] {
  if (pendingCount > 0 && ['content-agent', 'relationship-agent', 'orb-quality-agent'].includes(agentId)) {
    return 'awaiting-approval'
  }
  if (agentId === 'technical-agent' && context.evaluationRuns?.some((r) => r.status === 'failed')) {
    return 'monitoring'
  }
  if (['orb-quality-agent', 'safeguarding-agent', 'governance-agent'].includes(agentId)) {
    return 'active'
  }
  return 'monitoring'
}

function deriveRecommendedAction(agentId: FounderAgentId, context: FounderAgentContext): string {
  const failed = findLatestFailedRun(context.evaluationRuns ?? [])
  switch (agentId) {
    case 'founder-chief-of-staff':
      return 'Generate today\'s founder brief and prioritise approvals.'
    case 'orb-quality-agent':
      return failed
        ? `Classify failures in run ${failed.id} and prepare build brief.`
        : 'Monitor Quality Lab and Evaluation runs.'
    case 'safeguarding-agent':
      return failed?.criticalFailures
        ? 'Review safeguarding-related failures from latest run.'
        : 'Review ORB prompts for escalation and child voice.'
    case 'governance-agent':
      return context.privacyRetentionReviewed
        ? 'Monitor risk register and approval trail.'
        : 'Privacy and retention review not recorded — recommend completion.'
    case 'content-agent':
      return 'Draft launch update — requires approval before publishing.'
    case 'relationship-agent':
      return 'Draft partner follow-up — cannot send without approval.'
    case 'revenue-agent':
      return 'Track commercial readiness without exaggerating traction.'
    case 'pilot-agent':
      return 'Compile pilot evidence and training needs summary.'
    default:
      return 'Monitor connected signals and prepare recommendations.'
  }
}

export function buildAgentContext(overrides: Partial<FounderAgentContext> = {}): FounderAgentContext {
  return {
    qualityRuns: overrides.qualityRuns ?? getQualityRuns(),
    evaluationRuns: overrides.evaluationRuns ?? getEvaluationRuns(),
    whistleblowingCovered: overrides.whistleblowingCovered ?? true,
    privacyRetentionReviewed: overrides.privacyRetentionReviewed ?? false,
    pendingApprovals: overrides.pendingApprovals ?? getPendingAgentApprovals().length
  }
}

export function getFounderAgentLiveStates(context: FounderAgentContext = buildAgentContext()): FounderAgentLiveState[] {
  const pending = getPendingAgentApprovals()
  const launchGate = computeOrbLaunchQualityGate({
    runs: context.qualityRuns ?? [],
    evaluationRuns: context.evaluationRuns ?? [],
    whistleblowingCovered: context.whistleblowingCovered,
    privacyRetentionReviewed: context.privacyRetentionReviewed
  })

  return getAllFounderAgentDefinitions().map((def) => {
    const agentPending = pending.filter((p) => p.agentId === def.id).length
    const auditTrail = getAgentAuditTrail(def.id).slice(0, 5)
    const lastActivity = auditTrail[0]?.timestamp ?? null

    let riskLevel: FounderAgentLiveState['riskLevel'] = 'low'
    if (def.id === 'safeguarding-agent' && (findLatestFailedRun(context.evaluationRuns ?? [])?.criticalFailures ?? 0) > 0) {
      riskLevel = 'high'
    } else if (def.id === 'governance-agent' && !context.privacyRetentionReviewed) {
      riskLevel = 'high'
    } else if (launchGate.blockers.length > 0 && ['orb-quality-agent', 'evidence-agent', 'pilot-agent'].includes(def.id)) {
      riskLevel = 'medium'
    }

    return {
      ...def,
      status: deriveAgentStatus(def.id, context, agentPending),
      confidence: auditTrail.length > 0 ? 'high' : 'medium',
      riskLevel,
      lastActivity,
      recommendedNextAction: deriveRecommendedAction(def.id, context),
      currentFocus: deriveRecommendedAction(def.id, context),
      auditTrailEntries: auditTrail
    }
  })
}

export function getFounderAgentLiveState(
  agentId: FounderAgentId,
  context?: FounderAgentContext
): FounderAgentLiveState {
  return getFounderAgentLiveStates(context).find((a) => a.id === agentId) ?? {
    ...getFounderAgentDefinition(agentId),
    status: 'idle',
    confidence: 'low',
    riskLevel: 'low',
    lastActivity: null,
    recommendedNextAction: 'Agent state unavailable.',
    currentFocus: '—',
    auditTrailEntries: []
  }
}

export function getQualityLabAgentIntegration(context: FounderAgentContext = buildAgentContext()) {
  const coverage = buildFounderCoverageMap({
    qualityRuns: context.qualityRuns,
    evaluationRuns: context.evaluationRuns
  })
  const launchGate = computeOrbLaunchQualityGate({
    runs: context.qualityRuns ?? [],
    evaluationRuns: context.evaluationRuns ?? [],
    whistleblowingCovered: context.whistleblowingCovered,
    privacyRetentionReviewed: context.privacyRetentionReviewed
  })
  const qualityAgent = getFounderAgentLiveState('orb-quality-agent', context)
  const chiefBrief = generateFounderChiefOfStaffBrief(context)

  const recommendations: string[] = []
  const failed = findLatestFailedRun(context.evaluationRuns ?? [])
  if (failed) {
    recommendations.push(`Quality Agent: classify run ${failed.id}`)
    if ((failed.criticalFailures ?? 0) > 0) {
      recommendations.push('Safeguarding Agent: review safeguarding-related failures')
      recommendations.push('Technical Agent: check infrastructure-related failures')
      recommendations.push('Product Agent: review UX/product-related failures')
      recommendations.push('Evidence Agent: record improvement trail')
      recommendations.push('Chief of Staff: summarise approvals needed')
    }
  }

  return {
    latestEvaluationState: failed
      ? { runId: failed.id, status: failed.status, criticalFailures: failed.criticalFailures ?? 0 }
      : null,
    benchmarkPacks: ['gold-sample', 'high-risk-sample', 'adversarial-sample'],
    liveHighRiskState: launchGate.highRiskScenariosPassed ? 'complete' : 'incomplete',
    goldState: launchGate.liveRunCompleted ? 'complete' : 'incomplete',
    coverageMap: coverage,
    weakCategories: coverage.weakAreas.map((id) => id.replace(/_/g, ' ')),
    newlyGeneratedScenarios: coverage.areas
      .filter((a) => a.recommendedNewScenarios.length > 0)
      .flatMap((a) => a.recommendedNewScenarios)
      .slice(0, 5),
    prRecommendations: getPendingAgentApprovals()
      .filter((a) => a.actionType === 'create_draft_pr_summary')
      .map((a) => a.summary),
    agentRecommendations: recommendations.length > 0 ? recommendations : qualityAgent.recommendedNextAction.split('. '),
    launchGateEvidence: launchGate.blockers.length === 0 ? 'Ready for evidence compilation' : launchGate.blockers,
    chiefOfStaffPriorities: chiefBrief.topPriorities
  }
}

export function runAgentAction(input: {
  agentId: FounderAgentId
  actionType: FounderAgentActionType
  context?: FounderAgentContext
  actor?: string
  areaId?: FounderCoverageAreaId
}) {
  return executeFounderAgentAction({
    ...input,
    context: input.context ?? buildAgentContext()
  })
}

export {
  generateFounderChiefOfStaffBrief,
  buildFounderCoverageMap,
  getAgentApprovalQueue,
  getPendingAgentApprovals,
  getAgentAuditTrail
}
