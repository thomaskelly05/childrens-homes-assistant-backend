import type { OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'
import type {
  OrbFailureClassification,
  OrbFailureGroup,
  OrbQualityPrSummary,
  OrbRemediationPlan
} from './orb-quality-agent-types.ts'
import { FAILURE_CLASSIFICATION_LABELS } from './orb-failure-classifier.ts'
import { SAFETY_CONSTRAINTS_ALWAYS } from './orb-quality-safety-rules.ts'

export function buildQualityPrBranchName(runId: string): string {
  const short = runId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
  return `cursor/orb-quality-agent-fix-${short}`
}

export function buildQualityPrTitle(
  classification: OrbFailureClassification,
  pack: string
): string {
  const label = FAILURE_CLASSIFICATION_LABELS[classification]
  return `ORB Quality Agent: fix ${label} from ${pack} run`
}

export function buildQualityPrSummary(input: {
  run: OrbEvaluationRun
  failureGroup: OrbFailureGroup
  remediationPlan: OrbRemediationPlan
  changedFiles: string[]
  testsRun: string[]
}): OrbQualityPrSummary {
  const { run, failureGroup, remediationPlan, changedFiles, testsRun } = input
  const failedScenarios = failureGroup.failures.map((f) => f.scenarioId)

  const body = [
    '## ORB Quality Agent — Founder Approval Required',
    '',
    '> This agent prepares quality improvement work. It does not approve, merge, or override safeguarding judgement.',
    '',
    '### Latest Run Summary',
    `- Run ID: ${run.id}`,
    `- Mode: ${run.mode}`,
    `- Pack: ${run.packType ?? 'standard'}`,
    `- Status: ${run.status}`,
    `- Pass rate: ${run.passRate}%`,
    `- Critical failures: ${run.criticalFailures}`,
    '',
    '### Failed Scenarios',
    ...failedScenarios.map((s) => `- ${s}`),
    '',
    '### Classification',
    `- **${FAILURE_CLASSIFICATION_LABELS[failureGroup.classification]}**`,
    `- Confidence: ${failureGroup.confidence}`,
    `- Reason: ${failureGroup.reason}`,
  '',
    '### Root Cause',
    remediationPlan.likelyRootCause,
    '',
    '### Changed Files',
    ...(changedFiles.length > 0 ? changedFiles.map((f) => `- ${f}`) : ['- (to be determined during implementation)']),
    '',
    '### Tests Run',
    ...testsRun.map((t) => `- ${t}`),
    '',
    '### Risks',
    `- Rollback risk: ${remediationPlan.rollbackRisk}`,
    `- Launch impact: ${remediationPlan.launchImpact}`,
    '',
    '### Manual Retest Instructions',
    ...remediationPlan.manualRetestChecklist.map((c) => `- [ ] ${c}`),
    '',
    '### Founder Approval',
    '- [ ] Founder reviewed and approved',
    '- [ ] No safety thresholds weakened',
    '- [ ] No failed runs hidden',
    '- [ ] No real child data used',
    '- [ ] Manual ORB evaluation retest completed',
    '',
    '### Safety Constraints',
    ...SAFETY_CONSTRAINTS_ALWAYS.map((c) => `- ${c}`)
  ].join('\n')

  return {
    title: buildQualityPrTitle(failureGroup.classification, run.packType ?? 'standard'),
    body,
    branchName: buildQualityPrBranchName(run.id),
    founderApprovalRequired: true,
    autoMergeAllowed: false
  }
}

export const QUALITY_PR_TESTS = [
  'source .venv/bin/activate && python -m pytest tests/test_orb_evaluation_platform.py -q',
  'cd frontend-next && npm run test:orb-evaluation',
  'cd frontend-next && npm run typecheck',
  'cd frontend-next && npm run build'
] as const

export function prepareQualityPrWorkflow(input: {
  run: OrbEvaluationRun
  failureGroup: OrbFailureGroup
  remediationPlan: OrbRemediationPlan
  changedFiles?: string[]
}): OrbQualityPrSummary {
  return buildQualityPrSummary({
    run: input.run,
    failureGroup: input.failureGroup,
    remediationPlan: input.remediationPlan,
    changedFiles: input.changedFiles ?? input.remediationPlan.filesLikelyToChange,
    testsRun: [...QUALITY_PR_TESTS, ...input.remediationPlan.testsToAdd]
  })
}

export function isAutoMergePermitted(): false {
  return false
}
