import { addBuildBrief } from '@/lib/founder/build-briefs/build-brief-store'
import { addQualityProposal } from '@/lib/founder/quality-lab/quality-proposal-store'
import { founderPost } from '@/lib/founder/api/founder-api-client'

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
  setEvaluationScenarios,
  updateEvaluationRun
} from './orb-evaluation-store'
import { buildTemplateAnswer, scoreOrbEvaluationAnswer } from './orb-evaluation-scoring-engine'
import { mergeRedTeamFindings, runRedTeamAgents } from './red-team-agents'

type BackendRunResponse = {
  run_id: string
  title: string
  mode: OrbEvaluationRunMode
  status: 'completed' | 'failed'
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
  }>
  limitations?: string[]
  error?: string
}

export type EvaluationRunOptions = {
  title?: string
  mode?: OrbEvaluationRunMode
  packType?: OrbEvaluationRun['packType']
  limit?: number
  scenarioIds?: string[]
  createdBy?: string
}

function newRunId(): string {
  return `eval-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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

  return {
    ...run,
    status: 'completed',
    completedCount: evalResults.length,
    passRate,
    averageScore,
    criticalFailures,
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
): Promise<BackendRunResponse | null> {
  try {
    const response = await fetch('/api/orb/evaluation/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: options.title,
        mode: options.mode ?? 'live-llm',
        pack_type: options.packType ?? 'standard',
        scenarios,
        limit: options.limit ?? scenarios.length,
        created_by: options.createdBy ?? 'founder'
      })
    })
    if (!response.ok) return null
    const payload = await response.json()
    return (payload?.data ?? payload) as BackendRunResponse
  } catch {
    return null
  }
}

export async function executeEvaluationRun(options: EvaluationRunOptions = {}): Promise<OrbEvaluationRun> {
  const mode = options.mode ?? 'live-llm'
  const packType = options.packType ?? 'standard'
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
    limitations: []
  }
  addEvaluationRun(pendingRun)

  const evalResults: OrbEvaluationResult[] = []

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
    const backend = await callBackendRun(scenarios, options)
    if (!backend) {
      const failed: OrbEvaluationRun = {
        ...pendingRun,
        status: 'failed',
        completedAt: new Date().toISOString(),
        summary: 'Live LLM evaluation unavailable — no results fabricated.',
        limitations: ['Backend evaluation runner unavailable or OPENAI_API_KEY missing.'],
        liveLlmAvailable: false
      }
      updateEvaluationRun(runId, failed)
      return failed
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
      return failed
    }

    const scenarioMap = new Map(scenarios.map((s) => [s.id, s]))
    for (const item of backend.scenario_results) {
      const scenario = scenarioMap.get(item.scenario_id)
      if (!scenario) continue
      const { result } = scoreOrbEvaluationAnswer({
        scenario,
        answer: item.answer,
        runId,
        mode: 'live-llm',
        liveCallError: item.ok ? undefined : item.error,
        modelRoute: item.model_route
      })
      evalResults.push({ ...result, createdAt: new Date().toISOString() })
    }

    pendingRun.limitations = backend.limitations
    pendingRun.liveLlmAvailable = backend.live_llm_available
  }

  addEvaluationResults(evalResults)
  const completed = summariseRun(pendingRun, evalResults)
  updateEvaluationRun(runId, completed)
  void persistEvaluationRun(completed).catch(() => undefined)
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
    await founderPost('/quality-lab/runs', {
      entity: 'orb-evaluation-run',
      run
    })
  } catch {
    // Best-effort persistence
  }
}

export function getEvaluationSummary() {
  const runs = getEvaluationRuns()
  const latest = runs.find((r) => r.status === 'completed')
  const scenarios = getEvaluationScenarios()
  return {
    totalRuns: runs.length,
    latestRun: latest,
    scenarioCount: scenarios.length,
    coverage: getScenarioCoverageSummary(scenarios),
    liveRunCompleted: runs.some((r) => r.status === 'completed' && r.mode === 'live-llm'),
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
