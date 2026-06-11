import { applyCsrfHeaders } from '@/lib/auth/api'
import {
  csrfFailureMessage,
  EVALUATION_CSRF_REFRESH_MESSAGE,
  isCsrfFailedPayload
} from '@/lib/security/csrf-client'

import {
  EvaluationInfrastructureError,
  isHtmlErrorBody,
  mapEvaluationInfrastructureError
} from './orb-evaluation-infrastructure-errors.ts'
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
  retryable?: boolean
  retryAfterMs?: number

  constructor(
    status: number,
    message: string,
    code?: string,
    options?: { retryable?: boolean; retryAfterMs?: number }
  ) {
    super(message)
    this.name = 'EvaluationApiError'
    this.status = status
    this.code = code
    this.retryable = options?.retryable
    this.retryAfterMs = options?.retryAfterMs
  }
}

export function isEvaluationProcessBusyError(error: unknown): boolean {
  return error instanceof EvaluationApiError && error.code === 'busy' && error.retryable === true
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
  const rawText = await response.text().catch(() => '')
  let payload = {} as ApiEnvelope<T> & {
    retryable?: boolean
    retryAfterMs?: number
    retry_after_ms?: number
  }
  if (rawText.trim()) {
    try {
      payload = JSON.parse(rawText) as typeof payload
    } catch {
      if (!response.ok) {
        const mapped = mapEvaluationInfrastructureError(rawText, response.status)
        throw new EvaluationInfrastructureError(mapped.message, mapped.code)
      }
      throw new EvaluationApiError(response.status, 'Evaluation API returned invalid JSON')
    }
  }

  if (!response.ok) {
    if (isCsrfFailedPayload(payload)) {
      throw new EvaluationApiError(403, csrfFailureMessage(payload), 'csrf_failed')
    }
    const retryAfterMs = Number(payload.retryAfterMs ?? payload.retry_after_ms ?? 0) || undefined
    const rawMessage =
      payload.error ??
      payload.message ??
      (typeof payload.detail === 'string' ? payload.detail : '') ??
      rawText
    const mapped = mapEvaluationInfrastructureError(String(rawMessage || ''), response.status)
    if (isHtmlErrorBody(String(rawMessage || rawText))) {
      throw new EvaluationInfrastructureError(mapped.message, mapped.code)
    }
    throw new EvaluationApiError(
      response.status,
      mapped.message || `Evaluation API error (${response.status})`,
      payload.code ?? mapped.code,
      {
        retryable: payload.retryable === true || payload.code === 'busy',
        retryAfterMs
      }
    )
  }
  if (payload.success === false) {
    return payload as T
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
  success?: boolean
  code?: string
  retryable?: boolean
  retryAfterMs?: number
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

const PROCESS_RETRY_DELAYS_MS = [250, 500, 1000] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function postEvaluationRunProcess(runId: string): Promise<EvaluationProcessPayload> {
  let lastError: unknown

  for (let attempt = 0; attempt <= PROCESS_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const data = await evaluationFetch<Record<string, unknown>>(
        `/api/orb/evaluation/runs/${encodeURIComponent(runId)}/process`,
        { method: 'POST', body: JSON.stringify({}) }
      )

      if (data.success === false && data.code === 'busy' && data.retryable === true) {
        const retryAfterMs = Number(data.retryAfterMs ?? data.retry_after_ms ?? 1000)
        if (attempt < PROCESS_RETRY_DELAYS_MS.length) {
          await sleep(retryAfterMs > 0 ? retryAfterMs : PROCESS_RETRY_DELAYS_MS[attempt] ?? 1000)
          continue
        }
        throw new EvaluationApiError(503, 'Process batch temporarily busy', 'busy', {
          retryable: true,
          retryAfterMs
        })
      }

      return {
        runId: String(data.run_id ?? data.runId ?? runId),
        status: (data.status as EvaluationProcessPayload['status']) ?? 'failed',
        completedCount: Number(data.completed_count ?? data.completedCount ?? 0),
        scenarioCount: Number(data.scenario_count ?? data.scenarioCount ?? 0),
        criticalFailures: Number(data.critical_failures ?? data.criticalFailures ?? 0),
        nextBatchAvailable: Boolean(data.next_batch_available ?? data.nextBatchAvailable),
        batchResults: (data.batch_results ?? data.batchResults ?? []) as EvaluationProcessPayload['batchResults'],
        error: typeof data.error === 'string' ? data.error : undefined,
        success: data.success !== false,
        code: typeof data.code === 'string' ? data.code : undefined,
        retryable: data.retryable === true,
        retryAfterMs: Number(data.retryAfterMs ?? data.retry_after_ms ?? 0) || undefined
      }
    } catch (error) {
      lastError = error
      if (isEvaluationCsrfError(error)) throw error
      if (isEvaluationProcessBusyError(error) && attempt < PROCESS_RETRY_DELAYS_MS.length) {
        const retryAfterMs =
          error instanceof EvaluationApiError && error.retryAfterMs ?
            error.retryAfterMs
          : PROCESS_RETRY_DELAYS_MS[attempt] ?? 1000
        await sleep(retryAfterMs)
        continue
      }
      throw error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Process request failed')
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
