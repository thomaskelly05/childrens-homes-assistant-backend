import { addBuildBrief } from '@/lib/founder/build-briefs/build-brief-store'
import { addQualityProposal } from '@/lib/founder/quality-lab/quality-proposal-store'
import { FounderPersistenceApiError } from '@/lib/founder/api/founder-api-client'
import {
  EvaluationApiError,
  isEvaluationCsrfError,
  isEvaluationProcessBusyError,
  postEvaluationRun,
  postEvaluationRunProcess
} from '@/lib/orb/evaluation/orb-evaluation-client'
import {
  ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE,
  isFounderDataSourceBusyError,
  persistOrbEvaluationRun
} from '@/lib/orb/evaluation/orb-evaluation-persistence'

import type {
  OrbEvaluationFixProposal,
  OrbEvaluationResult,
  OrbEvaluationRun,
  OrbEvaluationRunMode,
  OrbEvaluationScenario
} from './orb-evaluation-types'
import {
  generateAdversarialPack,
  generateHighRiskPack,
  generateOrbEvaluationScenarios,
  getScenarioCoverageSummary
} from './orb-scenario-generator'
import {
  addEvaluationFixProposal,
  addEvaluationResults,
  addEvaluationRun,
  addEvaluationScenarios,
  getEvaluationResult,
  getEvaluationResults,
  getEvaluationRun,
  getEvaluationRuns,
  getEvaluationScenarios,
  getActiveInternalBrainRun,
  getAnyActiveInternalBrainRun,
  getLatestInternalBrainHighRiskRun,
  recoverStaleInternalBrainRuns,
  getLatestInternalBrainRun,
  getLatestLiveLlmRun,
  removeEvaluationRun,
  setEvaluationScenarios,
  updateEvaluationRun
} from './orb-evaluation-store'
import { INTERNAL_BRAIN_SCORING_VERSION } from './orb-internal-brain-severity'
import {
  detectInternalBrainCriticalFailure,
  normaliseInternalBrainPayload,
  scoreInternalBrainResult
} from './orb-internal-brain-scoring-engine'
import {
  INTERNAL_BRAIN_SCORING_VERSION_V2,
  LIVE_LLM_GUARDED_SCORING_VERSION_V4
} from './orb-evaluation-types'
import { buildTemplateAnswer, scoreOrbEvaluationAnswer } from './orb-evaluation-scoring-engine'
import { mergeRedTeamFindings, runRedTeamAgents } from './red-team-agents'

type BackendRunResponse = {
  run_id: string
  title: string
  mode: OrbEvaluationRunMode
  status: 'completed' | 'failed' | 'queued' | 'running'
  scenario_count: number
  completed_count: number
  live_llm_available: boolean
  scenario_results: Array<{
    scenario_id: string
    question: string
    answer: string
    ok: boolean
    error?: string
    model_route?: Record<string, string | null | undefined>
    internal_brain?: Record<string, unknown>
    live_guardrail?: Record<string, unknown>
    safety_scaffold_category?: string
  }>
  limitations?: string[]
  error?: string
  run?: {
    id: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    mode: OrbEvaluationRunMode
    pack?: string
    pack_type?: string
    title?: string
    scenario_count?: number
    completed_count?: number
    critical_failures?: number
    started_at?: string
    created_by?: string
  }
  reused_active_run?: boolean
}

export type EvaluationRunOptions = {
  title?: string
  mode?: OrbEvaluationRunMode
  packType?: OrbEvaluationRun['packType']
  limit?: number
  scenarioIds?: string[]
  createdBy?: string
}

export type InternalBrainRunProgress = {
  runId: string
  status: OrbEvaluationRun['status']
  completedCount: number
  scenarioCount: number
  criticalFailures: number
}

export type InternalBrainRunCallbacks = {
  onProgress?: (progress: InternalBrainRunProgress) => void
  maxProcessRetries?: number
}

export class EvaluationRunError extends Error {
  run?: OrbEvaluationRun

  constructor(message: string, run?: OrbEvaluationRun) {
    super(message)
    this.name = 'EvaluationRunError'
    this.run = run
  }
}

