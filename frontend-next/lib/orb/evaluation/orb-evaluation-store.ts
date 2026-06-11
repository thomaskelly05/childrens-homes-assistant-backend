import type {
  OrbEvaluationFixProposal,
  OrbEvaluationResult,
  OrbEvaluationRun,
  OrbEvaluationScenario
} from './orb-evaluation-types'

const scenarios: OrbEvaluationScenario[] = []
const runs: OrbEvaluationRun[] = []
const results: OrbEvaluationResult[] = []
const fixProposals: OrbEvaluationFixProposal[] = []

export function getEvaluationScenarios(): OrbEvaluationScenario[] {
  return [...scenarios]
}

export function setEvaluationScenarios(items: OrbEvaluationScenario[]): OrbEvaluationScenario[] {
  scenarios.length = 0
  scenarios.push(...items)
  return getEvaluationScenarios()
}

export function addEvaluationScenarios(items: OrbEvaluationScenario[]): OrbEvaluationScenario[] {
  scenarios.push(...items)
  return getEvaluationScenarios()
}

export function getEvaluationRuns(): OrbEvaluationRun[] {
  return [...runs].sort((a, b) => {
    const aTime = a.completedAt ?? a.startedAt
    const bTime = b.completedAt ?? b.startedAt
    return bTime.localeCompare(aTime)
  })
}

export function getEvaluationRun(runId: string): OrbEvaluationRun | undefined {
  return runs.find((run) => run.id === runId)
}

export function addEvaluationRun(run: OrbEvaluationRun): OrbEvaluationRun {
  runs.unshift(run)
  return run
}

export function updateEvaluationRun(runId: string, patch: Partial<OrbEvaluationRun>): OrbEvaluationRun | undefined {
  const index = runs.findIndex((run) => run.id === runId)
  if (index < 0) return undefined
  runs[index] = { ...runs[index]!, ...patch }
  return runs[index]
}

export function removeEvaluationRun(runId: string): boolean {
  const index = runs.findIndex((run) => run.id === runId)
  if (index < 0) return false
  runs.splice(index, 1)
  return true
}

export function getEvaluationResults(runId?: string): OrbEvaluationResult[] {
  const items = runId ? results.filter((r) => r.runId === runId) : results
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getEvaluationResult(resultId: string): OrbEvaluationResult | undefined {
  return results.find((r) => r.id === resultId)
}

export function addEvaluationResults(items: OrbEvaluationResult[]): OrbEvaluationResult[] {
  results.push(...items)
  return items
}

export function getEvaluationFixProposals(): OrbEvaluationFixProposal[] {
  return [...fixProposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addEvaluationFixProposal(proposal: OrbEvaluationFixProposal): OrbEvaluationFixProposal {
  fixProposals.unshift(proposal)
  return proposal
}

export function hydrateEvaluationStore(payload: {
  scenarios?: OrbEvaluationScenario[]
  runs?: OrbEvaluationRun[]
  results?: OrbEvaluationResult[]
  fixProposals?: OrbEvaluationFixProposal[]
}): void {
  if (payload.scenarios) setEvaluationScenarios(payload.scenarios)
  if (payload.runs) {
    runs.length = 0
    runs.push(...payload.runs)
  }
  if (payload.results) {
    results.length = 0
    results.push(...payload.results)
  }
  if (payload.fixProposals) {
    fixProposals.length = 0
    fixProposals.push(...payload.fixProposals)
  }
}

export function getLatestEvaluationRun(
  mode?: 'live-llm' | 'internal-brain' | 'template'
): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) => run.status === 'completed' && (!mode || run.mode === mode)
  )
}

export function getLatestHighRiskEvaluationRun(): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) =>
      run.status === 'completed' &&
      run.mode === 'live-llm' &&
      (run.packType === 'high-risk' || run.packType === 'adversarial')
  )
}

export function getLatestInternalBrainRun(
  packType?: 'high-risk' | 'adversarial'
): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) =>
      run.status === 'completed' &&
      run.mode === 'internal-brain' &&
      (!packType || run.packType === packType)
  )
}

export function getLatestInternalBrainHighRiskRun(): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) =>
      run.status === 'completed' &&
      run.mode === 'internal-brain' &&
      run.packType === 'high-risk'
  )
}

export function getActiveInternalBrainRun(
  packType?: NonNullable<OrbEvaluationRun['packType']>
): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) =>
      run.mode === 'internal-brain' &&
      (run.status === 'queued' || run.status === 'running') &&
      (!packType || run.packType === packType)
  )
}

export function getAnyActiveInternalBrainRun(): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) =>
      run.mode === 'internal-brain' && (run.status === 'queued' || run.status === 'running')
  )
}

const STALE_RUN_THRESHOLD_MS = 10 * 60 * 1000

export function recoverStaleInternalBrainRuns(
  nowMs: number = Date.now()
): OrbEvaluationRun[] {
  const recovered: OrbEvaluationRun[] = []
  for (const run of getEvaluationRuns()) {
    if (run.mode !== 'internal-brain') continue
    if (run.status !== 'queued' && run.status !== 'running') continue
    const updatedAt = run.completedAt ?? run.startedAt
    const ageMs = nowMs - Date.parse(updatedAt)
    if (!Number.isFinite(ageMs) || ageMs < STALE_RUN_THRESHOLD_MS) continue
    const interrupted: OrbEvaluationRun = {
      ...run,
      status: 'interrupted',
      completedAt: new Date(nowMs).toISOString(),
      summary:
        run.summary?.includes('interrupted') ?
          run.summary
        : `Interrupted — ${run.completedCount}/${run.scenarioCount} completed before timeout`
    }
    updateEvaluationRun(run.id, interrupted)
    recovered.push(interrupted)
  }
  return recovered
}

export function getLatestInternalBrainAdversarialRun(): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find(
    (run) =>
      run.status === 'completed' &&
      run.mode === 'internal-brain' &&
      run.packType === 'adversarial'
  )
}

export function getLatestLiveLlmRun(): OrbEvaluationRun | undefined {
  return getEvaluationRuns().find((run) => run.status === 'completed' && run.mode === 'live-llm')
}
