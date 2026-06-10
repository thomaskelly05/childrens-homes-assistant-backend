import type { FounderOperatingLoopRun } from './operating-loop-types'

let runs: FounderOperatingLoopRun[] = []
let lastRun: FounderOperatingLoopRun | null = null

export function getOperatingLoopRuns(): FounderOperatingLoopRun[] {
  return [...runs]
}

export function getLastOperatingLoopRun(): FounderOperatingLoopRun | null {
  return lastRun
}

export function getOperatingLoopRun(id: string): FounderOperatingLoopRun | undefined {
  return runs.find((run) => run.id === id)
}

export function addOperatingLoopRun(run: FounderOperatingLoopRun): void {
  runs = [run, ...runs.filter((existing) => existing.id !== run.id)]
  lastRun = run
}

export function hydrateOperatingLoopRunsFromPersistence(
  persisted: Array<{ run?: FounderOperatingLoopRun; result?: unknown }>
): void {
  const hydrated = persisted
    .map((record) => record.run ?? legacyToRun(record))
    .filter((run): run is FounderOperatingLoopRun => Boolean(run?.id))

  if (hydrated.length === 0) return
  runs = hydrated
  lastRun = hydrated[0] ?? null
}

function legacyToRun(record: { run?: FounderOperatingLoopRun; result?: unknown; id?: string; status?: string }): FounderOperatingLoopRun | null {
  if (record.run) return record.run
  const legacy = record.result as {
    startedAt?: string
    completedAt?: string
    summary?: string
    actionsGenerated?: number
    draftsGenerated?: number
    briefsGenerated?: number
    approvalsQueued?: number
  } | undefined
  if (!legacy?.startedAt) return null

  return {
    id: record.id ?? `loop-legacy-${legacy.startedAt}`,
    status: record.status === 'failed' ? 'failed' : 'completed',
    startedAt: legacy.startedAt,
    completedAt: legacy.completedAt,
    triggeredBy: 'founder',
    dataBasis: 'Legacy operating loop record',
    telemetrySummary: '—',
    qualityLabSummary: '—',
    staffAgentsRun: [],
    actionsCreated: Array.from({ length: legacy.actionsGenerated ?? 0 }, (_, index) => `legacy-action-${index + 1}`),
    approvalsCreated: Array.from({ length: legacy.approvalsQueued ?? 0 }, (_, index) => `legacy-approval-${index + 1}`),
    draftsCreated: Array.from({ length: legacy.draftsGenerated ?? 0 }, (_, index) => `legacy-draft-${index + 1}`),
    buildBriefsCreated: Array.from({ length: legacy.briefsGenerated ?? 0 }, (_, index) => `legacy-brief-${index + 1}`),
    risksIdentified: [],
    recommendedFounderDecisions: legacy.summary ? [legacy.summary] : [],
    strategicAlignment: [],
    auditLogIds: [],
    errors: []
  }
}

export function resetOperatingLoopStore(): void {
  runs = []
  lastRun = null
}
