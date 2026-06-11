import type { OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'
import type {
  OrbFailureGroup,
  OrbQualityBuildBrief,
  OrbRemediationPlan
} from './orb-quality-agent-types.ts'
import { ORB_QUALITY_AGENT_ENVIRONMENT } from './orb-quality-agent-types.ts'
import { FAILURE_CLASSIFICATION_LABELS } from './orb-failure-classifier.ts'
import { PRESERVED_SAFEGUARDING_PRINCIPLES, SAFETY_CONSTRAINTS_ALWAYS } from './orb-quality-safety-rules.ts'

export function generateOrbQualityBuildBrief(input: {
  run: OrbEvaluationRun
  runType: string
  failureGroups: OrbFailureGroup[]
  remediationPlans: Record<string, OrbRemediationPlan>
}): OrbQualityBuildBrief {
  const { run, runType, failureGroups, remediationPlans } = input

  const observedFailures = failureGroups.flatMap((group) =>
    group.failures.map(
      (f) =>
        `[${FAILURE_CLASSIFICATION_LABELS[group.classification]}] ${f.scenarioId} (${f.scenarioCategory}): ${f.reason}`
    )
  )

  const phases = [
    'Analyse classified failure groups from latest ORB evaluation run',
    ...failureGroups.map(
      (g) => `Remediate ${FAILURE_CLASSIFICATION_LABELS[g.classification]} — smallest safe fix only`
    ),
    'Add regression tests for affected scenario categories',
    'Run backend tests, npm run test:orb-evaluation, npm run typecheck, npm run build',
    'Prepare draft PR for founder approval — do not auto-merge'
  ]

  const constraints = [
    ...SAFETY_CONSTRAINTS_ALWAYS,
    ...PRESERVED_SAFEGUARDING_PRINCIPLES.map((p) => `Preserve: ${p}`),
    ...failureGroups.flatMap((g) => remediationPlans[g.classification]?.filesMustNotChange ?? [])
  ]

  const tests = [
    'source .venv/bin/activate && python -m pytest tests/test_orb_evaluation_platform.py -q',
    'cd frontend-next && npm run test:orb-evaluation',
    'cd frontend-next && npm run typecheck',
    'cd frontend-next && npm run build',
    ...failureGroups.flatMap((g) => remediationPlans[g.classification]?.testsToAdd ?? [])
  ]

  const manualRetestChecklist = [
    ...new Set(
      failureGroups.flatMap((g) => remediationPlans[g.classification]?.manualRetestChecklist ?? [])
    ),
    'Confirm old failed run remains visible',
    'Confirm audit trail records agent action'
  ]

  const cursorPrompt = [
    `Environment: ${ORB_QUALITY_AGENT_ENVIRONMENT}`,
    '',
    `Context: ORB Quality Agent build brief from ${runType} run ${run.id}`,
    `Pack: ${run.packType ?? 'standard'} | Mode: ${run.mode} | Pass rate: ${run.passRate}%`,
    '',
    'Observed failures:',
    ...observedFailures.map((f) => `- ${f}`),
    '',
    'Constraints:',
    ...constraints.map((c) => `- ${c}`),
    '',
    'Apply the smallest safe fix for each failure group. Tom must approve the PR.'
  ].join('\n')

  return {
    environment: ORB_QUALITY_AGENT_ENVIRONMENT,
    context: `ORB Residential — powered by IndiCare Intelligence. ${runType} evaluation run ${run.id} has ${failureGroups.length} failure group(s) requiring founder-reviewed remediation.`,
    observedFailures,
    phases,
    constraints: [...new Set(constraints)],
    tests: [...new Set(tests)],
    manualRetestChecklist,
    cursorPrompt
  }
}

export function formatBuildBriefForCursor(brief: OrbQualityBuildBrief): string {
  return [
    `# ORB Quality Agent Build Brief`,
    '',
    `**Environment:** ${brief.environment}`,
    '',
    `## Context`,
    brief.context,
    '',
    `## Observed Failures`,
    ...brief.observedFailures.map((f) => `- ${f}`),
    '',
    `## Phases`,
    ...brief.phases.map((p, i) => `${i + 1}. ${p}`),
    '',
    `## Constraints`,
    ...brief.constraints.map((c) => `- ${c}`),
    '',
    `## Tests`,
    ...brief.tests.map((t) => `- ${t}`),
    '',
    `## Manual Retest Checklist`,
    ...brief.manualRetestChecklist.map((c) => `- [ ] ${c}`),
    '',
    `## Cursor Prompt`,
    brief.cursorPrompt
  ].join('\n')
}
