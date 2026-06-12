import type { DetectedWeakness, LearningProposal, LearningProposalChangeType } from './learning-loop-types.ts'
import {
  benchmarkAdditionRequiresFounderApproval,
  brainChangeRequiresFounderApproval,
  refusesHidingFailedRuns,
  refusesSafetyWeakening,
  validateLearningProposalSafety
} from './learning-loop-safety.ts'
import { nextProposalId } from './learning-loop-store.ts'
import { reviewLearningProposalWithAgents } from './learning-loop-agent-integration.ts'

const CHANGE_TYPE_MAP: Record<string, LearningProposalChangeType> = {
  safeguarding: 'required_safeguard_marker_update',
  scoring: 'scorer_calibration',
  coverage: 'coverage_map_update',
  fallback: 'deterministic_fallback_update',
  prompt_scaffold: 'prompt_scaffold_update',
  routing: 'internal_brain_routing_update',
  product_practice: 'prompt_scaffold_update',
  governance: 'governance_blocker_update'
}

const FILES_BY_CHANGE_TYPE: Record<LearningProposalChangeType, string[]> = {
  required_safeguard_marker_update: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-scoring-context.ts',
    'services/orb_live_guardrail_service.py'
  ],
  prompt_scaffold_update: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-safeguard-scaffold.ts',
    'assistant/knowledge/orb_quality_standards_brain.json'
  ],
  deterministic_fallback_update: [
    'services/orb_internal_brain_evaluation_service.py',
    'frontend-next/lib/orb/evaluation/orb-internal-brain-fallbacks.ts'
  ],
  scorer_calibration: [
    'frontend-next/lib/orb/evaluation/orb-evaluation-scoring-engine.ts',
    'frontend-next/lib/orb/evaluation/orb-firewall-scorer-calibration.ts'
  ],
  internal_brain_routing_update: [
    'services/orb_internal_brain_evaluation_service.py',
    'frontend-next/lib/orb/evaluation/orb-internal-brain-routing.ts'
  ],
  coverage_map_update: [
    'frontend-next/lib/founder/agents/autonomous/founder-agent-coverage-map.ts',
    'services/orb_quality_lab_scenario_coverage_service.py'
  ],
  benchmark_scenario_addition: [
    'frontend-next/lib/founder/learning-loop/learning-loop-benchmark-bank.ts',
    'services/orb_expert_scenario_bank_service.py'
  ],
  ui_audit_evidence_improvement: [
    'frontend-next/components/founder/founder-orb-evaluation-page.tsx',
    'frontend-next/lib/founder/learning-loop/learning-loop-store.ts'
  ],
  governance_blocker_update: [
    'frontend-next/lib/orb/quality/launch-quality-gate.ts',
    'frontend-next/lib/founder/agents/autonomous/founder-autonomous-loop.ts'
  ]
}

const RESIDENTIAL_WHY_IT_MATTERS: Record<string, string> = {
  safeguarding:
    'Residential staff rely on ORB for high-risk safeguarding guidance. Missing escalation or health support markers could leave a young person unsafe.',
  scoring:
    'Inaccurate scoring creates false confidence or unnecessary alarm — both undermine professional judgement in a children\'s home.',
  coverage:
    'Gaps in synthetic evaluation coverage mean weaknesses may only surface in live practice, not in controlled testing.',
  fallback:
    'Deterministic fallbacks must be safe when LLM is unavailable — residential incidents cannot wait for model recovery.',
  prompt_scaffold:
    'Weak scaffolds produce inconsistent answers even when individual responses appear safe.',
  routing:
    'Misclassified high-risk scenarios may receive daily-practice guidance instead of safeguarding escalation.',
  product_practice:
    'ORB must be practical for residential adults — safe but unhelpful answers do not support children in care.',
  governance:
    'Launch and governance blockers must remain visible until Tom approves resolution.'
}

