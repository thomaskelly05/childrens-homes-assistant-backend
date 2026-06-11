import {
  FounderPersistenceApiError,
  founderGet,
  founderPatch,
  founderPost,
  type FounderApiResult
} from '@/lib/founder/api/founder-api-client'

import type { OrbEvaluationRun } from './orb-evaluation-types'

export const FOUNDER_DATA_SOURCE_BUSY_CODE = 'founder_data_source_busy'
export const FOUNDER_DATA_SOURCE_BUSY_MESSAGE =
  'Founder data source is busy. Please wait a moment and try again.'

export const ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE =
  'Another internal-brain evaluation is still running.'

export const STALE_RUN_INTERRUPTED_MESSAGE =
  'Previous run was interrupted and marked as incomplete.'

const PERSISTENCE_PATH = '/persistence/orb-evaluation-runs'
const RETRY_DELAYS_MS = [250, 500, 1000] as const
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1

const persistedRunIds = new Set<string>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isTransientFounderBusyStatus(status: number): boolean {
  return status === 409 || status === 423 || status === 429 || status === 503 || status >= 500
}

export function isTransientFounderBusyError(error: unknown): boolean {
  if (error instanceof FounderPersistenceApiError) {
    return isTransientFounderBusyStatus(error.status)
  }
  if (error instanceof Error) {
    return error.message === FOUNDER_DATA_SOURCE_BUSY_MESSAGE
  }
  return false
}

export function isFounderDataSourceBusyError(error: unknown): boolean {
  if (error instanceof FounderPersistenceApiError) {
    return (
      error.message === FOUNDER_DATA_SOURCE_BUSY_MESSAGE ||
      (error as FounderPersistenceApiError & { code?: string }).code === FOUNDER_DATA_SOURCE_BUSY_CODE
    )
  }
  if (error instanceof Error) {
    return (
      error.message === FOUNDER_DATA_SOURCE_BUSY_MESSAGE ||
      error.message.includes(FOUNDER_DATA_SOURCE_BUSY_MESSAGE)
    )
  }
  return false
}

export function isActiveInternalBrainRunError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(ACTIVE_INTERNAL_BRAIN_RUN_MESSAGE)
}

function logPersistenceRetry(operation: string, attempt: number, delayMs: number, status: number): void {
  if (process.env.NODE_ENV === 'development') {
    console.info('[orb-evaluation-persistence] retry', { operation, attempt, delayMs, status })
  }
}

async function withFounderPersistenceRetry<T>(
  operation: string,
  request: () => Promise<FounderApiResult<T>>
): Promise<FounderApiResult<T>> {
  let last: FounderApiResult<T> | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    last = await request()
    if (last.ok) return last

    const retryable =
      isTransientFounderBusyStatus(last.status) &&
      last.status !== 401 &&
      last.status !== 403 &&
      last.status !== 400 &&
      last.status !== 404

    if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
      return last
    }

    const delayMs = RETRY_DELAYS_MS[attempt] ?? 1000
    logPersistenceRetry(operation, attempt + 1, delayMs, last.status)
    await sleep(delayMs)
  }

  return last ?? { ok: false, status: 503, error: FOUNDER_DATA_SOURCE_BUSY_MESSAGE }
}

function busyErrorFromResult(result: FounderApiResult<unknown>): FounderPersistenceApiError {
  return new FounderPersistenceApiError(
    result.status,
    FOUNDER_DATA_SOURCE_BUSY_MESSAGE,
    FOUNDER_DATA_SOURCE_BUSY_CODE
  )
}

function buildPersistenceRecord(run: OrbEvaluationRun): Record<string, unknown> {
  return {
    id: run.id,
    status: run.status,
    run
  }
}

export function markOrbEvaluationRunPersisted(runId: string): void {
  persistedRunIds.add(runId)
}

export function clearOrbEvaluationPersistenceState(): void {
  persistedRunIds.clear()
}

/** @internal test helper */
export function __orbEvaluationPersistenceTestState() {
  return { persistedRunIds: new Set(persistedRunIds) }
}

export async function persistOrbEvaluationRun(run: OrbEvaluationRun): Promise<void> {
  const record = buildPersistenceRecord(run)
  const source = 'orb-evaluation-platform'
  const useUpdate = persistedRunIds.has(run.id)

  const attemptPersist = async (): Promise<FounderApiResult<unknown>> => {
    if (useUpdate) {
      return withFounderPersistenceRetry('patch-run', () =>
        founderPatch(`/persistence/orb-evaluation-runs/${encodeURIComponent(run.id)}`, {
          patch: record,
          status: run.status
        })
      )
    }

    const created = await withFounderPersistenceRetry('create-run', () =>
      founderPost(PERSISTENCE_PATH, { record, source })
    )
    if (created.ok) {
      persistedRunIds.add(run.id)
      return created
    }

    if (created.status === 409 || created.status >= 500) {
      persistedRunIds.add(run.id)
      const updated = await withFounderPersistenceRetry('create-fallback-patch', () =>
        founderPatch(`/persistence/orb-evaluation-runs/${encodeURIComponent(run.id)}`, {
          patch: record,
          status: run.status
        })
      )
      return updated
    }

    return created
  }

  const result = await attemptPersist()
  if (!result.ok) {
    if (isTransientFounderBusyStatus(result.status)) {
      throw busyErrorFromResult(result)
    }
    throw new FounderPersistenceApiError(
      result.status,
      result.error || 'Evaluation run could not be saved.'
    )
  }

  persistedRunIds.add(run.id)
}

export async function fetchOrbEvaluationRunsWithRetry(): Promise<OrbEvaluationRun[]> {
  const result = await withFounderPersistenceRetry('list-runs', () =>
    founderGet<{ items: unknown[]; count: number }>(PERSISTENCE_PATH)
  )

  if (!result.ok) {
    if (isTransientFounderBusyStatus(result.status)) {
      throw busyErrorFromResult(result)
    }
    throw new FounderPersistenceApiError(result.status, result.error || 'Could not load evaluation runs.')
  }

  const items = result.data.items ?? []
  const runs: OrbEvaluationRun[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const record = (item as { record?: unknown }).record ?? item
    if (!record || typeof record !== 'object') continue
    const run = (record as { run?: OrbEvaluationRun }).run ?? (record as OrbEvaluationRun)
    if (run && typeof run === 'object' && 'id' in run) {
      runs.push(run)
      persistedRunIds.add(run.id)
    }
  }

  return runs.sort((a, b) => {
    const aTime = a.completedAt ?? a.startedAt
    const bTime = b.completedAt ?? b.startedAt
    return bTime.localeCompare(aTime)
  })
}
