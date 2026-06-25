import {
  countRealShadowReviewEvents,
  getLabDataModeConfig,
  LAB_DATA_MODE_LABELS
} from '@/lib/indicare-lab/lab-data-mode'
import { getShadowReviewConfigSnapshot } from '@/lib/indicare-lab/review-events/review-event-config'
import type { ReviewEvent, ReviewEventSummary } from '@/lib/indicare-lab/review-events/types'
import { getMostCommonRewriteReason } from '@/lib/indicare-lab/patterns/pattern-detection-engine'
import type { LabPattern } from '@/lib/indicare-lab/patterns/types'
import type { EvaluationRunSummary } from '@/lib/indicare-lab/evaluations/types'
import { EVALUATION_RUBRIC_DIMENSION_LABELS } from '@/lib/indicare-lab/evaluations/types'
import type { LabSuggestion } from '@/lib/indicare-lab/suggestions/types'
import { isRealEvidenceSuggestion } from '@/lib/indicare-lab/suggestions/types'
import type { LabOverviewMetric } from '@/lib/indicare-lab/types'

export function buildLabOverviewMetrics(input: {
  reviewSummary: ReviewEventSummary
  reviewEvents: ReviewEvent[]
  patterns: LabPattern[]
  pendingApprovals: number
  evaluationSummary?: EvaluationRunSummary
  suggestions?: LabSuggestion[]
  investorSafeView?: boolean
}): LabOverviewMetric[] {
  const {
    reviewSummary,
    reviewEvents,
    patterns,
    pendingApprovals,
    evaluationSummary,
    suggestions = [],
    investorSafeView
  } = input

  const dataConfig = getLabDataModeConfig({ investorSafeOverride: investorSafeView })
  const shadowConfig = getShadowReviewConfigSnapshot()
  const realShadowCount = countRealShadowReviewEvents(reviewEvents)
  const realSuggestions = suggestions.filter(isRealEvidenceSuggestion)
  const realPatterns = patterns.filter((p) => !p.relatedEventIds.every((id) => id.startsWith('rev-seed-')))

  const highestRealRiskPattern = realPatterns[0] ?? patterns[0]
  const hasRealData = realShadowCount > 0 || realSuggestions.length > 0

  const brainQualityValue = (() => {
    if (hasRealData && evaluationSummary?.latestOverallScore) {
      return `${Math.round(evaluationSummary.latestOverallScore * 20)} / 100`
    }
    if (hasRealData) {
      return 'Awaiting benchmark re-test'
    }
    if (evaluationSummary?.latestOverallScore && evaluationSummary.completedRuns > 0) {
      return 'Synthetic benchmark score only'
    }
    return 'Awaiting real evidence'
  })()

  const brainQualityHint = (() => {
    if (hasRealData && evaluationSummary?.latestOverallScore) {
      return 'Combined real shadow review + synthetic benchmark context'
    }
    if (evaluationSummary?.latestOverallScore && evaluationSummary.completedRuns > 0) {
      return `Synthetic only · ${Math.round(evaluationSummary.latestOverallScore * 20)}/100 from latest internal benchmark`
    }
    return 'No fake Brain Quality Index — real shadow review evidence required'
  })()

  const mostCommonRewrite =
    realShadowCount > 0
      ? getMostCommonRewriteReason(reviewEvents.filter((e) => e.origin === 'shadow-review'))
      : getMostCommonRewriteReason(reviewEvents)

  return [
    {
      id: 'lab-data-mode',
      label: 'Lab data mode',
      value: LAB_DATA_MODE_LABELS[dataConfig.mode],
      hint: dataConfig.investorSafeView
        ? 'Investor-safe view · Demo data hidden'
        : dataConfig.isDevelopment
          ? 'Development · Mixed internal data allowed'
          : 'Production founder mode · Real evidence default',
      tone: 'cyan'
    },
    {
      id: 'real-shadow-events',
      label: 'Real shadow review events',
      value: String(realShadowCount),
      hint: 'Redacted ORB shadow review evidence only',
      tone: realShadowCount > 0 ? 'cyan' : 'amber'
    },
    {
      id: 'founder-attention',
      label: 'Founder attention items',
      value: String(reviewSummary.needsFounderAttention),
      hint: 'Rewrite, blocked, or needs founder review',
      tone: 'amber'
    },
    {
      id: 'evidence-suggestions',
      label: 'Evidence-based suggestions',
      value: String(realSuggestions.length),
      hint: `${suggestions.length} total · ${suggestions.length - realSuggestions.length} synthetic benchmark`,
      tone: realSuggestions.length > 0 ? 'violet' : 'amber'
    },
    {
      id: 'recurring-patterns',
      label: 'Real patterns detected',
      value: String(realPatterns.length),
      hint: `${patterns.length} total patterns · Internal evaluation`,
      tone: 'violet'
    },
    {
      id: 'highest-real-risk',
      label: 'Highest real risk',
      value: highestRealRiskPattern && realPatterns.length > 0
        ? highestRealRiskPattern.title.slice(0, 40) +
          (highestRealRiskPattern.title.length > 40 ? '…' : '')
        : realShadowCount > 0
          ? 'See shadow events'
          : 'None yet',
      hint: highestRealRiskPattern && realPatterns.length > 0
        ? `${highestRealRiskPattern.riskLevel} risk`
        : 'No real pattern evidence yet',
      tone: 'rose'
    },
    {
      id: 'common-rewrite-reason',
      label: 'Most common rewrite reason',
      value: mostCommonRewrite
        ? mostCommonRewrite.slice(0, 50) + (mostCommonRewrite.length > 50 ? '…' : '')
        : 'None yet',
      hint: realShadowCount > 0 ? 'From real shadow review events' : 'No real rewrite data yet',
      tone: 'emerald'
    },
    {
      id: 'shadow-review-status',
      label: 'Shadow review status',
      value: shadowConfig.enabled ? 'Enabled' : 'Disabled',
      hint: shadowConfig.enabled
        ? `Shadow only · Redacted${shadowConfig.redactNames ? '' : ' (names off)'}`
        : 'Shadow review off · No live blocking',
      tone: shadowConfig.enabled ? 'cyan' : 'amber'
    },
    {
      id: 'production-auto-deploy',
      label: 'Production auto-deploy',
      value: 'Off',
      hint: 'No automatic prompt or brain changes',
      tone: 'emerald'
    },
    {
      id: 'brain-quality',
      label: 'Brain quality index',
      value: brainQualityValue,
      hint: brainQualityHint,
      tone: hasRealData ? 'cyan' : 'amber'
    },
    {
      id: 'benchmark-scenarios',
      label: 'Synthetic benchmark scenarios',
      value: String(evaluationSummary?.scenarioCount ?? 0),
      hint: 'Internal synthetic benchmarks · Not expert validation',
      tone: 'cyan'
    },
    {
      id: 'failed-high-risk-benchmarks',
      label: 'Failed high-risk scenarios',
      value: String(evaluationSummary?.failedHighRiskScenarios ?? 0),
      hint: 'Synthetic benchmark failures only',
      tone: evaluationSummary?.failedHighRiskScenarios ? 'rose' : 'emerald'
    },
    {
      id: 'common-weak-dimension',
      label: 'Common weak dimension',
      value: evaluationSummary?.commonWeakDimension
        ? EVALUATION_RUBRIC_DIMENSION_LABELS[evaluationSummary.commonWeakDimension]
        : 'None yet',
      hint: 'Across completed synthetic benchmark runs',
      tone: 'violet'
    },
    {
      id: 'comparison-tests',
      label: 'Comparison tests run',
      value: String(evaluationSummary?.comparisonRuns ?? 0),
      hint: 'Synthetic current vs proposed evaluations',
      tone: 'emerald'
    }
  ]
}

