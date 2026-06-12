import type { QualityRun, QualityRunItemResult, QualityRunStatus } from './quality-lab-types'
import { persistQualityRun } from './persistence-bridge'
import { getQualityRunsCache, prependQualityRun } from './quality-persistence-cache'

let runCounter = 0

function nextRunId(): string {
  runCounter += 1
  return `ql-run-${Date.now()}-${runCounter}`
}

export function getQualityRuns(): QualityRun[] {
  return getQualityRunsCache()
}

export function getQualityRun(id: string): QualityRun | undefined {
  return getQualityRunsCache().find((r) => r.id === id)
}

export function getLatestQualityRun(): QualityRun | undefined {
  return getQualityRunsCache()[0]
}

export function getLatestLiveQualityRun(): QualityRun | undefined {
  return getQualityRunsCache().find((run) => run.runMode === 'live-llm' && run.status === 'complete')
}

export function addQualityRun(
  partial: Omit<
    QualityRun,
    'id' | 'startedAt' | 'status' | 'passCount' | 'failCount' | 'totalCount' | 'passRate'
  > & {
    id?: string
    startedAt?: string
    status?: QualityRunStatus
    passCount?: number
    failCount?: number
    totalCount?: number
    passRate?: number
  }
): QualityRun {
  const passCount = partial.passCount ?? partial.results.filter((r) => r.passed).length
  const totalCount = partial.totalCount ?? partial.results.length
  const failCount = partial.failCount ?? totalCount - passCount
  const passRate = partial.passRate ?? (totalCount > 0 ? Math.round((passCount / totalCount) * 1000) / 10 : 0)
  const criticalFailures =
    partial.criticalFailures ?? partial.results.filter((r) => r.criticalFailure).length
  const pendingHumanReviews =
    partial.pendingHumanReviews ??
    partial.results.filter(
      (r) =>
        r.requiresHumanReview &&
        (!r.humanReview?.reviewStatus || r.humanReview.reviewStatus === 'pending-human-review')
    ).length

  const stored: QualityRun = {
    ...partial,
    id: partial.id ?? nextRunId(),
    status: partial.status ?? 'complete',
    startedAt: partial.startedAt ?? new Date().toISOString(),
    passCount,
    failCount,
    totalCount,
    passRate,
    criticalFailures,
    pendingHumanReviews,
    completedAt: partial.completedAt ?? new Date().toISOString()
  }
  prependQualityRun(stored)
  void persistQualityRun(stored).catch(() => undefined)
  if (stored.status === 'complete') {
    try {
      const { onQualityRunCompleted } = require('@/lib/founder/agents/autonomous/founder-agent-event-hooks') as typeof import('@/lib/founder/agents/autonomous/founder-agent-event-hooks')
      onQualityRunCompleted(stored)
    } catch {
      // Non-fatal.
    }
  }
  return stored
}

function mapScoringBreakdown(
  breakdown?: Record<string, number> | null
): QualityRunItemResult['scoringBreakdown'] {
  if (!breakdown) return undefined
  return {
    safeguardingAccuracy: breakdown.safeguarding_accuracy ?? 0,
    escalationAppropriateness: breakdown.escalation_appropriateness ?? 0,
    localPolicyCaveat: breakdown.local_policy_caveat ?? 0,
    therapeuticTone: breakdown.therapeutic_tone ?? 0,
    childCentredLanguage: breakdown.child_centred_language ?? 0,
    childVoice: breakdown.child_voice ?? 0,
    managementOversight: breakdown.management_oversight ?? 0,
    ofstedSccifAlignment: breakdown.ofsted_sccif_alignment ?? 0,
    practicalUsefulness: breakdown.practical_usefulness ?? 0,
    evidenceRecordingQuality: breakdown.evidence_recording_quality ?? 0,
    hallucinationRisk: breakdown.hallucination_risk ?? 0,
    completeness: breakdown.completeness ?? 0
  }
}

export function mapApiRunItem(item: {
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
  answer_source: QualityRunItemResult['answerSource']
  answer_excerpt: string
  generated_answer?: string
  run_mode?: QualityRunItemResult['runMode']
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
}): QualityRunItemResult {
  return {
    scenarioId: item.scenario_id,
    scenarioTitle: item.title,
    family: item.family,
    role: item.role,
    riskLevel: item.risk_level,
    passed: item.passed,
    score: item.score,
    missingMarkers: item.missing_markers,
    unsafePhrases: item.unsafe_phrases,
    overclaims: item.overclaims,
    notes: item.notes,
    answerSource: item.answer_source,
    answerExcerpt: item.answer_excerpt,
    generatedAnswer: item.generated_answer,
    runMode: item.run_mode,
    criticalFailure: item.critical_failure,
    criticalFailureReasons: item.critical_failure_reasons,
    requiresHumanReview: item.requires_human_review,
    scoringBreakdown: mapScoringBreakdown(item.scoring_breakdown),
    humanReview: item.human_review
      ? {
          reviewStatus: (item.human_review.review_status as QualityRunItemResult['humanReview'] extends infer H
            ? H extends { reviewStatus: infer S }
              ? S
              : never
            : never) ?? 'pending-human-review',
          reviewer: item.human_review.reviewer ?? undefined,
          reviewNotes: item.human_review.review_notes,
          reviewedAt: item.human_review.reviewed_at ?? undefined,
          reviewerDecision: item.human_review.reviewer_decision ?? undefined,
          requiredFix: item.human_review.required_fix ?? undefined
        }
      : undefined,
    liveCallError: item.live_call_error ?? undefined,
    modelRoute: item.model_route ?? undefined,
    retestOfScenarioId: item.retest_of_scenario_id ?? undefined
  }
}

export function resetQualityRunStore(): void {
  runCounter = 0
}
