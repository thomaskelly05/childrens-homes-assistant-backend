import type { OrbEvaluationResult, OrbEvaluationRun } from '../evaluation/orb-evaluation-types.ts'
import { inferResultScoringVersion } from '../evaluation/orb-scoring-version.ts'
import type { OrbFailureClassifierInput } from './orb-quality-agent-types.ts'

export function buildClassifierInputFromResult(
  run: OrbEvaluationRun,
  result: OrbEvaluationResult,
  options?: {
    launchGateBlockers?: string[]
    displayScoringVersion?: string
    persistedScoringVersion?: string
  }
): OrbFailureClassifierInput {
  const guardrail = result.liveGuardrail
  const scenarioCategory =
    result.safetyScaffoldCategory ??
    guardrail?.scaffoldCategory ??
    result.internalBrain?.detectedCategory ??
    'unknown'

  return {
    runId: run.id,
    pack: run.packType ?? 'standard',
    mode: run.mode,
    scenarioId: result.scenarioId,
    scenarioCategory,
    scoringVersion: result.scoringVersion ?? inferResultScoringVersion(run, result),
    answerSource: guardrail?.answerSource ?? result.answerSource,
    safetyFirewallUsed: guardrail?.safetyFirewallUsed,
    scorerUsed: result.scorerUsed,
    criticalFailure: result.criticalFailure,
    redTeamFindings: result.redTeamFindings ?? [],
    missingSafeguards: guardrail?.missingSafeguards ?? result.missingRequirementDetails?.map((m) => m.label) ?? [],
    failReasons: guardrail?.failReasons ?? result.issues ?? [],
    infrastructureError: result.infrastructureError,
    finalAnswer: guardrail?.finalAnswer ?? result.orbAnswer,
    scoringAnswer: guardrail?.scoringAnswer ?? guardrail?.answerUsedForScoring ?? result.orbAnswer,
    repairAttempted: guardrail?.repairAttempted ?? false,
    fallbackUsed: guardrail?.fallbackUsed ?? false,
    pass: result.pass,
    issues: result.issues,
    runStatus: run.status,
    displayScoringVersion: options?.displayScoringVersion,
    persistedScoringVersion: options?.persistedScoringVersion ?? result.scoringVersion,
    launchGateBlockers: options?.launchGateBlockers
  }
}
