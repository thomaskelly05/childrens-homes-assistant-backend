import { listReviewEvents } from '@/lib/indicare-lab/review-events/review-event-storage'
import {
  FOUNDER_ACTION_ELIGIBLE_STATUSES,
  REVIEW_SOURCE_LABELS,
  REVIEW_TASK_TYPE_LABELS,
  type ReviewAgentName,
  type ReviewEvent,
  type ReviewRiskLevel,
  type ReviewSource,
  type ReviewTaskType
} from '@/lib/indicare-lab/review-events/types'
import type {
  LabPattern,
  LabPatternArea,
  LabPatternEvidence,
  LabPatternPriority,
  LabPatternRiskLevel
} from '@/lib/indicare-lab/patterns/types'

const RISK_RANK: Record<ReviewRiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

type PatternRule = {
  id: string
  title: string
  area: LabPatternArea
  description: string
  flagMatchers: string[]
  agents?: ReviewAgentName[]
  recommendedAction: string
  suggestedBuildBriefTitle: string
  baseRiskLevel: LabPatternRiskLevel
  basePriority: LabPatternPriority
  whyItMatters: string
}

const PATTERN_RULES: PatternRule[] = [
  {
    id: 'pattern-missing-child-voice',
    title: 'Missing child voice in records',
    area: 'brain',
    description:
      'Review events repeatedly flag outputs that do not represent what the child or young person said, felt, or communicated.',
    flagMatchers: ["child or young person's voice", 'child voice'],
    agents: ['child-voice'],
    recommendedAction:
      'Recommend prompt and output guidance that supports including child voice where appropriate in records and incident writing.',
    suggestedBuildBriefTitle: 'Improve child voice representation in ORB record outputs',
    baseRiskLevel: 'medium',
    basePriority: 'p1',
    whyItMatters:
      'Residential childcare records should reflect the child\'s perspective — Ofsted and safeguarding reviews expect evidence that the child was heard.'
  },
  {
    id: 'pattern-weak-safeguarding-escalation',
    title: 'Weak safeguarding escalation language',
    area: 'safety',
    description:
      'Review events flag safeguarding risk terms without clear escalation pathways, manager involvement, or referral language.',
    flagMatchers: ['escalation', 'without clear escalation'],
    agents: ['safeguarding'],
    recommendedAction:
      'Recommend clearer escalation prompts and draft scaffolding when safeguarding risk terms appear in ORB outputs.',
    suggestedBuildBriefTitle: 'Strengthen safeguarding escalation guidance in ORB outputs',
    baseRiskLevel: 'critical',
    basePriority: 'p0',
    whyItMatters:
      'Ambiguous escalation language in residential settings can delay protective action and undermine safeguarding confidence.'
  },
  {
    id: 'pattern-judgemental-language',
    title: 'Judgemental or blaming language',
    area: 'brain',
    description:
      'Review events repeatedly flag labelling, punitive, or blaming language that is not trauma-informed.',
    flagMatchers: ['judgemental', 'labelling', 'punitive', 'blaming'],
    agents: ['therapeutic-practice', 'ethics-bias'],
    recommendedAction:
      'Recommend trauma-informed language guidance and rewrite suggestions that describe behaviour without labels.',
    suggestedBuildBriefTitle: 'Reduce judgemental language in ORB therapeutic outputs',
    baseRiskLevel: 'high',
    basePriority: 'p1',
    whyItMatters:
      'Judgemental language in records can harm therapeutic relationships and does not reflect residential childcare best practice.'
  },
  {
    id: 'pattern-vague-ofsted-evidence',
    title: 'Vague Ofsted evidence language',
    area: 'knowledge',
    description:
      'Review events flag outputs that lack specific observable detail needed for inspection-ready evidence.',
    flagMatchers: ['weak evidence', 'observable detail', 'specific observable'],
    agents: ['ofsted-evidence'],
    recommendedAction:
      'Recommend output structures that support timestamps, observable detail, and clear links between action and impact.',
    suggestedBuildBriefTitle: 'Improve Ofsted-ready evidence specificity in ORB records',
    baseRiskLevel: 'medium',
    basePriority: 'p2',
    whyItMatters:
      'Inspection-ready records need specific, observable evidence — vague language weakens accountability and improvement tracking.'
  },
  {
    id: 'pattern-poor-oia-structure',
    title: 'Poor observation / interpretation / action structure',
    area: 'workflow',
    description:
      'Review events flag records where observation, interpretation, and action are not clearly separated.',
    flagMatchers: ['observation, interpretation', 'not clearly separated'],
    agents: ['recording-quality'],
    recommendedAction:
      'Recommend structured recording templates that separate what was observed, interpreted, and done.',
    suggestedBuildBriefTitle: 'Enforce OIA structure in ORB record outputs',
    baseRiskLevel: 'medium',
    basePriority: 'p2',
    whyItMatters:
      'Clear OIA structure supports professional accountability and reduces ambiguity in residential childcare records.'
  },
  {
    id: 'pattern-diagnosis-risk',
    title: 'Diagnosis or clinical attribution risk',
    area: 'safety',
    description:
      'Review events flag outputs that state diagnoses or clinical conditions as fact rather than observed needs.',
    flagMatchers: ['diagnosis', 'clinical attribution'],
    agents: ['send-neurodiversity'],
    recommendedAction:
      'Recommend language that describes observed needs and adjustments without diagnostic certainty or stereotypes.',
    suggestedBuildBriefTitle: 'Reduce diagnosis risk in ORB SEND-related outputs',
    baseRiskLevel: 'high',
    basePriority: 'p1',
    whyItMatters:
      'Stating diagnoses as fact in residential records can misrepresent needs, breach professional boundaries, and create safeguarding risk.'
  },
  {
    id: 'pattern-missing-manager-oversight',
    title: 'Missing manager oversight references',
    area: 'workflow',
    description:
      'Review events flag high-stakes incidents that lack appropriate manager oversight or escalation references.',
    flagMatchers: ['manager oversight', 'manager'],
    agents: ['residential-practice'],
    recommendedAction:
      'Recommend prompts that support manager notification and oversight language for significant incidents.',
    suggestedBuildBriefTitle: 'Add manager oversight scaffolding for high-stakes ORB incidents',
    baseRiskLevel: 'high',
    basePriority: 'p1',
    whyItMatters:
      'Significant residential incidents require clear oversight trails — missing manager references weaken governance.'
  },
  {
    id: 'pattern-adult-centred-wording',
    title: 'Adult-centred wording',
    area: 'brain',
    description:
      'Review events flag outputs prioritising staff convenience or adult decisions over the child\'s perspective.',
    flagMatchers: ['adult-centred', 'staff convenience'],
    agents: ['ethics-bias'],
    recommendedAction:
      'Recommend child-centred language checks and rewrite guidance for communication drafts.',
    suggestedBuildBriefTitle: 'Shift adult-centred wording to child-centred ORB outputs',
    baseRiskLevel: 'medium',
    basePriority: 'p2',
    whyItMatters:
      'Child-centred practice is foundational in residential care — adult-centred wording undermines rights-based practice.'
  }
]

