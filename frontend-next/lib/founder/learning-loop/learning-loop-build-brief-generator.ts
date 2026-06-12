import {
  LEARNING_LOOP_ENVIRONMENT,
  type LearningBuildBrief,
  type LearningProposal
} from './learning-loop-types.ts'
import {
  LEARNING_LOOP_FILES_MUST_NOT_TOUCH,
  LEARNING_LOOP_MANDATORY_CONSTRAINTS
} from './learning-loop-safety.ts'
import { nextBuildBriefId } from './learning-loop-store.ts'

export function generateLearningBuildBrief(input: {
  proposal: LearningProposal
  loopId: string
  evidenceFromFailedRuns?: string[]
  affectedCategories?: string[]
}): LearningBuildBrief {
  const { proposal } = input

  const safetyConstraints = [...LEARNING_LOOP_MANDATORY_CONSTRAINTS]

  const retestSequence = [
    'Re-run affected synthetic scenarios in ORB Evaluation (internal-brain mode)',
    'Re-run high-risk live pack in Quality Lab if safeguarding-related',
    'Confirm failed runs remain visible in evaluation history',
    'Confirm audit trail records learning loop lifecycle',
    'Prepare PR for Tom\'s approval — do not auto-merge'
  ]

  const cursorPrompt = [
    `Environment: ${LEARNING_LOOP_ENVIRONMENT}`,
    '',
    `Context: IndiCare Learning Loop build brief from proposal ${proposal.id}`,
    proposal.whyItMatters,
    '',
    'Evidence from failed runs:',
    ...(input.evidenceFromFailedRuns ?? [proposal.evidenceSummary]).map((e) => `- ${e}`),
    '',
    'Affected categories:',
    ...(input.affectedCategories ?? []).map((c) => `- ${c}`),
    '',
    'Exact proposed change:',
    proposal.whatBrainShouldLearn,
    '',
    'Files likely to change:',
    ...proposal.filesLikelyToChange.map((f) => `- ${f}`),
    '',
    'Files not to touch:',
    ...LEARNING_LOOP_FILES_MUST_NOT_TOUCH.map((f) => `- ${f}`),
    '',
    'Tests to add:',
    ...proposal.testsRequired.map((t) => `- ${t}`),
    '',
    'Safety constraints:',
    ...safetyConstraints.map((c) => `- ${c}`),
    '',
    'Tom must approve the PR before merge.'
  ].join('\n')

  return {
    id: nextBuildBriefId(),
    proposalId: proposal.id,
    loopId: input.loopId,
    createdAt: new Date().toISOString(),
    environment: LEARNING_LOOP_ENVIRONMENT,
    context: `IndiCare Learning Loop — ${proposal.whatFailed}`,
    evidenceFromFailedRuns: input.evidenceFromFailedRuns ?? [proposal.evidenceSummary],
    affectedCategories: input.affectedCategories ?? [proposal.changeType],
    exactProposedChange: proposal.whatBrainShouldLearn,
    filesLikelyToChange: proposal.filesLikelyToChange,
    filesNotToTouch: [...LEARNING_LOOP_FILES_MUST_NOT_TOUCH],
    testsToAdd: proposal.testsRequired,
    retestSequence,
    safetyConstraints,
    founderApprovalRequired: true,
    cursorPrompt
  }
}

export function buildBriefIncludesSafetyConstraints(brief: LearningBuildBrief): boolean {
  return LEARNING_LOOP_MANDATORY_CONSTRAINTS.every((constraint) =>
    brief.safetyConstraints.some((c) => c.includes(constraint.replace(/\.$/, '')))
  )
}

export function formatLearningBuildBriefForCursor(brief: LearningBuildBrief): string {
  return [
    '# IndiCare Learning Loop Build Brief',
    '',
    `**Environment:** ${brief.environment}`,
    '',
    '## Context',
    brief.context,
    '',
    '## Evidence from Failed Runs',
    ...brief.evidenceFromFailedRuns.map((e) => `- ${e}`),
    '',
    '## Affected Categories',
    ...brief.affectedCategories.map((c) => `- ${c}`),
    '',
    '## Exact Proposed Change',
    brief.exactProposedChange,
    '',
    '## Files Likely to Change',
    ...brief.filesLikelyToChange.map((f) => `- ${f}`),
    '',
    '## Files Not to Touch',
    ...brief.filesNotToTouch.map((f) => `- ${f}`),
    '',
    '## Tests to Add',
    ...brief.testsToAdd.map((t) => `- ${t}`),
    '',
    '## Retest Sequence',
    ...brief.retestSequence.map((s, i) => `${i + 1}. ${s}`),
    '',
    '## Safety Constraints',
    ...brief.safetyConstraints.map((c) => `- ${c}`),
    '',
    '## Cursor Prompt',
    brief.cursorPrompt
  ].join('\n')
}
