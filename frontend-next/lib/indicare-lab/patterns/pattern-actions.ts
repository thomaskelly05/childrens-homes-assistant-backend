import { getPatternRuleWhyItMatters } from '@/lib/indicare-lab/patterns/pattern-detection-engine'
import {
  LAB_PATTERN_AREA_LABELS,
  type LabPattern
} from '@/lib/indicare-lab/patterns/types'
import {
  REVIEW_SOURCE_LABELS,
  REVIEW_TASK_TYPE_LABELS
} from '@/lib/indicare-lab/review-events/types'
import type { ApprovalQueueItem, BuildBrief } from '@/lib/indicare-lab/types'

export function generateBuildBriefFromPattern(pattern: LabPattern): BuildBrief {
  const id = `brief-pattern-${Date.now()}`
  const createdAt = new Date().toISOString()

  const sourceLabels = pattern.affectedSources.map((s) => REVIEW_SOURCE_LABELS[s]).join(', ')
  const taskLabels = pattern.affectedTaskTypes.map((t) => REVIEW_TASK_TYPE_LABELS[t]).join(', ')
  const whyItMatters = getPatternRuleWhyItMatters(pattern.id)

  const evidenceLines = pattern.evidence.map(
    (e) =>
      `[${e.eventId}] ${REVIEW_SOURCE_LABELS[e.source]} · ${REVIEW_TASK_TYPE_LABELS[e.taskType]} — ${e.agentLabel}: ${e.flag}${e.isRedacted ? ' (redacted)' : ''}`
  )

  return {
    id,
    createdAt,
    title: pattern.suggestedBuildBriefTitle,
    gaps: [],
    objective: `Problem: ${pattern.title}. ${pattern.description} This is an internal evaluation pattern — not expert validation.`,
    scope: [
      `Affected ORB stations: ${sourceLabels || 'Not yet determined'}`,
      `Affected task types: ${taskLabels || 'Various'}`,
      `Pattern area: ${LAB_PATTERN_AREA_LABELS[pattern.area]}`,
      `Recommended action: ${pattern.recommendedAction}`,
      `Why it matters in residential childcare: ${whyItMatters}`,
      `Evidence from ${pattern.frequency} review event${pattern.frequency === 1 ? '' : 's'}: ${pattern.evidenceSummary}`,
      ...evidenceLines.map((line) => `Evidence: ${line}`)
    ],
    constraints: [
      'Development mode only — no production deployment without founder approval',
      'Must not silently alter system prompts or production brain behaviour',
      'Synthetic review board perspectives are AI-modelled, not human expert validation',
      'Language must use supports, reviews, flags, recommends — not compliance guarantees',
      'Preserve redaction and data minimisation for any stored review evidence',
      'Founder approval required before any production integration'
    ],
    acceptanceCriteria: [
      `Pattern "${pattern.title}" no longer appears in recurring internal evaluation for ${sourceLabels || 'target stations'}`,
      'Re-run internal review tests and shadow review checks to confirm improvement',
      'No live ORB output blocking or rewriting introduced without explicit founder decision',
      'Safety considerations reviewed: changes support care quality without claiming compliance guarantees',
      'Founder sign-off recorded before production prompt or brain changes'
    ],
    riskNotes: `Pattern risk: ${pattern.riskLevel}. Priority: ${pattern.priority}. Frequency: ${pattern.frequency} event${pattern.frequency === 1 ? '' : 's'}. Related events: ${pattern.relatedEventIds.join(', ')}. Founder approval required.`
  }
}

export function patternToApprovalItem(pattern: LabPattern): ApprovalQueueItem {
  const evidence = [
    pattern.evidenceSummary,
    ...pattern.evidence.slice(0, 5).map((e) => `${e.agentLabel}: ${e.flag} (${e.eventId})`)
  ]

  return {
    id: `appr-pattern-${pattern.id}`,
    title: `Pattern: ${pattern.title}`,
    type: `Recurring pattern · ${LAB_PATTERN_AREA_LABELS[pattern.area]}`,
    submittedAt: pattern.detectedAt,
    riskLevel: pattern.riskLevel,
    status: 'pending',
    summary: `${pattern.description} ${pattern.recommendedAction}`,
    evidence
  }
}

export function updatePatternStatus(
  patterns: LabPattern[],
  patternId: string,
  status: LabPattern['founderDecisionStatus']
): LabPattern[] {
  return patterns.map((p) => (p.id === patternId ? { ...p, founderDecisionStatus: status } : p))
}