function nextPatternId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function matchesFlag(flag: string, matchers: string[]): boolean {
  const lower = flag.toLowerCase()
  return matchers.some((matcher) => lower.includes(matcher.toLowerCase()))
}

function collectEvidenceForRule(rule: PatternRule, events: ReviewEvent[]): LabPatternEvidence[] {
  const evidence: LabPatternEvidence[] = []

  for (const event of events) {
    for (const result of event.agentResults) {
      if (rule.agents && !rule.agents.includes(result.agent)) continue
      for (const flag of result.flags) {
        if (matchesFlag(flag, rule.flagMatchers)) {
          evidence.push({
            eventId: event.id,
            source: event.source,
            taskType: event.taskType,
            flag,
            agentLabel: result.agentLabel,
            createdAt: event.createdAt,
            isRedacted: event.isRedacted
          })
        }
      }
    }
  }

  return evidence
}

function deriveRiskLevel(rule: PatternRule, evidence: LabPatternEvidence[], events: ReviewEvent[]): LabPatternRiskLevel {
  const eventRiskLevels = events.map((e) => e.riskLevel)
  const maxEventRisk = eventRiskLevels.reduce<ReviewRiskLevel>(
    (max, level) => (RISK_RANK[level] > RISK_RANK[max] ? level : max),
    'low'
  )

  if (RISK_RANK[maxEventRisk] >= RISK_RANK[rule.baseRiskLevel]) return maxEventRisk
  if (evidence.length >= 3 && RISK_RANK[rule.baseRiskLevel] < RISK_RANK.high) return 'high'
  return rule.baseRiskLevel
}

function derivePriority(rule: PatternRule, frequency: number, riskLevel: LabPatternRiskLevel): LabPatternPriority {
  if (riskLevel === 'critical') return 'p0'
  if (riskLevel === 'high' && frequency >= 2) return 'p0'
  if (frequency >= 3) return 'p1'
  return rule.basePriority
}