export function assertCompletedEvaluationRunSaved(run: OrbEvaluationRun): void {
  if (!run.id) {
    throw new EvaluationRunError('Internal brain run did not complete. No result was saved.')
  }
  if (run.status !== 'completed') {
    throw new EvaluationRunError(run.summary || 'Evaluation run did not complete.', run)
  }
  if (run.mode === 'internal-brain' && run.completedCount === 0) {
    throw new EvaluationRunError('Internal brain run did not complete. No result was saved.', run)
  }
}

function newRunId(): string {
  return `eval-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function aggregateMissingRequirementCounts(evalResults: OrbEvaluationResult[]) {
  let missingRequirementsCount = 0
  let improvementOpportunitiesCount = 0
  for (const result of evalResults) {
    const details = result.missingRequirementDetails ?? []
    missingRequirementsCount += details.filter((d) => d.severity !== 'improvement').length
    improvementOpportunitiesCount += details.filter((d) => d.severity === 'improvement').length
  }
  return { missingRequirementsCount, improvementOpportunitiesCount }
}

function summariseRun(
  run: OrbEvaluationRun,
  evalResults: OrbEvaluationResult[]
): OrbEvaluationRun {
  const passed = evalResults.filter((r) => r.pass).length
  const criticalFailures = evalResults.filter((r) => r.criticalFailure).length
  const averageScore =
    evalResults.length > 0
      ? Math.round(
          evalResults.reduce((sum, r) => sum + r.scores.overall, 0) / evalResults.length
        )
      : 0
  const passRate = evalResults.length > 0 ? Math.round((passed / evalResults.length) * 1000) / 10 : 0
  const { missingRequirementsCount, improvementOpportunitiesCount } =
    aggregateMissingRequirementCounts(evalResults)

  return {
    ...run,
    status: 'completed',
    completedCount: evalResults.length,
    passRate,
    averageScore,
    criticalFailures,
    missingRequirementsCount,
    improvementOpportunitiesCount,
    scoringVersion:
      run.mode === 'live-llm'
        ? LIVE_LLM_GUARDED_SCORING_VERSION_V4
        : run.scoringVersion,
    completedAt: new Date().toISOString(),
    results: evalResults,
    summary: `${passed}/${evalResults.length} passed · ${criticalFailures} critical · avg ${averageScore}`
  }
}

export function generateScenarios(count: number): OrbEvaluationScenario[] {
  const items = generateOrbEvaluationScenarios(count)
  setEvaluationScenarios(items)
  return items
}

export function generateScenarioPack(
  packType: NonNullable<OrbEvaluationRun['packType']>
): OrbEvaluationScenario[] {
  let items: OrbEvaluationScenario[]
  if (packType === 'high-risk') items = generateHighRiskPack()
  else if (packType === 'adversarial') items = generateAdversarialPack()
  else items = generateOrbEvaluationScenarios(packType === 'standard' ? 100 : 50)
  setEvaluationScenarios(items)
  return items
}

async function callBackendRun(
  scenarios: OrbEvaluationScenario[],
  options: EvaluationRunOptions
): Promise<BackendRunResponse> {
  const payload = (await postEvaluationRun({
    title: options.title,
    mode: options.mode ?? 'live-llm',
    pack_type: options.packType ?? 'standard',
    scenarios,
    limit: options.limit ?? scenarios.length,
    created_by: options.createdBy ?? 'founder'
  })) as BackendRunResponse & { run?: BackendRunResponse['run'] }

  if (payload.run) {
    return {
      run_id: payload.run.id,
      title: payload.run.title ?? options.title ?? 'ORB Evaluation',
      mode: payload.run.mode,
      status: payload.run.status,
      scenario_count: payload.run.scenario_count ?? scenarios.length,
      completed_count: payload.run.completed_count ?? 0,
      live_llm_available: payload.live_llm_available ?? false,
      scenario_results: [],
      limitations: payload.limitations,
      run: payload.run,
      reused_active_run: (payload as { reused_active_run?: boolean }).reused_active_run
    }
  }

  return payload
}

function scoreInternalBrainBatch(
  runId: string,
  scenarios: OrbEvaluationScenario[],
  batchItems: NonNullable<BackendRunResponse['scenario_results']>
): OrbEvaluationResult[] {
  const scenarioMap = new Map(scenarios.map((s) => [s.id, s]))
  const evalResults: OrbEvaluationResult[] = []

  for (const item of batchItems) {
    const scenario = scenarioMap.get(item.scenario_id)
    if (!scenario) continue
    const internalBrain = item.internal_brain
      ? normaliseInternalBrainPayload(item.internal_brain)
      : normaliseInternalBrainPayload({
          scenario_id: item.scenario_id,
          detected_domain: scenario.domain,
          detected_category: scenario.category,
          detected_risk_level: scenario.riskLevel,
          detected_role_perspective: scenario.rolePerspective,
          required_escalation: false,
          fallback_answer: item.answer,
          internal_brain_score: 0,
          critical_failure: !item.ok,
          issues: item.error ? [item.error] : []
        })
    const internalBrainScores = scoreInternalBrainResult(scenario, internalBrain)
    const { critical, reasons, missingRequirements } = detectInternalBrainCriticalFailure(
      scenario,
      internalBrain
    )
    const criticalFailure = critical || internalBrain.criticalFailure
    const hasCriticalMissing = missingRequirements.some(
      (req) => req.severity === 'critical' && req.shouldBlockPass
    )
    const pass =
      !criticalFailure &&
      !hasCriticalMissing &&
      Boolean((internalBrain.fallbackAnswer || item.answer).trim()) &&
      item.ok

    const enrichedInternalBrain = {
      ...internalBrain,
      missingRequirementDetails: missingRequirements,
      scoringVersion: INTERNAL_BRAIN_SCORING_VERSION
    }
    const improvementOpportunities = missingRequirements.filter(
      (req) => req.severity === 'improvement'
    )

    evalResults.push({
      id: `result-${runId}-${scenario.id}`,
      runId,
      scenarioId: scenario.id,
      question: scenario.question,
      orbAnswer: internalBrain.fallbackAnswer || item.answer,
      scores: {
        safeguarding: internalBrainScores.safeguardingTrigger,
        escalation: internalBrainScores.escalationRequirement,
        localPolicyCaveat: internalBrainScores.localPolicyCaveat,
        therapeuticTone: internalBrainScores.therapeuticFraming,
        childCentredLanguage: internalBrainScores.childVoiceRequirement,
        childVoice: internalBrainScores.childVoiceRequirement,
        ofstedAlignment: internalBrainScores.regulatoryAnchoring,
        practicalUsefulness: internalBrainScores.fallbackUsefulness,
        evidenceQuality: internalBrainScores.templateMatch,
        hallucinationRisk: 85,
        dataProtection: internalBrainScores.dataProtectionHandling,
        completeness: internalBrainScores.completeness,
        overall: internalBrainScores.overall
      },
      pass,
      criticalFailure,
      issues: [...new Set([...reasons, ...internalBrain.issues])],
      redTeamFindings: [],
      recommendedFix:
        criticalFailure || !pass
          ? `Internal brain gap: ${reasons[0] ?? internalBrain.issues[0] ?? 'review routing and safeguards'}`
          : undefined,
      createdAt: new Date().toISOString(),
      answerSource: 'internal-brain',
      modelRoute: item.model_route,
      internalBrain: enrichedInternalBrain,
      internalBrainScores,
      missingRequirementDetails: missingRequirements,
      improvementOpportunities
    })
  }

  return evalResults
}

function summariseInternalBrainRun(
  run: OrbEvaluationRun,
  evalResults: OrbEvaluationResult[]
): OrbEvaluationRun {
  const passed = evalResults.filter((r) => r.pass).length
  const criticalFailures = evalResults.filter((r) => r.criticalFailure).length
  const averageScore =
    evalResults.length > 0
      ? Math.round(evalResults.reduce((sum, r) => sum + r.scores.overall, 0) / evalResults.length)
      : 0
  const passRate = evalResults.length > 0 ? Math.round((passed / evalResults.length) * 1000) / 10 : 0
  const { missingRequirementsCount, improvementOpportunitiesCount } =
    aggregateMissingRequirementCounts(evalResults)

  return {
    ...run,
    status: 'completed',
    completedCount: evalResults.length,
    passRate,
    averageScore,
    criticalFailures,
    missingRequirementsCount,
    improvementOpportunitiesCount,
    scoringVersion: INTERNAL_BRAIN_SCORING_VERSION_V2,
    supersededByScoringFix: false,
    completedAt: new Date().toISOString(),
    results: evalResults,
    summary: `${passed}/${evalResults.length} passed · ${criticalFailures} critical · ${missingRequirementsCount} missing · ${improvementOpportunitiesCount} improvements · avg ${averageScore}`
  }
}

export async function executeInternalBrainEvaluationRun(
  options: EvaluationRunOptions = {},
  callbacks: InternalBrainRunCallbacks = {}
): Promise<OrbEvaluationRun> {
  recoverStaleInternalBrainRuns()

  const packType = options.packType ?? 'standard'
  const activeForPack = getActiveInternalBrainRun(packType)
  if (activeForPack) {
    return processInternalBrainRunToCompletion(activeForPack.id, callbacks)
  }

  const activeAny = getAnyActiveInternalBrainRun()
  if (activeAny && activeAny.packType !== packType) {
    throw new EvaluationRunError(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE, activeAny)
  }

  let scenarios = getEvaluationScenarios()
  if (options.scenarioIds?.length) {
    const wanted = new Set(options.scenarioIds)
    scenarios = scenarios.filter((s) => wanted.has(s.id))
  } else if (scenarios.length === 0) {
    scenarios = generateScenarioPack(packType)
  }
  if (options.limit) scenarios = scenarios.slice(0, options.limit)

  let backend: BackendRunResponse
  try {
    backend = await callBackendRun(scenarios, { ...options, mode: 'internal-brain' })
  } catch (error) {
    if (isEvaluationCsrfError(error)) throw error
    if (error instanceof EvaluationApiError && error.status === 409) {
      throw new EvaluationRunError(
        error.message.includes('internal-brain') ?
          error.message
        : ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE
      )
    }
    throw error
  }

  const backendRun = backend.run
  const runId = backendRun?.id ?? backend.run_id
  if (!runId) {
    throw new EvaluationRunError('Internal brain run could not be created.')
  }

  const startedAt = backendRun?.started_at ?? new Date().toISOString()
  const pendingRun: OrbEvaluationRun = {
    id: runId,
    mode: 'internal-brain',
    status: backendRun?.status ?? 'queued',
    scenarioCount: backendRun?.scenario_count ?? backend.scenario_count ?? scenarios.length,
    completedCount: 0,
    passRate: 0,
    averageScore: 0,
    criticalFailures: 0,
    missingRequirementsCount: 0,
    improvementOpportunitiesCount: 0,
    scoringVersion: INTERNAL_BRAIN_SCORING_VERSION_V2,
    startedAt,
    createdBy: options.createdBy ?? 'founder',
    summary: 'Queued…',
    title: options.title ?? backendRun?.title ?? backend.title ?? `ORB Evaluation — ${packType}`,
    packType,
    limitations: backend.limitations ?? [
      'Internal-brain mode tests ORB routing, safeguards and fallback logic without calling OpenAI.',
      'Internal safety/routing evidence — not full answer generation evidence.'
    ],
    liveLlmAvailable: backend.live_llm_available,
    results: []
  }

  addEvaluationRun(pendingRun)
  await persistEvaluationRun(pendingRun)
  callbacks.onProgress?.({
    runId,
    status: pendingRun.status,
    completedCount: 0,
    scenarioCount: pendingRun.scenarioCount,
    criticalFailures: 0
  })

  return processInternalBrainRunToCompletion(runId, callbacks, scenarios)
}

export async function processInternalBrainRunToCompletion(
  runId: string,
  callbacks: InternalBrainRunCallbacks = {},
  scenarios?: OrbEvaluationScenario[]
): Promise<OrbEvaluationRun> {
  const maxRetries = callbacks.maxProcessRetries ?? 200
  const knownScenarios = scenarios ?? getEvaluationScenarios()
  let run = getEvaluationRun(runId)
  if (!run) {
    throw new EvaluationRunError('Internal brain run not found.', undefined)
  }

  const accumulatedResults = [...(run.results ?? [])]
  let attempts = 0

  while (attempts < maxRetries) {
    attempts += 1
    let processResult
    try {
      processResult = await postEvaluationRunProcess(runId)
    } catch (error) {
      if (isEvaluationCsrfError(error)) throw error
      if (isEvaluationProcessBusyError(error)) {
        const retryAfterMs =
          error instanceof EvaluationApiError && error.retryAfterMs ? error.retryAfterMs : 1000
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs))
        continue
      }
      const message =
        error instanceof EvaluationApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Process request failed'
      const failed: OrbEvaluationRun = {
        ...run,
        status: 'failed',
        completedAt: new Date().toISOString(),
        summary: message,
        results: accumulatedResults
      }
      updateEvaluationRun(runId, failed)
      await persistEvaluationRun(failed)
      throw new EvaluationRunError(message, failed)
    }

    if (processResult.error && processResult.status === 'failed' && processResult.completedCount === 0) {
      const failed: OrbEvaluationRun = {
        ...run,
        status: 'failed',
        completedAt: new Date().toISOString(),
        summary: processResult.error,
        results: accumulatedResults
      }
      updateEvaluationRun(runId, failed)
      await persistEvaluationRun(failed)
      throw new EvaluationRunError(processResult.error, failed)
    }

    const batchItems = (processResult.batchResults ?? []).map((item) => ({
      scenario_id: item.scenario_id,
      question: item.question,
      answer: item.answer,
      ok: item.ok,
      error: item.error,
      model_route: item.model_route,
      internal_brain: item.internal_brain
    }))
    if (batchItems.length > 0) {
      const batchResults = scoreInternalBrainBatch(runId, knownScenarios, batchItems)
      accumulatedResults.push(...batchResults)
      addEvaluationResults(batchResults)
    }

    const criticalFailures = accumulatedResults.filter((r) => r.criticalFailure).length
    const inProgress: OrbEvaluationRun = {
      ...run,
      status: processResult.status,
      completedCount: processResult.completedCount,
      scenarioCount: processResult.scenarioCount,
      criticalFailures,
      summary: `Running ${processResult.completedCount}/${processResult.scenarioCount}`,
      results: accumulatedResults
    }
    run = inProgress
    updateEvaluationRun(runId, inProgress)
    await persistEvaluationRun(inProgress)
    callbacks.onProgress?.({
      runId,
      status: inProgress.status,
      completedCount: inProgress.completedCount,
      scenarioCount: inProgress.scenarioCount,
      criticalFailures
    })

    if (processResult.status === 'completed') {
      const completed = summariseInternalBrainRun(inProgress, accumulatedResults)
      updateEvaluationRun(runId, completed)
      await persistEvaluationRun(completed)
      assertCompletedEvaluationRunSaved(completed)
      return completed
    }

    if (processResult.status === 'failed') {
      const failed: OrbEvaluationRun = {
        ...inProgress,
        status: 'failed',
        completedAt: new Date().toISOString(),
        summary: processResult.error ?? 'Internal brain evaluation run failed.'
      }
      updateEvaluationRun(runId, failed)
      await persistEvaluationRun(failed)
      throw new EvaluationRunError(failed.summary, failed)
    }

    if (!processResult.nextBatchAvailable) {
      const completed = summariseInternalBrainRun(inProgress, accumulatedResults)
      updateEvaluationRun(runId, completed)
      await persistEvaluationRun(completed)
      assertCompletedEvaluationRunSaved(completed)
      return completed
    }
  }

  throw new EvaluationRunError('Internal brain evaluation exceeded maximum process retries.', run)
}

export async function executeEvaluationRun(
  options: EvaluationRunOptions = {},
  callbacks: InternalBrainRunCallbacks = {}
): Promise<OrbEvaluationRun> {
  const mode = options.mode ?? 'live-llm'
  const packType = options.packType ?? 'standard'

  if (mode === 'internal-brain') {
    return executeInternalBrainEvaluationRun(options, callbacks)
  }

  let scenarios = getEvaluationScenarios()

  if (options.scenarioIds?.length) {
    const wanted = new Set(options.scenarioIds)
    scenarios = scenarios.filter((s) => wanted.has(s.id))
  } else if (scenarios.length === 0) {
    scenarios = generateScenarioPack(packType)
  }

  if (options.limit) scenarios = scenarios.slice(0, options.limit)

  const runId = newRunId()
  const startedAt = new Date().toISOString()
  const pendingRun: OrbEvaluationRun = {
    id: runId,
    mode,
    status: 'running',
    scenarioCount: scenarios.length,
    completedCount: 0,
    passRate: 0,
    averageScore: 0,
    criticalFailures: 0,
    startedAt,
    createdBy: options.createdBy ?? 'founder',
    summary: 'Running…',
    title: options.title ?? `ORB Evaluation — ${packType}`,
    packType,
    limitations: [],
    scoringVersion: mode === 'live-llm' ? LIVE_LLM_GUARDED_SCORING_VERSION_V4 : undefined
  }
  addEvaluationRun(pendingRun)

  const evalResults: OrbEvaluationResult[] = []

  const abortPendingRun = (error: unknown): never => {
    if (pendingRun.status === 'running') {
      removeEvaluationRun(runId)
    }
    throw error
  }

  if (mode === 'template') {
    for (const scenario of scenarios) {
      const answer = buildTemplateAnswer(scenario)
      const { result } = scoreOrbEvaluationAnswer({
        scenario,
        answer,
        runId,
        mode: 'template'
      })
      evalResults.push({ ...result, createdAt: new Date().toISOString() })
    }
  } else {
    let backend: BackendRunResponse
    try {
      backend = await callBackendRun(scenarios, options)
    } catch (error) {
      if (isEvaluationCsrfError(error)) {
        abortPendingRun(error)
      }
      throw error
    }

    if (backend.error && backend.scenario_count === 0) {
      const failed: OrbEvaluationRun = {
        ...pendingRun,
        status: 'failed',
        completedAt: new Date().toISOString(),
        summary: backend.error,
        limitations: backend.limitations ?? [],
        liveLlmAvailable: backend.live_llm_available
      }
      updateEvaluationRun(runId, failed)
      throw new EvaluationRunError(backend.error, failed)
    }

    const scenarioMap = new Map(scenarios.map((s) => [s.id, s]))
    for (const item of backend.scenario_results) {
      const scenario = scenarioMap.get(item.scenario_id)
      if (!scenario) continue
      const guardrailMeta = item.live_guardrail ?? {}
      const scoringAnswer = String(
        guardrailMeta.scoring_answer ?? guardrailMeta.final_answer ?? item.answer ?? ''
      )
      const finalAnswer = String(guardrailMeta.final_answer ?? item.answer ?? scoringAnswer)
      const answerSource = item.live_guardrail?.answer_source as
        | 'raw'
        | 'repaired'
        | 'fallback'
        | 'privacy_block'
        | 'safety_firewall'
        | undefined
      const { result: scored } = scoreOrbEvaluationAnswer({
        scenario,
        answer: scoringAnswer,
        runId,
        mode: 'live-llm',
        liveCallError: item.ok ? undefined : item.error,
        modelRoute: item.model_route,
        liveGuardrailAnswerSource: answerSource,
        safetyScaffoldCategory: item.safety_scaffold_category
      })
      const result = scored
      const liveGuardrail = item.live_guardrail
        ? {
            passed: Boolean(item.live_guardrail.guardrail_passed ?? item.live_guardrail.passed),
            missingSafeguards: (item.live_guardrail.missing_safeguards as string[]) ?? [],
            forbiddenViolations: (item.live_guardrail.forbidden_violations as string[]) ?? [],
            repairAttempted: Boolean(item.live_guardrail.repair_attempted),
            fallbackUsed: Boolean(item.live_guardrail.fallback_used),
            scaffoldCategory: String(
              item.live_guardrail.safety_scaffold_category ??
                item.live_guardrail.scaffold_category ??
                ''
            ),
            promptTier: (item.model_route?.prompt_tier as string | null) ?? null,
            expertDepth: (item.model_route?.expert_depth as string | null) ?? null,
            answerSource: item.live_guardrail.answer_source as
              | 'raw'
              | 'repaired'
              | 'fallback'
              | 'privacy_block'
              | 'safety_firewall'
              | undefined,
            openaiCalled: !(
              item.live_guardrail.safety_firewall_used ||
              item.live_guardrail.openai_called === false
            ),
            safetyFirewallUsed: Boolean(item.live_guardrail.safety_firewall_used),
            safetyFirewallReason: String(item.live_guardrail.safety_firewall_reason ?? ''),
            guardrailPassedRaw: Boolean(
              item.live_guardrail.guardrail_passed ?? item.live_guardrail.passed
            ),
            rawAnswer: String(item.live_guardrail.raw_answer ?? ''),
            finalAnswer,
            scoringAnswer,
            failReasons: (item.live_guardrail.fail_reasons as string[]) ?? [],
            minimumRequiredPhrases: (item.live_guardrail.minimum_required_phrases as string[]) ?? [],
            forbiddenPhrasesDetected: (item.live_guardrail.forbidden_phrases_detected as string[]) ?? [],
            answerUsedForScoring: scoringAnswer,
            answerUsedForDisplay: finalAnswer
          }
        : undefined
      evalResults.push({
        ...result,
        orbAnswer: finalAnswer,
        createdAt: new Date().toISOString(),
        liveGuardrail,
        safetyScaffoldCategory: item.safety_scaffold_category
      })
    }

    pendingRun.limitations = backend.limitations
    pendingRun.liveLlmAvailable = backend.live_llm_available
  }

  addEvaluationResults(evalResults)
  const completed = summariseRun(pendingRun, evalResults)
  updateEvaluationRun(runId, completed)
  await persistEvaluationRun(completed)
  assertCompletedEvaluationRunSaved(completed)
  return completed
}

export async function retestFailedScenarios(runId: string): Promise<OrbEvaluationRun | null> {
  const source = getEvaluationRun(runId)
  if (!source?.results) return null
  const failedIds = source.results.filter((r) => !r.pass || r.criticalFailure).map((r) => r.scenarioId)
  if (failedIds.length === 0) return null
  return executeEvaluationRun({
    title: `Retest — ${source.title ?? runId}`,
    mode: source.mode,
    packType: 'retest',
    scenarioIds: failedIds,
    createdBy: source.createdBy
  })
}

export function createFixFromResult(resultId: string): OrbEvaluationFixProposal | null {
  const result = getEvaluationResult(resultId)
  if (!result) return null

  const priority =
    result.criticalFailure ? 'critical' : result.scores.overall < 50 ? 'high' : 'medium'

  const proposal = addEvaluationFixProposal({
    id: `eval-fix-${resultId}`,
    resultId,
    runId: result.runId,
    scenarioId: result.scenarioId,
    title: `ORB Evaluation fix: ${result.scenarioId}`,
    description: result.issues.join('; ') || 'Evaluation failure requires review.',
    priority,
    suggestedChange: result.recommendedFix ?? 'Review ORB Residential brain prompts for this scenario family.',
    acceptanceCriteria: [
      'Re-run evaluation scenario and confirm pass',
      'No critical red team findings',
      'Local policy caveat present on high-risk scenarios'
    ],
    createdAt: new Date().toISOString(),
    createdBy: 'orb-evaluation-platform'
  })

  addQualityProposal({
    title: proposal.title,
    description: proposal.description,
    type: result.criticalFailure ? 'unsafe-pattern' : 'marker-gap',
    priority: proposal.priority,
    sourceRunId: result.runId,
    sourceScenarioId: result.scenarioId,
    suggestedChange: proposal.suggestedChange,
    acceptanceCriteria: proposal.acceptanceCriteria,
    createdBy: 'orb-evaluation-platform'
  })

  return proposal
}

export function createBuildBriefFromEvaluationResult(resultId: string): string | null {
  const proposal = createFixFromResult(resultId)
  if (!proposal) return null
  const brief = addBuildBrief({
    title: `ORB Evaluation: ${proposal.title}`,
    priority: proposal.priority,
    createdBy: 'orb-evaluation-platform',
    problem: proposal.description,
    goal: proposal.suggestedChange,
    phases: ['Review red team finding', 'Update ORB Residential brain prompts', 'Re-run evaluation pack'],
    filesLikelyAffected: [
      'services/orb_brain_convergence_orchestrator_service.py',
      'assistant/knowledge/orb_operating_brain.py',
      'frontend-next/lib/orb/evaluation/'
    ],
    acceptanceCriteria: proposal.acceptanceCriteria,
    testPlan: [
      'frontend-next/lib/orb/evaluation/orb-evaluation.test.ts',
      'Run live-llm evaluation from /founder/orb-evaluation'
    ],
    safetyNotes: ['Synthetic scenarios only — no real child data in evaluation packs.'],
    cursorPrompt: proposal.suggestedChange
  })
  return brief.id
}

export function createQualityLabCandidateFromResult(resultId: string): string | null {
  const result = getEvaluationResult(resultId)
  if (!result) return null
  addQualityProposal({
    title: `Quality Lab candidate from evaluation: ${result.scenarioId}`,
    description: `Synthetic evaluation failure — ${result.recommendedFix ?? result.issues[0] ?? 'review required'}`,
    type: 'regression',
    priority: result.criticalFailure ? 'critical' : 'high',
    sourceRunId: result.runId,
    sourceScenarioId: result.scenarioId,
    suggestedChange: 'Add curated GOLD scenario covering this synthetic evaluation failure pattern.',
    acceptanceCriteria: [
      'GOLD scenario added to expert bank',
      'Live-llm Quality Lab run passes',
      'Red team evaluation retest passes'
    ],
    createdBy: 'orb-evaluation-platform'
  })
  return result.scenarioId
}

async function persistEvaluationRun(run: OrbEvaluationRun): Promise<void> {
  try {
    await persistOrbEvaluationRun(run)
  } catch (error) {
    if (isFounderDataSourceBusyError(error)) throw error
    if (error instanceof FounderPersistenceApiError) throw error
    throw error
  }
}

export { recoverStaleInternalBrainRuns, getAnyActiveInternalBrainRun }
export {
  FOUNDER_DATA_SOURCE_BUSY_MESSAGE,
  isFounderDataSourceBusyError,
  ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE
} from '@/lib/orb/evaluation/orb-evaluation-persistence'

export function getEvaluationSummary() {
  const runs = getEvaluationRuns()
  const latest = runs.find((r) => r.status === 'completed')
  const latestInternalBrainRun = getLatestInternalBrainRun()
  const latestInternalBrainHighRiskRun = getLatestInternalBrainHighRiskRun()
  const latestLiveLlmRun = getLatestLiveLlmRun()
  const scenarios = getEvaluationScenarios()
  return {
    totalRuns: runs.length,
    latestRun: latest,
    scenarioCount: scenarios.length,
    coverage: getScenarioCoverageSummary(scenarios),
    liveRunCompleted: Boolean(latestLiveLlmRun),
    internalBrainRunCompleted: Boolean(latestInternalBrainRun),
    latestInternalBrainRun,
    latestInternalBrainHighRiskRun,
    latestLiveLlmRun,
    latestInternalBrainHighRiskFailures: latestInternalBrainHighRiskRun?.criticalFailures ?? 0,
    latestLiveLlmFailures: latestLiveLlmRun?.criticalFailures ?? 0,
    latestPassRate: latest?.passRate ?? null,
    latestCriticalFailures: latest?.criticalFailures ?? null
  }
}

export function getFindingsByType(runId?: string) {
  const items = runId ? getEvaluationResults(runId) : getEvaluationResults()
  const findings = items.flatMap((r) => r.redTeamFindings)
  const grouped: Record<string, number> = {}
  for (const f of findings) {
    grouped[f.type] = (grouped[f.type] ?? 0) + 1
  }
  return grouped
}

export function getInternalBrainSeveritySummary(runId?: string) {
  const items = runId ? getEvaluationResults(runId) : getEvaluationResults()
  const internalItems = items.filter((r) => r.answerSource === 'internal-brain')
  const summary = {
    criticalFailures: internalItems.filter((r) => r.criticalFailure).length,
    missingRequirements: 0,
    improvementOpportunities: 0,
    highSeverityMissing: 0
  }
  for (const result of internalItems) {
    const details = result.missingRequirementDetails ?? []
    summary.missingRequirements += details.filter((d) => d.severity !== 'improvement').length
    summary.improvementOpportunities += details.filter((d) => d.severity === 'improvement').length
    summary.highSeverityMissing += details.filter((d) => d.severity === 'high').length
  }
  return summary
}

export function getAgentIssueCounts(runId?: string) {
  const items = runId ? getEvaluationResults(runId) : getEvaluationResults()
  const counts: Record<string, number> = {}
  for (const result of items) {
    for (const finding of result.redTeamFindings) {
      const agent = finding.agentId ?? 'unknown'
      counts[agent] = (counts[agent] ?? 0) + 1
    }
  }
  return counts
}

export { getEvaluationRuns, getEvaluationRun, getEvaluationResults, getEvaluationScenarios, runRedTeamAgents, mergeRedTeamFindings }
