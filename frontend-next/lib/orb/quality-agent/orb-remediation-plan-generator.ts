import type { OrbClassifiedFailure, OrbFailureClassification, OrbRemediationPlan } from './orb-quality-agent-types.ts'
import { FAILURE_CLASSIFICATION_LABELS } from './orb-failure-classifier.ts'
import { getChangeConstraints, getFilesMustNotChange } from './orb-quality-safety-rules.ts'

const FILES_BY_CLASSIFICATION: Record<OrbFailureClassification, string[]> = {
  adversarial_firewall_gap: [
    'services/orb_adversarial_safety_firewall.py',
    'frontend-next/lib/orb/evaluation/red-team-agents.ts'
  ],
  firewall_scorer_false_positive: [
    'frontend-next/lib/orb/evaluation/orb-firewall-scorer-calibration.ts',
    'frontend-next/lib/orb/evaluation/orb-evaluation-scoring-engine.ts'
  ],
  high_risk_scaffold_gap: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-scoring-context.ts',
    'services/orb_live_guardrail_service.py'
  ],
  high_risk_repair_gap: [
    'services/orb_live_guardrail_service.py',
    'frontend-next/lib/orb/evaluation/orb-high-risk-scoring-context.ts'
  ],
  deterministic_fallback_gap: [
    'assistant/knowledge/orb_operating_brain.py',
    'services/orb_internal_brain_evaluation_service.py'
  ],
  infrastructure_provider_error: [
    'frontend-next/lib/orb/evaluation/orb-evaluation-infrastructure-errors.ts',
    'services/orb_evaluation_runner_service.py'
  ],
  frontend_display_or_persistence_issue: [
    'frontend-next/lib/orb/evaluation/orb-scoring-version.ts',
    'frontend-next/lib/orb/evaluation/orb-evaluation-persistence.ts',
    'frontend-next/components/founder/founder-orb-evaluation-run-detail-page.tsx'
  ],
  scorer_threshold_or_context_issue: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-standard-rubric.ts',
    'frontend-next/lib/orb/evaluation/orb-evaluation-scoring-engine.ts'
  ],
  genuine_answer_quality_issue: [
    'assistant/knowledge/orb_operating_brain.py',
    'services/orb_brain_convergence_orchestrator_service.py'
  ],
  launch_gate_blocker: [
    'frontend-next/lib/orb/quality/launch-quality-gate.ts',
    'frontend-next/lib/founder/quality-lab/'
  ]
}

const TESTS_BY_CLASSIFICATION: Record<OrbFailureClassification, string[]> = {
  adversarial_firewall_gap: [
    'frontend-next/lib/orb/evaluation/orb-firewall-scorer-calibration.test.ts',
    'npm run test:orb-evaluation'
  ],
  firewall_scorer_false_positive: [
    'frontend-next/lib/orb/evaluation/orb-firewall-scorer-calibration.test.ts'
  ],
  high_risk_scaffold_gap: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-safeguard-scaffold.test.ts'
  ],
  high_risk_repair_gap: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-safeguard-scaffold.test.ts'
  ],
  deterministic_fallback_gap: [
    'frontend-next/lib/orb/evaluation/orb-evaluation.test.ts'
  ],
  infrastructure_provider_error: [
    'frontend-next/lib/orb/evaluation/orb-evaluation-infrastructure-errors.test.ts'
  ],
  frontend_display_or_persistence_issue: [
    'frontend-next/lib/orb/evaluation/orb-scoring-version.test.ts'
  ],
  scorer_threshold_or_context_issue: [
    'frontend-next/lib/orb/evaluation/orb-high-risk-safeguard-scaffold.test.ts'
  ],
  genuine_answer_quality_issue: [
    'frontend-next/lib/orb/evaluation/orb-evaluation.test.ts'
  ],
  launch_gate_blocker: [
    'frontend-next/lib/orb/evaluation/orb-evaluation.test.ts'
  ]
}

function launchImpactFor(classification: OrbFailureClassification): string {
  switch (classification) {
    case 'launch_gate_blocker':
      return 'Blocks public launch until governance evidence is complete.'
    case 'adversarial_firewall_gap':
    case 'high_risk_scaffold_gap':
    case 'high_risk_repair_gap':
    case 'deterministic_fallback_gap':
      return 'High — safeguarding output quality must be verified before launch.'
    case 'infrastructure_provider_error':
      return 'Low for launch gate if retest passes after provider recovery.'
    case 'frontend_display_or_persistence_issue':
      return 'Medium — may affect founder confidence in evaluation evidence.'
    default:
      return 'Medium — requires founder review before launch gate sign-off.'
  }
}

function rollbackRiskFor(classification: OrbFailureClassification): string {
  if (classification === 'infrastructure_provider_error') return 'Low'
  if (classification === 'frontend_display_or_persistence_issue') return 'Low'
  if (classification === 'adversarial_firewall_gap') return 'High — firewall changes affect all adversarial scenarios'
  return 'Medium'
}

export function generateRemediationPlan(
  classification: OrbFailureClassification,
  failures: OrbClassifiedFailure[]
): OrbRemediationPlan {
  const label = FAILURE_CLASSIFICATION_LABELS[classification]
  const categories = [...new Set(failures.map((f) => f.scenarioCategory))]
  const scenarios = failures.map((f) => f.scenarioId)
  const constraints = getChangeConstraints(classification)
  const mustNotChangeFiles = getFilesMustNotChange(classification)

  const likelyRootCause =
    failures[0]?.reason ?? `Classified as ${label} based on evaluation failure patterns.`

  const manualRetestChecklist = [
    `Re-run ${failures[0]?.input.pack ?? 'evaluation'} pack in ${failures[0]?.input.mode ?? 'live-llm'} mode`,
    `Confirm scenario ${scenarios[0] ?? 'affected'} passes without critical failure`,
    'Verify failed run remains visible in ORB Evaluation history',
    'Confirm no safety thresholds were weakened',
    'Founder manual review before merge'
  ]

  if (classification === 'high_risk_scaffold_gap' || classification === 'high_risk_repair_gap') {
    manualRetestChecklist.unshift(
      `Verify required markers present for ${categories.join(', ')} category`
    )
  }

  return {
    failureSummary: `${label}: ${failures.length} failed scenario(s) in categories [${categories.join(', ')}]`,
    affectedScenarios: scenarios,
    likelyRootCause,
    filesLikelyToChange: FILES_BY_CLASSIFICATION[classification],
    filesMustNotChange: [
      ...mustNotChangeFiles,
      ...constraints.mustNotChange.map((c) => `Do not change: ${c}`)
    ],
    testsToAdd: [
      ...TESTS_BY_CLASSIFICATION[classification],
      `Add regression test for ${categories[0] ?? 'affected'} scenario family`
    ],
    manualRetestChecklist,
    rollbackRisk: rollbackRiskFor(classification),
    launchImpact: launchImpactFor(classification)
  }
}