function buildPatternFromRule(rule: PatternRule, events: ReviewEvent[]): LabPattern | null {
  const evidence = collectEvidenceForRule(rule, events)
  if (evidence.length === 0) return null

  const relatedEventIds = [...new Set(evidence.map((e) => e.eventId))]
  const matchedEvents = events.filter((e) => relatedEventIds.includes(e.id))
  const affectedSources = [...new Set(matchedEvents.map((e) => e.source))]
  const affectedTaskTypes = [...new Set(matchedEvents.map((e) => e.taskType))]
  const frequency = relatedEventIds.length
  const riskLevel = deriveRiskLevel(rule, evidence, matchedEvents)
  const priority = derivePriority(rule, frequency, riskLevel)

  const sourceLabels = affectedSources.map((s) => REVIEW_SOURCE_LABELS[s]).join(', ')
  const taskLabels = affectedTaskTypes.map((t) => REVIEW_TASK_TYPE_LABELS[t]).join(', ')

  return {
    id: nextPatternId(rule.id),
    title: rule.title,
    area: rule.area,
    description: rule.description,
    evidenceSummary: `${frequency} internal evaluation event${frequency === 1 ? '' : 's'} flagged this pattern across ${sourceLabels || 'unknown sources'} (${taskLabels || 'various task types'}). Evidence is ${matchedEvents.some((e) => e.isRedacted) ? 'partially redacted' : 'from development-mode review events'}.`,
    relatedEventIds,
    affectedSources,
    affectedTaskTypes,
    frequency,
    riskLevel,
    priority,
    recommendedAction: rule.recommendedAction,
    suggestedBuildBriefTitle: rule.suggestedBuildBriefTitle,
    founderDecisionStatus: 'detected',
    evidence,
    detectedAt: new Date().toISOString(),
    isDevelopment: matchedEvents.every((e) => e.isDevelopment),
    isInternalEvaluation: true
  }
}

function detectStationHighRiskPattern(events: ReviewEvent[]): LabPattern | null {
  const highRiskEvents = events.filter(
    (e) => RISK_RANK[e.riskLevel] >= RISK_RANK.high && FOUNDER_ACTION_ELIGIBLE_STATUSES.includes(e.status)
  )
  if (highRiskEvents.length < 2) return null

  const bySource = new Map<ReviewSource, ReviewEvent[]>()
  for (const event of highRiskEvents) {
    const list = bySource.get(event.source) ?? []
    list.push(event)
    bySource.set(event.source, list)
  }

  let topSource: ReviewSource | null = null
  let topEvents: ReviewEvent[] = []
  for (const [source, sourceEvents] of bySource) {
    if (sourceEvents.length > topEvents.length) {
      topSource = source
      topEvents = sourceEvents
    }
  }

  if (!topSource || topEvents.length < 2) return null

  const evidence: LabPatternEvidence[] = topEvents.flatMap((event) =>
    event.agentResults
      .filter((r) => r.flags.length > 0)
      .map((r) => ({
        eventId: event.id,
        source: event.source,
        taskType: event.taskType,
        flag: r.flags[0] ?? 'High-risk review event',
        agentLabel: r.agentLabel,
        createdAt: event.createdAt,
        isRedacted: event.isRedacted
      }))
  )

  const maxRisk = topEvents.reduce<ReviewRiskLevel>(
    (max, e) => (RISK_RANK[e.riskLevel] > RISK_RANK[max] ? e.riskLevel : max),
    'high'
  )

  return {
    id: nextPatternId('pattern-station-high-risk'),
    title: `Repeated high-risk events from ${REVIEW_SOURCE_LABELS[topSource]}`,
    area: 'safety',
    description: `Multiple high-risk review events originate from the same ORB station (${REVIEW_SOURCE_LABELS[topSource]}), suggesting a recurring weakness in that output path.`,
    evidenceSummary: `${topEvents.length} high-risk internal evaluation events from ${REVIEW_SOURCE_LABELS[topSource]} flagged for founder attention.`,
    relatedEventIds: topEvents.map((e) => e.id),
    affectedSources: [topSource],
    affectedTaskTypes: [...new Set(topEvents.map((e) => e.taskType))],
    frequency: topEvents.length,
    riskLevel: maxRisk,
    priority: maxRisk === 'critical' ? 'p0' : 'p1',
    recommendedAction:
      'Recommend targeted review of this ORB station\'s prompts, guardrails, and output templates with founder approval before changes.',
    suggestedBuildBriefTitle: `Address recurring high-risk outputs from ${REVIEW_SOURCE_LABELS[topSource]}`,
    founderDecisionStatus: 'detected',
    evidence,
    detectedAt: new Date().toISOString(),
    isDevelopment: topEvents.every((e) => e.isDevelopment),
    isInternalEvaluation: true
  }
}

