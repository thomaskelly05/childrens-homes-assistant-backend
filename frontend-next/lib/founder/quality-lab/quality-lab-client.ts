import { applyCsrfHeaders, authFetchResponse, AuthApiError } from '@/lib/auth/api'

export const ORB_QUALITY_LAB_API_PATHS = {
  overview: '/orb/admin/quality-lab/overview',
  scenarios: '/orb/admin/quality-lab/scenarios',
  runs: '/orb/admin/quality-lab/runs',
  evaluate: '/orb/admin/quality-lab/evaluate'
} as const

export type OrbQualityLabOverview = {
  gold_scenario_count: number
  family_count: number
  validation_errors: string[]
  families: Array<{ id: string; label: string }>
}

export type OrbQualityLabRunApiResponse = {
  run_id: string
  title: string
  scenario_count: number
  passed: number
  failed: number
  pass_rate: number
  route_call_skipped: boolean
  validation_errors: string[]
  results: Array<{
    scenario_id: string
    title: string
    family: string
    role: string
    risk_level: string
    passed: boolean
    score: number
    missing_markers: string[]
    unsafe_phrases: string[]
    overclaims: string[]
    notes: string[]
    answer_source: 'sample-template' | 'manual-paste' | 'live-orb'
    answer_excerpt: string
  }>
  limitations: string[]
}

export type OrbQualityLabEvaluateApiResponse = {
  scenario_id: string
  title: string
  family: string
  role: string
  risk_level: string
  evaluation: {
    passed: boolean
    score: number
    missing_required_markers: string[]
    unsafe_phrases_found: string[]
    overclaiming_found: string[]
    notes: string[]
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Request failed'
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      /* ignore */
    }
    throw new AuthApiError(response.status, message)
  }
  const body = (await response.json()) as { success?: boolean; data?: T }
  return (body.data ?? body) as T
}

export async function fetchQualityLabOverview() {
  const response = await authFetchResponse(ORB_QUALITY_LAB_API_PATHS.overview, { credentials: 'include' })
  return parseResponse<OrbQualityLabOverview>(response)
}

export async function runQualityLabPack(input: {
  title?: string
  family?: string
  role?: string
  limit?: number
  useSampleAnswers?: boolean
}) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  applyCsrfHeaders(headers, 'POST')
  const response = await authFetchResponse(ORB_QUALITY_LAB_API_PATHS.runs, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      title: input.title,
      family: input.family,
      role: input.role,
      limit: input.limit ?? 20,
      use_sample_answers: input.useSampleAnswers ?? true
    })
  })
  return parseResponse<OrbQualityLabRunApiResponse>(response)
}

export async function evaluateQualityLabAnswer(scenarioId: string, answer: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  applyCsrfHeaders(headers, 'POST')
  const response = await authFetchResponse(ORB_QUALITY_LAB_API_PATHS.evaluate, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ scenario_id: scenarioId, answer })
  })
  return parseResponse<OrbQualityLabEvaluateApiResponse>(response)
}
