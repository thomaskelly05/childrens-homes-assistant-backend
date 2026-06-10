import { FounderPersistenceApiError, founderGet, founderPost } from '@/lib/founder/api/founder-api-client'

export const ORB_QUALITY_LAB_API_PATHS = {
  overview: '/quality-lab/overview',
  scenarios: '/quality-lab/scenarios',
  runs: '/quality-lab/runs',
  evaluate: '/quality-lab/evaluate'
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

export async function fetchQualityLabOverview() {
  const result = await founderGet<OrbQualityLabOverview>(ORB_QUALITY_LAB_API_PATHS.overview)
  if (!result.ok) {
    throw new FounderPersistenceApiError(result.status, result.error)
  }
  return result.data
}

export async function runQualityLabPack(input: {
  title?: string
  family?: string
  role?: string
  limit?: number
  useSampleAnswers?: boolean
}) {
  const result = await founderPost<OrbQualityLabRunApiResponse>(ORB_QUALITY_LAB_API_PATHS.runs, {
    title: input.title,
    family: input.family,
    role: input.role,
    limit: input.limit ?? 20,
    use_sample_answers: input.useSampleAnswers ?? true
  })
  if (!result.ok) {
    throw new FounderPersistenceApiError(result.status, result.error)
  }
  return result.data
}

export async function evaluateQualityLabAnswer(scenarioId: string, answer: string) {
  const result = await founderPost<OrbQualityLabEvaluateApiResponse>(ORB_QUALITY_LAB_API_PATHS.evaluate, {
    scenario_id: scenarioId,
    answer
  })
  if (!result.ok) {
    throw new FounderPersistenceApiError(result.status, result.error)
  }
  return result.data
}
