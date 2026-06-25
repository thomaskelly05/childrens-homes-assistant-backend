import {
  isRealShadowReviewOrigin,
  isSeededDemoOrigin,
  requiresRealEvidenceForSuggestions
} from '@/lib/indicare-lab/lab-data-mode'
import type { EvaluationRun } from '@/lib/indicare-lab/evaluations/types'
import { getScenarioById } from '@/lib/indicare-lab/evaluations/evaluation-storage'
import type { LabPattern } from '@/lib/indicare-lab/patterns/types'
import {
  FOUNDER_ACTION_ELIGIBLE_STATUSES,
  REVIEW_SOURCE_LABELS,
  REVIEW_TASK_TYPE_LABELS,
  type ReviewEvent,
  type ReviewRiskLevel
} from '@/lib/indicare-lab/review-events/types'
import type { ApprovalQueueItem } from '@/lib/indicare-lab/types'
import type {
  EvidenceSource,
  EvidenceStrength,
  LabSuggestion,
  SuggestionCategory,
  SuggestionConfidence
} from '@/lib/indicare-lab/suggestions/types'
import { isRealEvidenceSuggestion } from '@/lib/indicare-lab/suggestions/types'

const RISK_RANK: Record<ReviewRiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

function nextSuggestionId(prefix: string): string {
  return `sug-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function deriveEvidenceStrength(count: number, maxRisk: ReviewRiskLevel): EvidenceStrength {
  if (count >= 3 || maxRisk === 'critical') return 'strong'
  if (count >= 2 || maxRisk === 'high') return 'moderate'
  return 'weak'
}

function deriveConfidence(strength: EvidenceStrength, isSynthetic: boolean): SuggestionConfidence {
  if (isSynthetic) {
    return strength === 'strong' ? 'medium' : 'low'
  }
  if (strength === 'strong') return 'high'
  if (strength === 'moderate') return 'medium'
  return 'low'
}

function patternAreaToCategory(area: LabPattern['area']): SuggestionCategory {
  if (area === 'commercial') return 'commercial'
  if (area === 'technology') return 'technology'
  if (area === 'ui-ux') return 'ui-ux'
  return area
}

function isEligibleEvidenceEvent(event: ReviewEvent, requireReal: boolean): boolean {
  if (requireReal && isSeededDemoOrigin(event.origin)) return false
  if (requireReal) return isRealShadowReviewOrigin(event.origin)
  return !isSeededDemoOrigin(event.origin) || !requireReal
}

function suggestionsFromShadowReviewEvents(
  events: ReviewEvent[],
  requireReal: boolean
): LabSuggestion[] {
  const suggestions: LabSuggestion[] = []

  for (const event of events) {
    if (!isEligibleEvidenceEvent(event, requireReal)) continue
    if (!FOUNDER_ACTION_ELIGIBLE_STATUSES.includes(event.status)) continue

    const strength = deriveEvidenceStrength(1, event.riskLevel)
    const evidence: EvidenceSource = {
      type: 'shadow-review-event',
      id: event.id,
      label: `${REVIEW_SOURCE_LABELS[event.source]} · ${event.status}`,
      isSynthetic: false,
      createdAt: event.createdAt
    }

    suggestions.push({
      id: nextSuggestionId('shadow'),
      title: `Address ${event.status} in ${REVIEW_SOURCE_LABELS[event.source]} output`,
      category: event.riskLevel === 'critical' || event.riskLevel === 'high' ? 'safety' : 'brain',
      description: event.reasonSummary,
      whyItMatters:
        'Residential childcare ORB outputs must support safe, trauma-informed practice. Shadow review flagged this output for founder attention without blocking live answers.',
      evidenceSources: [evidence],
      evidenceStrength: strength,
      confidence: deriveConfidence(strength, false),
      riskLevel: event.riskLevel,
      affectedOrbStations: [event.source],
      affectedTaskTypes: [event.taskType],
      recommendedAction:
        'Review redacted shadow evidence, create a build brief, and approve any prompt or brain changes before production deployment.',
      approvalRequirement: event.riskLevel === 'critical' || event.riskLevel === 'high'
        ? 'Founder approval required before production changes'
        : 'Founder review recommended',
      suggestedBenchmarkRetest: null,
      buildBriefTitle: `Shadow review improvement: ${REVIEW_TASK_TYPE_LABELS[event.taskType]}`,
      status: 'new',
      createdAt: event.createdAt,
      isSyntheticEvidence: false
    })
  }

  return suggestions
}

function suggestionsFromPatterns(patterns: LabPattern[], requireReal: boolean): LabSuggestion[] {
  const suggestions: LabSuggestion[] = []

  for (const pattern of patterns) {
    const hasOnlyDemoEvidence =
      requireReal && pattern.relatedEventIds.every((id) => id.startsWith('rev-seed-'))

    if (requireReal && hasOnlyDemoEvidence) {
      continue
    }

    const maxRisk = pattern.riskLevel
    const strength = deriveEvidenceStrength(pattern.frequency, maxRisk)
    const evidence: EvidenceSource = {
      type: 'detected-pattern',
      id: pattern.id,
      label: pattern.title,
      isSynthetic: false,
      createdAt: pattern.detectedAt
    }

    suggestions.push({
      id: nextSuggestionId('pattern'),
      title: pattern.title,
      category: patternAreaToCategory(pattern.area),
      description: pattern.description,
      whyItMatters: pattern.evidenceSummary,
      evidenceSources: [evidence],
      evidenceStrength: strength,
      confidence: deriveConfidence(strength, false),
      riskLevel: pattern.riskLevel,
      affectedOrbStations: pattern.affectedSources,
      affectedTaskTypes: pattern.affectedTaskTypes,
      recommendedAction: pattern.recommendedAction,
      approvalRequirement:
        pattern.riskLevel === 'critical' || pattern.riskLevel === 'high'
          ? 'Founder approval required'
          : 'Founder review recommended',
      suggestedBenchmarkRetest: pattern.suggestedBuildBriefTitle,
      buildBriefTitle: pattern.suggestedBuildBriefTitle,
      status: 'new',
      createdAt: pattern.detectedAt,
      isSyntheticEvidence: false
    })
  }

  return suggestions
}

function suggestionsFromBenchmarkFailures(runs: EvaluationRun[]): LabSuggestion[] {
  const suggestions: LabSuggestion[] = []

  for (const run of runs) {
    if (!run.result) continue
    if (run.result.scorecard.classification === 'pass') continue

    const scenario = getScenarioById(run.scenarioId)
    const strength: EvidenceStrength =
      run.result.scorecard.classification === 'fail' ? 'moderate' : 'weak'

    const evidence: EvidenceSource = {
      type: 'benchmark-failure',
      id: run.id,
      label: `Synthetic benchmark: ${scenario?.title ?? run.scenarioId}`,
      isSynthetic: true,
      createdAt: run.completedAt ?? run.createdAt
    }

    suggestions.push({
      id: nextSuggestionId('bench'),
      title: `Synthetic benchmark failure: ${scenario?.title ?? run.scenarioId}`,
      category: 'evaluation',
      description: `Internal synthetic benchmark scored ${run.result.scorecard.overallScore}/5 (${run.result.scorecard.classification}). This is evaluation evidence only — not expert validation.`,
      whyItMatters:
        'Synthetic benchmarks help founders test ORB brain quality before real shadow review volume exists. Failures highlight areas to improve in residential childcare outputs.',
      evidenceSources: [evidence],
      evidenceStrength: strength,
      confidence: deriveConfidence(strength, true),
      riskLevel: scenario?.riskLevel ?? 'medium',
      affectedOrbStations: [],
      affectedTaskTypes: [],
      recommendedAction:
        'Create a build brief from benchmark findings and re-run the synthetic scenario after changes. No automatic production prompt changes.',
      approvalRequirement: 'Founder approval required before production integration',
      suggestedBenchmarkRetest: scenario?.title ?? run.scenarioId,
      buildBriefTitle: `Benchmark failure: ${scenario?.title ?? run.scenarioId}`,
      status: 'new',
      createdAt: run.completedAt ?? run.createdAt,
      isSyntheticEvidence: true
    })
  }

  return suggestions
}

function suggestionsFromComparisonRegressions(runs: EvaluationRun[]): LabSuggestion[] {
  const suggestions: LabSuggestion[] = []

  for (const run of runs) {
    if (!run.comparison) continue
    const { comparison } = run
    const isRegression =
      comparison.safeguardingRegression ||
      comparison.recommendation === 'reject' ||
      comparison.scoreDelta < 0

    if (!isRegression) continue

    const scenario = getScenarioById(run.scenarioId)
    const evidence: EvidenceSource = {
      type: 'comparison-regression',
      id: comparison.id,
      label: `Comparison regression: ${scenario?.title ?? run.scenarioId}`,
      isSynthetic: true,
      createdAt: comparison.comparedAt
    }

    suggestions.push({
      id: nextSuggestionId('compare'),
      title: `Synthetic comparison regression: ${scenario?.title ?? run.scenarioId}`,
      category: 'evaluation',
      description: comparison.safeguardingRegression
        ? 'Proposed answer regressed on safeguarding in synthetic comparison mode.'
        : `Proposed answer scored ${comparison.scoreDelta.toFixed(1)} lower than current in synthetic comparison.`,
      whyItMatters:
        'Comparison regressions in synthetic benchmarks warn founders before testing changes against real shadow review evidence.',
      evidenceSources: [evidence],
      evidenceStrength: comparison.safeguardingRegression ? 'strong' : 'moderate',
      confidence: comparison.safeguardingRegression ? 'medium' : 'low',
      riskLevel: comparison.safeguardingRegression ? 'critical' : 'high',
      affectedOrbStations: [],
      affectedTaskTypes: [],
      recommendedAction: 'Reject or revise the proposed change. Re-run comparison benchmarks before founder approval.',
      approvalRequirement: 'Do not deploy — comparison regression detected',
      suggestedBenchmarkRetest: scenario?.title ?? run.scenarioId,
      buildBriefTitle: `Fix comparison regression: ${scenario?.title ?? run.scenarioId}`,
      status: 'new',
      createdAt: comparison.comparedAt,
      isSyntheticEvidence: true
    })
  }

  return suggestions
}

function suggestionsFromApprovalItems(items: ApprovalQueueItem[]): LabSuggestion[] {
  return items
    .filter(
      (item) =>
        item.status === 'pending' &&
        (item.riskLevel === 'critical' || item.riskLevel === 'high')
    )
    .map((item) => ({
      id: nextSuggestionId('approval'),
      title: `High-risk approval: ${item.title}`,
      category: 'workflow' as SuggestionCategory,
      description: item.summary,
      whyItMatters:
        'High-risk items in the founder approval queue require explicit governance before any ORB brain or prompt changes reach production.',
      evidenceSources: [
        {
          type: 'approval-item' as const,
          id: item.id,
          label: item.title,
          isSynthetic: false,
          createdAt: item.submittedAt
        }
      ],
      evidenceStrength: 'moderate' as EvidenceStrength,
      confidence: 'medium' as SuggestionConfidence,
      riskLevel: item.riskLevel,
      affectedOrbStations: [],
      affectedTaskTypes: [],
      recommendedAction: 'Review approval queue evidence and record a founder decision.',
      approvalRequirement: 'Pending founder decision',
      suggestedBenchmarkRetest: null,
      buildBriefTitle: `Approval review: ${item.title}`,
      status: 'new' as const,
      createdAt: item.submittedAt,
      isSyntheticEvidence: false
    }))
}

function suggestionsFromFounderActions(events: ReviewEvent[]): LabSuggestion[] {
  const actionCounts = new Map<string, { count: number; eventIds: string[]; latestAt: string }>()

  for (const event of events) {
    if (!isRealShadowReviewOrigin(event.origin)) continue
    for (const action of event.founderActions ?? []) {
      const key = action.action
      const existing = actionCounts.get(key) ?? { count: 0, eventIds: [], latestAt: action.createdAt }
      existing.count += 1
      existing.eventIds.push(event.id)
      if (action.createdAt > existing.latestAt) existing.latestAt = action.createdAt
      actionCounts.set(key, existing)
    }
  }

  const suggestions: LabSuggestion[] = []

  for (const [action, data] of actionCounts) {
    if (data.count < 2) continue

    suggestions.push({
      id: nextSuggestionId('founder'),
      title: `Repeated founder action: ${action}`,
      category: 'workflow',
      description: `Founders recorded "${action}" on ${data.count} shadow review events.`,
      whyItMatters:
        'Repeated founder actions on real shadow review evidence may indicate a systemic ORB improvement theme worth formalising in a build brief.',
      evidenceSources: [
        {
          type: 'founder-action',
          id: data.eventIds.join(','),
          label: `${action} (${data.count}×)`,
          isSynthetic: false,
          createdAt: data.latestAt
        }
      ],
      evidenceStrength: data.count >= 3 ? 'strong' : 'moderate',
      confidence: data.count >= 3 ? 'high' : 'medium',
      riskLevel: 'medium',
      affectedOrbStations: [],
      affectedTaskTypes: [],
      recommendedAction: 'Consider a build brief to address the recurring founder concern.',
      approvalRequirement: 'Founder review recommended',
      suggestedBenchmarkRetest: null,
      buildBriefTitle: `Systemic improvement from repeated: ${action}`,
      status: 'new',
      createdAt: data.latestAt,
      isSyntheticEvidence: false
    })
  }

  return suggestions
}

export type GenerateSuggestionsInput = {
  reviewEvents: ReviewEvent[]
  patterns: LabPattern[]
  evaluationRuns: EvaluationRun[]
  approvalItems: ApprovalQueueItem[]
  requireRealEvidence?: boolean
}

export type GenerateSuggestionsResult = {
  suggestions: LabSuggestion[]
  realSuggestions: LabSuggestion[]
  syntheticSuggestions: LabSuggestion[]
  generatedAt: string
}

export function generateEvidenceSuggestions(
  input: GenerateSuggestionsInput
): GenerateSuggestionsResult {
  const requireReal = input.requireRealEvidence ?? requiresRealEvidenceForSuggestions()

  const shadowSuggestions = suggestionsFromShadowReviewEvents(input.reviewEvents, requireReal)
  const patternSuggestions = suggestionsFromPatterns(input.patterns, requireReal)
  const benchmarkSuggestions = suggestionsFromBenchmarkFailures(input.evaluationRuns)
  const comparisonSuggestions = suggestionsFromComparisonRegressions(input.evaluationRuns)
  const approvalSuggestions = suggestionsFromApprovalItems(input.approvalItems)
  const founderSuggestions = suggestionsFromFounderActions(input.reviewEvents)

  const all = [
    ...shadowSuggestions,
    ...patternSuggestions,
    ...benchmarkSuggestions,
    ...comparisonSuggestions,
    ...approvalSuggestions,
    ...founderSuggestions
  ]

  all.sort((a, b) => RISK_RANK[b.riskLevel as ReviewRiskLevel] - RISK_RANK[a.riskLevel as ReviewRiskLevel])

  const realSuggestions = all.filter((s) => isRealEvidenceSuggestion(s))
  const syntheticSuggestions = all.filter((s) => s.isSyntheticEvidence)

  return {
    suggestions: all,
    realSuggestions,
    syntheticSuggestions,
    generatedAt: new Date().toISOString()
  }
}
