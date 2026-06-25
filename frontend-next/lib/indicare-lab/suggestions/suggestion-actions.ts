import { generateBuildBriefFromFailedBenchmark } from '@/lib/indicare-lab/evaluations/evaluation-actions'
import { getEvaluationRunById } from '@/lib/indicare-lab/evaluations/evaluation-storage'
import { generateBuildBriefFromPattern } from '@/lib/indicare-lab/patterns/pattern-actions'
import type { LabPattern } from '@/lib/indicare-lab/patterns/types'
import { generateBuildBriefFromReviewEvent } from '@/lib/indicare-lab/review-events/review-event-actions'
import { getReviewEventById } from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ApprovalQueueItem, BuildBrief } from '@/lib/indicare-lab/types'
import type { LabSuggestion } from '@/lib/indicare-lab/suggestions/types'

export function generateBuildBriefFromSuggestion(
  suggestion: LabSuggestion,
  context?: { pattern?: LabPattern }
): BuildBrief | null {
  const shadowSource = suggestion.evidenceSources.find((s) => s.type === 'shadow-review-event')
  if (shadowSource) {
    const event = getReviewEventById(shadowSource.id)
    if (event) return generateBuildBriefFromReviewEvent(event)
  }

  const patternSource = suggestion.evidenceSources.find((s) => s.type === 'detected-pattern')
  if (patternSource && context?.pattern) {
    return generateBuildBriefFromPattern(context.pattern)
  }

  const benchmarkSource = suggestion.evidenceSources.find((s) => s.type === 'benchmark-failure')
  if (benchmarkSource) {
    const run = getEvaluationRunById(benchmarkSource.id)
    if (run?.result) return generateBuildBriefFromFailedBenchmark(run.result)
  }

  const comparisonSource = suggestion.evidenceSources.find((s) => s.type === 'comparison-regression')
  if (comparisonSource) {
    const run = suggestion.evidenceSources
      .map((s) => getEvaluationRunById(s.id))
      .find((r) => r?.comparison)
    if (run?.result) return generateBuildBriefFromFailedBenchmark(run.result)
  }

  return {
    id: `brief-sug-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: suggestion.buildBriefTitle,
    gaps: [],
    objective: suggestion.description,
    scope: [
      suggestion.recommendedAction,
      `Evidence strength: ${suggestion.evidenceStrength}`,
      `Confidence: ${suggestion.confidence}`,
      ...suggestion.evidenceSources.map((s) => `${s.label}${s.isSynthetic ? ' (synthetic)' : ''}`)
    ],
    constraints: [
      'No automatic production prompt or brain changes',
      'Founder approval required before deployment',
      'Supports and recommends — not compliance guarantees',
      suggestion.isSyntheticEvidence
        ? 'Based on synthetic internal benchmark evidence only'
        : 'Based on redacted shadow review or founder governance evidence'
    ],
    acceptanceCriteria: [
      suggestion.suggestedBenchmarkRetest
        ? `Re-test: ${suggestion.suggestedBenchmarkRetest}`
        : 'Re-run relevant shadow review or benchmark after changes',
      'Founder sign-off recorded',
      'No live ORB output blocking introduced without explicit decision'
    ],
    riskNotes: `${suggestion.riskLevel} risk. ${suggestion.approvalRequirement}.`
  }
}

export function suggestionToApprovalItem(suggestion: LabSuggestion): ApprovalQueueItem {
  return {
    id: `approval-sug-${suggestion.id}`,
    title: suggestion.title,
    type: 'Evidence-based suggestion',
    submittedAt: suggestion.createdAt,
    riskLevel: suggestion.riskLevel,
    status: 'pending',
    summary: suggestion.description,
    evidence: suggestion.evidenceSources.map(
      (s) => `${s.label}${s.isSynthetic ? ' · synthetic benchmark evidence' : ' · real evidence'}`
    )
  }
}