function detectTaskTypeRewritePattern(events: ReviewEvent[]): LabPattern | null {
  const rewriteEvents = events.filter((e) => e.status === 'rewrite' || e.agentsRewrote > 0)
  if (rewriteEvents.length < 2) return null

  const byTaskType = new Map<ReviewTaskType, ReviewEvent[]>()
  for (const event of rewriteEvents) {
    const list = byTaskType.get(event.taskType) ?? []
    list.push(event)
    byTaskType.set(event.taskType, list)
  }

  let topTaskType: ReviewTaskType | null = null
  let topEvents: ReviewEvent[] = []
  for (const [taskType, taskEvents] of byTaskType) {
    if (taskEvents.length > topEvents.length) {
      topTaskType = taskType
      topEvents = taskEvents
    }
  }

  if (!topTaskType || topEvents.length < 2) return null

  const evidence: LabPatternEvidence[] = topEvents.flatMap((event) =>
    event.agentResults
      .filter((r) => r.decision === 'rewrite' && r.flags.length > 0)
      .map((r) => ({
        eventId: event.id,
        source: event.source,
        taskType: event.taskType,
        flag: r.flags[0] ?? 'Rewrite recommended',
        agentLabel: r.agentLabel,
        createdAt: event.createdAt,
        isRedacted: event.isRedacted
      }))
  )

  if (evidence.length === 0) return null

  const rewriteReasons = evidence.map((e) => e.flag)
  const topReason = rewriteReasons[0] ?? 'Rewrite recommended'

  return {
    id: nextPatternId('pattern-task-rewrite'),
    title: `Repeated rewrite recommendations for ${REVIEW_TASK_TYPE_LABELS[topTaskType]}`,
    area: 'workflow',
    description: `Multiple review events recommend rewrites for the same task type (${REVIEW_TASK_TYPE_LABELS[topTaskType]}), indicating a recurring output quality gap.`,
    evidenceSummary: `${topEvents.length} events with rewrite recommendations for ${REVIEW_TASK_TYPE_LABELS[topTaskType]}. Most common reason: ${topReason}.`,
    relatedEventIds: topEvents.map((e) => e.id),
    affectedSources: [...new Set(topEvents.map((e) => e.source))],
    affectedTaskTypes: [topTaskType],
    frequency: topEvents.length,
    riskLevel: 'medium',
    priority: topEvents.length >= 3 ? 'p1' : 'p2',
    recommendedAction:
      'Recommend reviewing ORB templates and guidance for this task type with founder-controlled improvement proposals.',
    suggestedBuildBriefTitle: `Reduce rewrite rates for ${REVIEW_TASK_TYPE_LABELS[topTaskType]} outputs`,
    founderDecisionStatus: 'detected',
    evidence,
    detectedAt: new Date().toISOString(),
    isDevelopment: topEvents.every((e) => e.isDevelopment),
    isInternalEvaluation: true
  }
}

export type PatternDetectionResult = {
  patterns: LabPattern[]
  analysedEventCount: number
  detectedAt: string
}

export function detectPatternsFromReviewEvents(events?: ReviewEvent[]): PatternDetectionResult {
  const sourceEvents = events ?? listReviewEvents()
  const patterns: LabPattern[] = []

  for (const rule of PATTERN_RULES) {
    const pattern = buildPatternFromRule(rule, sourceEvents)
    if (pattern) patterns.push(pattern)
  }

  const stationPattern = detectStationHighRiskPattern(sourceEvents)
  if (stationPattern) patterns.push(stationPattern)

  const taskRewritePattern = detectTaskTypeRewritePattern(sourceEvents)
  if (taskRewritePattern) patterns.push(taskRewritePattern)

  patterns.sort((a, b) => {
    const riskDiff = RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel]
    if (riskDiff !== 0) return riskDiff
    return b.frequency - a.frequency
  })

  return {
    patterns,
    analysedEventCount: sourceEvents.length,
    detectedAt: new Date().toISOString()
  }
}

export function getPatternRuleWhyItMatters(patternIdPrefix: string): string {
  const rule = PATTERN_RULES.find((r) => patternIdPrefix.startsWith(r.id))
  return rule?.whyItMatters ?? 'Recurring weaknesses in ORB outputs can affect care quality and professional accountability in residential settings.'
}

export function getMostCommonRewriteReason(events?: ReviewEvent[]): string | null {
  const sourceEvents = events ?? listReviewEvents()
  const reasonCounts = new Map<string, number>()

  for (const event of sourceEvents) {
    for (const result of event.agentResults) {
      if (result.decision !== 'rewrite') continue
      for (const flag of result.flags) {
        reasonCounts.set(flag, (reasonCounts.get(flag) ?? 0) + 1)
      }
    }
  }

  let topReason: string | null = null
  let topCount = 0
  for (const [reason, count] of reasonCounts) {
    if (count > topCount) {
      topReason = reason
      topCount = count
    }
  }

  return topReason
}

export { PATTERN_RULES }
