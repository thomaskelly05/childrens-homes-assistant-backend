import { applyCsrfHeaders } from '@/lib/auth/api'
import {
  csrfFailureMessage,
  EVALUATION_CSRF_REFRESH_MESSAGE,
  isCsrfFailedPayload
} from '@/lib/security/csrf-client'

import type { EvaluationRunsPayload, EvaluationScenariosPayload, OrbEvaluationRun } from './orb-evaluation-types'

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  error?: string
  detail?: string
  message?: string
  code?: string
}

export class EvaluationApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'EvaluationApiError'
    this.status = status
    this.code = code
  }
}

export function isEvaluationCsrfError(error: unknown): boolean {
  if (error instanceof EvaluationApiError) {
    return error.code === 'csrf_failed'
  }
  if (error instanceof Error) {
    return error.message.includes('csrf_failed') || error.message === EVALUATION_CSRF_REFRESH_MESSAGE
  }
  return false
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>
  if (!response.ok) {
    if (isCsrfFailedPayload(payload)) {
      throw new EvaluationApiError(403, csrfFailureMessage(payload), 'csrf_failed')
    }
    throw new EvaluationApiError(
      response.status,
      payload.error ?? payload.message ?? `Evaluation API error (${response.status})`,
      payload.code ?? (typeof payload.detail === 'string' ? payload.detail : undefined)
    )
  }
  if (payload.data !== undefined) {
    return payload.data
  }
  return payload as T
}

function buildEvaluationHeaders(
  method: string,
  initHeaders?: HeadersInit
): Record<string, string> {
  const headers = new Headers(initHeaders)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (method !== 'GET' && method !== 'HEAD' && initHeaders && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  applyCsrfHeaders(headers, method)
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

async function evaluationFetch<T>(
  path: string,
  init: RequestInit & { method?: string }
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = buildEvaluationHeaders(method, init.headers)

  const response = await fetch(path, {
    ...init,
    method,
    credentials: 'include',
    headers
  })
  return parseEnvelope<T>(response)
}

export async function fetchEvaluationRuns(): Promise<EvaluationRunsPayload> {
  return evaluationFetch<EvaluationRunsPayload>('/api/orb/evaluation/runs', { method: 'GET' })
}

export async function fetchEvaluationScenarios(): Promise<EvaluationScenariosPayload> {
  return evaluationFetch<EvaluationScenariosPayload>('/api/orb/evaluation/scenarios', { method: 'GET' })
}

export async function postEvaluationRun(body: Record<string, unknown>): Promise<unknown> {
  return evaluationFetch<unknown>('/api/orb/evaluation/runs', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export type EvaluationProcessPayload = {
  runId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  completedCount: number
  scenarioCount: number
  criticalFailures: number
  nextBatchAvailable: boolean
  batchResults?: Array<{
    scenario_id: string
    question: string
    answer: string
    ok: boolean
    error?: string
    model_route?: Record<string, string | null | undefined>
    internal_brain?: Record<string, unknown>
  }>
  error?: string
}

export async function postEvaluationRunProcess(runId: string): Promise<EvaluationProcessPayload> {
  const data = await evaluationFetch<Record<string, unknown>>(
    `/api/orb/evaluation/runs/${encodeURIComponent(runId)}/process`,
    { method: 'POST', body: JSON.stringify({}) }
  )
  return {
    runId: String(data.run_id ?? data.runId ?? runId),
    status: (data.status as EvaluationProcessPayload['status']) ?? 'failed',
    completedCount: Number(data.completed_count ?? data.completedCount ?? 0),
    scenarioCount: Number(data.scenario_count ?? data.scenarioCount ?? 0),
    criticalFailures: Number(data.critical_failures ?? data.criticalFailures ?? 0),
    nextBatchAvailable: Boolean(data.next_batch_available ?? data.nextBatchAvailable),
    batchResults: (data.batch_results ?? data.batchResults ?? []) as EvaluationProcessPayload['batchResults'],
    error: typeof data.error === 'string' ? data.error : undefined
  }
}

export async function postEvaluationScenariosGenerate(body: {
  count?: number
  pack_type?: string
  packType?: string
}): Promise<unknown> {
  return evaluationFetch<unknown>('/api/orb/evaluation/scenarios/generate', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export async function postEvaluationRetest(
  runId: string,
  body: Record<string, unknown> = {}
): Promise<unknown> {
  return evaluationFetch<unknown>(`/api/orb/evaluation/runs/${encodeURIComponent(runId)}/retest`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export async function postEvaluationCreateFix(
  resultId: string,
  body: { createBuildBrief?: boolean } = {}
): Promise<unknown> {
  return evaluationFetch<unknown>(
    `/api/orb/evaluation/results/${encodeURIComponent(resultId)}/create-fix`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    }
  )
}

export async function fetchEvaluationRun(runId: string): Promise<{ run: OrbEvaluationRun }> {
  return evaluationFetch<{ run: OrbEvaluationRun }>(
    `/api/orb/evaluation/runs/${encodeURIComponent(runId)}`,
    { method: 'GET' }
  )
}
