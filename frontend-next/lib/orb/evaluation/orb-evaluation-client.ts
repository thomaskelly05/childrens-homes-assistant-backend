import {
  buildUnsafeMethodHeaders,
  csrfFailureMessage,
  EVALUATION_CSRF_REFRESH_MESSAGE,
  getCsrfToken,
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

function assertCsrfBeforePost(): void {
  if (typeof document === 'undefined') return
  if (!getCsrfToken()) {
    throw new EvaluationApiError(403, EVALUATION_CSRF_REFRESH_MESSAGE, 'csrf_failed')
  }
}

async function evaluationFetch<T>(
  path: string,
  init: RequestInit & { method?: string }
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers =
    method === 'GET' || method === 'HEAD'
      ? { Accept: 'application/json', ...(init.headers as Record<string, string> | undefined) }
      : buildUnsafeMethodHeaders(method, init.headers as Record<string, string> | undefined)

  if (method !== 'GET' && method !== 'HEAD') {
    assertCsrfBeforePost()
  }

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