function deriveChangeType(weakness: DetectedWeakness): LearningProposalChangeType {
  if (weakness.recommendedAction.toLowerCase().includes('benchmark')) {
    return 'benchmark_scenario_addition'
  }
  return CHANGE_TYPE_MAP[weakness.area] ?? 'prompt_scaffold_update'
}

export function createLearningProposal(input: {
  loopId: string
  weaknesses: DetectedWeakness[]
  evidenceSummary: string
}): LearningProposal | { rejected: true; reason: string } {
  const primary = input.weaknesses[0]
  if (!primary) {
    return { rejected: true, reason: 'No weaknesses provided.' }
  }

  const combinedText = [
    primary.recommendedAction,
    primary.likelyRootCause,
    ...primary.evidence
  ].join(' ')

  if (refusesSafetyWeakening(combinedText)) {
    return { rejected: true, reason: 'Proposal refused: would weaken safety scoring.' }
  }

  if (refusesHidingFailedRuns(combinedText)) {
    return { rejected: true, reason: 'Proposal refused: would hide failed runs or audit history.' }
  }

  const safetyCheck = validateLearningProposalSafety(combinedText)
  if (!safetyCheck.ok) {
    return { rejected: true, reason: safetyCheck.violations.join('; ') }
  }

  const changeType = deriveChangeType(primary)
  const safeguardingReviewRequired =
    primary.area === 'safeguarding' || primary.severity === 'critical' || primary.severity === 'high'
  const governanceReviewRequired = primary.area === 'governance' || changeType === 'governance_blocker_update'

  const proposal: LearningProposal = {
    id: nextProposalId(),
    loopId: input.loopId,
    createdAt: new Date().toISOString(),
    status: 'awaiting_approval',
    whatFailed: primary.evidence.join(' '),
    whyItMatters: RESIDENTIAL_WHY_IT_MATTERS[primary.area] ?? 'ORB must support safe residential childcare practice.',
    whatBrainShouldLearn: primary.recommendedAction,
    changeType,
    filesLikelyToChange: FILES_BY_CHANGE_TYPE[changeType],
    testsRequired: [
      'cd frontend-next && npm run test:orb-evaluation',
      'source .venv/bin/activate && python -m pytest tests/test_orb_evaluation_platform.py -q',
      'cd frontend-next && npm run typecheck'
    ],
    safetyRisk: primary.severity === 'critical' ? 'critical' : primary.severity === 'high' ? 'high' : 'medium',
    manualVerificationChecklist: [
      'Confirm old failed runs remain visible',
      'Retest affected synthetic scenarios',
      'Safeguarding markers unchanged or strengthened only',
      'Tom reviews and approves PR before merge'
    ],
    safeguardingReviewRequired,
    governanceReviewRequired,
    approvalRequired: true,
    weaknessIds: input.weaknesses.map((w) => w.id),
    evidenceSummary: input.evidenceSummary,
    agentReviews: []
  }

  proposal.agentReviews = reviewLearningProposalWithAgents(proposal)

  if (brainChangeRequiresFounderApproval() && proposal.approvalRequired !== true) {
    return { rejected: true, reason: 'Brain changes require founder approval.' }
  }

  if (changeType === 'benchmark_scenario_addition' && benchmarkAdditionRequiresFounderApproval()) {
    proposal.approvalRequired = true
  }

  return proposal
}

export function approveLearningProposal(
  proposal: LearningProposal,
  actor: string,
  notes?: string
): LearningProposal {
  return {
    ...proposal,
    status: 'approved',
    founderDecision: 'approved',
    founderDecisionAt: new Date().toISOString(),
    founderDecisionBy: actor,
    founderDecisionNotes: notes
  }
}

export function rejectLearningProposal(
  proposal: LearningProposal,
  actor: string,
  notes?: string
): LearningProposal {
  return {
    ...proposal,
    status: 'rejected',
    founderDecision: 'rejected',
    founderDecisionAt: new Date().toISOString(),
    founderDecisionBy: actor,
    founderDecisionNotes: notes
  }
}
