import type {
  OrbEvaluationResult,
  OrbEvaluationRun,
  OrbEvaluationRunMode,
  OrbEvaluationScenario,
  OrbLiveGuardrailAnswerSource
} from './orb-evaluation-types.ts'

export const INTERNAL_BRAIN_SCORING_VERSION = 'internal-brain-v2'
export const LIVE_LLM_LEGACY_SCORING_VERSION = 'legacy live/template'
export const LIVE_LLM_GUARDED_V3_SCORING_VERSION = 'live-llm-guarded-v3'
export const LIVE_LLM_FIREWALL_SCORING_VERSION = 'live-llm-guarded-v4-firewall'

export const FIREWALL_ADVERSARIAL_SCORER = 'FirewallAdversarialRubric'
export const GENERIC_LIVE_LLM_SCORER = 'GenericLiveLlmRubric'

const FIREWALL_ANSWER_SOURCES = new Set<OrbLiveGuardrailAnswerSource>([
  'safety_firewall',
  'privacy_block'
])

export type ScoringVersionTraceInput = {
  runId: string
  mode: OrbEvaluationRunMode
  pack?: OrbEvaluationRun['packType']
  scenarioCategory?: string
  scenarioId?: string
  requestedScoringVersion?: string
  assignedScoringVersion?: string
  persistedScoringVersion?: string
  answerSource?: OrbLiveGuardrailAnswerSource | string
  safetyFirewallUsed?: boolean
  scorerUsed?: string
  frontendDisplayVersion?: string
}

export function isFirewallScoredAnswerSource(
  answerSource: OrbLiveGuardrailAnswerSource | string | undefined,
  safetyFirewallUsed?: boolean
): boolean {
  if (safetyFirewallUsed) return true
  if (!answerSource) return false
  return FIREWALL_ANSWER_SOURCES.has(answerSource as OrbLiveGuardrailAnswerSource)
}

export function shouldUseFirewallAdversarialScorer(input: {
  mode?: OrbEvaluationRunMode
  packType?: OrbEvaluationRun['packType']
  scenario?: Pick<OrbEvaluationScenario, 'domain' | 'adversarialFlags'>
  answerSource?: OrbLiveGuardrailAnswerSource | string
  safetyFirewallUsed?: boolean
}): boolean {
  if (input.mode !== 'live-llm') return false
  if (!isFirewallScoredAnswerSource(input.answerSource, input.safetyFirewallUsed)) return false
  if (input.packType === 'adversarial') return true
  if (
    input.scenario &&
    (input.scenario.domain === 'adversarial' || input.scenario.adversarialFlags.length > 0)
  ) {
    return true
  }
  return false
}

export function resolveLiveLlmResultScoringVersion(input: {
  mode?: OrbEvaluationRunMode
  packType?: OrbEvaluationRun['packType']
  scenario?: Pick<OrbEvaluationScenario, 'domain' | 'adversarialFlags'>
  answerSource?: OrbLiveGuardrailAnswerSource | string
  safetyFirewallUsed?: boolean
}): string | undefined {
  if (input.mode !== 'live-llm') return undefined
  if (shouldUseFirewallAdversarialScorer(input)) {
    return LIVE_LLM_FIREWALL_SCORING_VERSION
  }
  if (input.answerSource === 'raw' || input.answerSource === 'repaired' || input.answerSource === 'fallback') {
    return LIVE_LLM_GUARDED_V3_SCORING_VERSION
  }
  return undefined
}

export function resolveLiveLlmScorerUsed(input: {
  mode?: OrbEvaluationRunMode
  packType?: OrbEvaluationRun['packType']
  scenario?: Pick<OrbEvaluationScenario, 'domain' | 'adversarialFlags'>
  answerSource?: OrbLiveGuardrailAnswerSource | string
  safetyFirewallUsed?: boolean
  firewallRubricApplies?: boolean
}): string {
  if (shouldUseFirewallAdversarialScorer(input)) {
    return FIREWALL_ADVERSARIAL_SCORER
  }
  if (
    input.firewallRubricApplies &&
    isFirewallScoredAnswerSource(input.answerSource, input.safetyFirewallUsed)
  ) {
    return FIREWALL_ADVERSARIAL_SCORER
  }
  if (input.mode === 'live-llm') return GENERIC_LIVE_LLM_SCORER
  return 'template'
}

export function resolveLiveLlmRunScoringVersion(
  run: Pick<OrbEvaluationRun, 'mode' | 'packType'>,
  results: Array<
    Pick<OrbEvaluationResult, 'scoringVersion' | 'answerSource' | 'liveGuardrail' | 'firewallScoring'>
  >
): string | undefined {
  if (run.mode !== 'live-llm') return undefined

  const resultVersions = results
    .map((result) => result.scoringVersion ?? inferResultScoringVersion(run, result))
    .filter((version): version is string => Boolean(version))

  if (resultVersions.includes(LIVE_LLM_FIREWALL_SCORING_VERSION)) {
    if (run.packType === 'adversarial') return LIVE_LLM_FIREWALL_SCORING_VERSION
    const allFirewall = resultVersions.every((version) => version === LIVE_LLM_FIREWALL_SCORING_VERSION)
    if (allFirewall) return LIVE_LLM_FIREWALL_SCORING_VERSION
  }

  if (resultVersions.includes(LIVE_LLM_GUARDED_V3_SCORING_VERSION)) {
    return LIVE_LLM_GUARDED_V3_SCORING_VERSION
  }

  if (resultVersions.length > 0) return resultVersions[0]
  return undefined
}

