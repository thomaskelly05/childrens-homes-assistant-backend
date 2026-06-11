import type { EvaluationRunsPayload, EvaluationScenariosPayload } from './orb-evaluation-types'

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

async function parseEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>
  if (!response.ok) {
    throw new Error(payload.error ?? `Evaluation API error (${response.status})`)
  }
  if (payload.data !== undefined) {
    return payload.data
  }
  return payload as T
}

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

export async function fetchEvaluationRuns(): Promise<EvaluationRunsPayload> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = csrfToken()
  if (token) headers['X-CSRF-Token'] = token

  const response = await fetch('/api/orb/evaluation/runs', {
    method: 'GET',
    credentials: 'include',
    headers
  })
  return parseEnvelope<EvaluationRunsPayload>(response)
}

export async function fetchEvaluationScenarios(): Promise<EvaluationScenariosPayload> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = csrfToken()
  if (token) headers['X-CSRF-Token'] = token

  const response = await fetch('/api/orb/evaluation/scenarios', {
    method: 'GET',
    credentials: 'include',
    headers
  })
  return parseEnvelope<EvaluationScenariosPayload>(response)
}

export async function postEvaluationRun(body: Record<string, unknown>): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  const token = csrfToken()
  if (token) headers['X-CSRF-Token'] = token

  const response = await fetch('/api/orb/evaluation/runs', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body)
  })
  return parseEnvelope<unknown>(response)
}
