import { FounderPersistenceApiError, founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import type { QualityRunMode } from './quality-lab-types'

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
  live_llm_available?: boolean
  default_run_mode?: QualityRunMode
  coverage?: {
    whistleblowing_covered?: boolean
    missing_topics?: string[]
    coverage_complete?: boolean
  }
}

export type OrbQualityLabRunApiResponse = {
  run_id: string
  title: string
  scenario_count: number
  passed: number
  failed: number
  pass_rate: number
  run_mode: QualityRunMode
  route_call_skipped: boolean
  live_llm_available: boolean
  model_route_used?: string | null
  critical_failures: number
  pending_human_reviews: number
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
    answer_source: 'sample-template' | 'manual-paste' | 'live-orb' | 'live-llm'
    answer_excerpt: string
    generated_answer?: string
    run_mode?: QualityRunMode
    critical_failure?: boolean
    critical_failure_reasons?: string[]
    requires_human_review?: boolean
    scoring_breakdown?: Record<string, number> | null
    human_review?: {
      review_status?: string
      reviewer?: string | null
      review_notes?: string
      reviewed_at?: string | null
      reviewer_decision?: string | null
      required_fix?: string | null
    } | null
    live_call_error?: string | null
    model_route?: Record<string, string | null | undefined> | null
    retest_of_scenario_id?: string | null
  }>
  limitations: string[]
  coverage?: {
    whistleblowing_covered?: boolean
    missing_topics?: string[]
  }
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
  scoring_breakdown?: Record<string, number>
  critical_failure?: boolean
  critical_failure_reasons?: string[]
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
  scenarioIds?: string[]
  limit?: number
  useSampleAnswers?: boolean
  runMode?: QualityRunMode
}) {
  const body: Record<string, unknown> = {
    title: input.title,
    family: input.family,
    role: input.role,
    scenario_ids: input.scenarioIds,
    limit: input.limit ?? 20,
    run_mode: input.runMode ?? 'live-llm'
  }
  if (input.useSampleAnswers !== undefined) {
    body.use_sample_answers = input.useSampleAnswers
  }

  const result = await founderPost<OrbQualityLabRunApiResponse>(ORB_QUALITY_LAB_API_PATHS.runs, body)
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