export function inferResultScoringVersion(
  run: Pick<OrbEvaluationRun, 'mode' | 'packType'>,
  result: Pick<
    OrbEvaluationResult,
    'answerSource' | 'liveGuardrail' | 'firewallScoring' | 'scoringVersion'
  >,
  scenario?: Pick<OrbEvaluationScenario, 'domain' | 'adversarialFlags'>
): string | undefined {
  if (result.scoringVersion) return result.scoringVersion
  const answerSource = result.liveGuardrail?.answerSource ?? result.answerSource
  const safetyFirewallUsed = result.liveGuardrail?.safetyFirewallUsed
  return resolveLiveLlmResultScoringVersion({
    mode: run.mode,
    packType: run.packType,
    scenario,
    answerSource,
    safetyFirewallUsed
  })
}

export function formatLiveLlmScoringVersionForDisplay(
  run: Pick<OrbEvaluationRun, 'mode' | 'scoringVersion' | 'packType' | 'results'>,
  results?: Array<Pick<OrbEvaluationResult, 'scoringVersion' | 'liveGuardrail' | 'firewallScoring' | 'answerSource'>>
): string {
  if (run.mode !== 'live-llm') return run.scoringVersion ?? INTERNAL_BRAIN_SCORING_VERSION

  const persisted = run.scoringVersion
  if (persisted === LIVE_LLM_FIREWALL_SCORING_VERSION) return LIVE_LLM_FIREWALL_SCORING_VERSION
  if (persisted === LIVE_LLM_GUARDED_V3_SCORING_VERSION) return LIVE_LLM_GUARDED_V3_SCORING_VERSION
  if (persisted === LIVE_LLM_LEGACY_SCORING_VERSION) return LIVE_LLM_LEGACY_SCORING_VERSION
  if (persisted) return persisted

  const items = results ?? run.results ?? []
  const inferred = resolveLiveLlmRunScoringVersion(run, items)
  if (inferred) return inferred

  const firewallFromMetadata = items.some(
    (result) =>
      result.liveGuardrail?.safetyFirewallUsed ||
      result.liveGuardrail?.answerSource === 'safety_firewall' ||
      result.liveGuardrail?.answerSource === 'privacy_block' ||
      result.firewallScoring?.applies
  )
  if (firewallFromMetadata && run.packType === 'adversarial') {
    return LIVE_LLM_FIREWALL_SCORING_VERSION
  }

  return 'unknown / legacy'
}

export function formatResultScoringVersionForDisplay(
  run: Pick<OrbEvaluationRun, 'mode' | 'packType'>,
  result: Pick<
    OrbEvaluationResult,
    'scoringVersion' | 'liveGuardrail' | 'firewallScoring' | 'answerSource' | 'scorerUsed'
  >
): string {
  const persisted = result.scoringVersion
  if (persisted === LIVE_LLM_FIREWALL_SCORING_VERSION) return LIVE_LLM_FIREWALL_SCORING_VERSION
  if (persisted === LIVE_LLM_GUARDED_V3_SCORING_VERSION) return LIVE_LLM_GUARDED_V3_SCORING_VERSION
  if (persisted) return persisted

  const inferred = inferResultScoringVersion(run, result)
  if (inferred) return inferred

  if (
    run.mode === 'live-llm' &&
    (result.liveGuardrail?.safetyFirewallUsed ||
      result.liveGuardrail?.answerSource === 'safety_firewall' ||
      result.liveGuardrail?.answerSource === 'privacy_block' ||
      result.firewallScoring?.applies)
  ) {
    return LIVE_LLM_FIREWALL_SCORING_VERSION
  }

  return 'unknown / legacy'
}

export function traceOrbEvalScoringVersion(input: ScoringVersionTraceInput): void {
  const payload = {
    event: 'orb_eval_scoring_version_trace',
    run_id: input.runId,
    mode: input.mode,
    pack: input.pack ?? null,
    scenario_category: input.scenarioCategory ?? null,
    scenario_id: input.scenarioId ?? null,
    requested_scoring_version: input.requestedScoringVersion ?? null,
    assigned_scoring_version: input.assignedScoringVersion ?? null,
    persisted_scoring_version: input.persistedScoringVersion ?? null,
    answer_source: input.answerSource ?? null,
    safety_firewall_used: input.safetyFirewallUsed ?? false,
    scorer_used: input.scorerUsed ?? null,
    frontend_display_version: input.frontendDisplayVersion ?? null
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.info('[orb_eval_scoring_version_trace]', payload)
  }
}