export function buildEvidenceOfImprovementCounts(input: {
  reviewEvents: ReviewEvent[]
  patterns: LabPattern[]
  evaluationSummary?: EvaluationRunSummary
  suggestions: LabSuggestion[]
  buildBriefsFromEvidence: number
  founderDecisions: number
}): {
  realShadowReviewEvents: number
  syntheticBenchmarkScenarios: number
  benchmarkRunsCompleted: number
  failedHighRiskBenchmarks: number
  realPatternsDetected: number
  evidenceBasedSuggestions: number
  buildBriefsFromEvidence: number
  founderDecisions: number
  productionChangesAutoDeployed: number
} {
  const realPatterns = input.patterns.filter(
    (p) => !p.relatedEventIds.every((id) => id.startsWith('rev-seed-'))
  )

  return {
    realShadowReviewEvents: countRealShadowReviewEvents(input.reviewEvents),
    syntheticBenchmarkScenarios: input.evaluationSummary?.scenarioCount ?? 0,
    benchmarkRunsCompleted: input.evaluationSummary?.completedRuns ?? 0,
    failedHighRiskBenchmarks: input.evaluationSummary?.failedHighRiskScenarios ?? 0,
    realPatternsDetected: realPatterns.length,
    evidenceBasedSuggestions: input.suggestions.filter(isRealEvidenceSuggestion).length,
    buildBriefsFromEvidence: input.buildBriefsFromEvidence,
    founderDecisions: input.founderDecisions,
    productionChangesAutoDeployed: 0
  }
}
