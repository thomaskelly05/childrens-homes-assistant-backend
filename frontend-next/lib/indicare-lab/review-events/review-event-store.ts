import { runReviewEngine } from '@/lib/indicare-lab/review-board/review-engine'
import {
  FOUNDER_ACTION_ELIGIBLE_STATUSES,
  REVIEW_AGENT_LABELS,
  type ReviewEvent,
  type ReviewEventFilter,
  type ReviewEventSummary,
  type ReviewRiskLevel,
  type ReviewSource,
  type ReviewStatus,
  type ReviewTaskType
} from '@/lib/indicare-lab/review-events/types'

export type CreateReviewEventInput = {
  source: ReviewSource
  taskType: ReviewTaskType
  prompt?: string
  draftAnswer: string
  context?: string
  isDevelopment?: boolean
}

const SEEDED_REVIEW_EVENTS: ReviewEvent[] = [
  {
    id: 'rev-seed-001',
    source: 'orb-write',
    taskType: 'incident-record',
    status: 'blocked',
    riskLevel: 'critical',
    prompt: 'Draft an incident record for a safeguarding concern.',
    draftAnswer:
      'There was suspected abuse during contact. Staff definitely confirmed neglect and decided contact should be refused without further discussion.',
    context: 'Development-mode seeded event — internal evaluation only.',
    agentResults: [
      {
        agent: 'safeguarding',
        agentLabel: REVIEW_AGENT_LABELS.safeguarding,
        decision: 'block',
        flags: ['Risk terms present (abuse, neglect) without clear escalation language'],
        recommendation:
          'Recommend clearer escalation pathways, tentative language, and supportive guidance rather than directive decisions.',
        riskLevel: 'critical'
      },
      {
        agent: 'therapeutic-practice',
        agentLabel: REVIEW_AGENT_LABELS['therapeutic-practice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Therapeutic tone appears supportive.',
        riskLevel: 'low'
      },
      {
        agent: 'ofsted-evidence',
        agentLabel: REVIEW_AGENT_LABELS['ofsted-evidence'],
        decision: 'rewrite',
        flags: ['Weak evidence language — lacks specific observable detail'],
        recommendation: 'Recommend specific observations, timestamps, and clear links between action and impact.',
        riskLevel: 'medium'
      },
      {
        agent: 'child-voice',
        agentLabel: REVIEW_AGENT_LABELS['child-voice'],
        decision: 'rewrite',
        flags: ["No clear representation of the child or young person's voice"],
        recommendation: 'Recommend including what the child said, felt, or communicated where appropriate.',
        riskLevel: 'medium'
      },
      {
        agent: 'recording-quality',
        agentLabel: REVIEW_AGENT_LABELS['recording-quality'],
        decision: 'rewrite',
        flags: ['Observation, interpretation, and action are not clearly separated'],
        recommendation: 'Recommend separating what was observed, what was interpreted, and what action was taken.',
        riskLevel: 'medium'
      },
      {
        agent: 'send-neurodiversity',
        agentLabel: REVIEW_AGENT_LABELS['send-neurodiversity'],
        decision: 'pass',
        flags: [],
        recommendation: 'SEND and neurodiversity language appears careful.',
        riskLevel: 'low'
      },
      {
        agent: 'residential-practice',
        agentLabel: REVIEW_AGENT_LABELS['residential-practice'],
        decision: 'rewrite',
        flags: ['High-stakes incident may need manager oversight reference'],
        recommendation: 'Recommend realistic shift timelines and appropriate manager oversight for significant incidents.',
        riskLevel: 'high'
      },
      {
        agent: 'ethics-bias',
        agentLabel: REVIEW_AGENT_LABELS['ethics-bias'],
        decision: 'pass',
        flags: [],
        recommendation: 'Ethics and bias checks passed.',
        riskLevel: 'low'
      }
    ],
    reasonSummary:
      'Blocked — Safeguarding: Risk terms present (abuse, neglect) without clear escalation language. Safeguarding block takes highest priority.',
    createdAt: '2026-06-24T09:15:00Z',
    isDevelopment: true,
    isInternalEvaluation: true,
    origin: 'seeded',
    isRedacted: false,
    fullTextStored: true,
    founderReviewed: false,
    agentsPassed: 3,
    agentsRewrote: 4,
    agentsBlocked: 1
  },
  {
    id: 'rev-seed-002',
    source: 'orb-chat',
    taskType: 'chat-response',
    status: 'rewrite',
    riskLevel: 'high',
    prompt: 'How should I write up a behaviour incident?',
    draftAnswer:
      'The child was being defiant and manipulative again. Staff chose to sanction them because they refused to behave.',
    agentResults: [
      {
        agent: 'safeguarding',
        agentLabel: REVIEW_AGENT_LABELS.safeguarding,
        decision: 'pass',
        flags: [],
        recommendation: 'No safeguarding flags detected in this draft.',
        riskLevel: 'low'
      },
      {
        agent: 'therapeutic-practice',
        agentLabel: REVIEW_AGENT_LABELS['therapeutic-practice'],
        decision: 'rewrite',
        flags: ['Judgemental or labelling language (defiant, manipulative)'],
        recommendation: 'Recommend trauma-informed, non-judgemental phrasing that describes behaviour without labels.',
        riskLevel: 'high'
      },
      {
        agent: 'ofsted-evidence',
        agentLabel: REVIEW_AGENT_LABELS['ofsted-evidence'],
        decision: 'pass',
        flags: [],
        recommendation: 'Ofsted evidence checks apply mainly to record-writing tasks.',
        riskLevel: 'low'
      },
      {
        agent: 'child-voice',
        agentLabel: REVIEW_AGENT_LABELS['child-voice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Child voice checks apply mainly to record and incident writing.',
        riskLevel: 'low'
      },
      {
        agent: 'recording-quality',
        agentLabel: REVIEW_AGENT_LABELS['recording-quality'],
        decision: 'pass',
        flags: [],
        recommendation: 'Recording quality checks apply mainly to structured records.',
        riskLevel: 'low'
      },
      {
        agent: 'send-neurodiversity',
        agentLabel: REVIEW_AGENT_LABELS['send-neurodiversity'],
        decision: 'pass',
        flags: [],
        recommendation: 'SEND and neurodiversity language appears careful.',
        riskLevel: 'low'
      },
      {
        agent: 'residential-practice',
        agentLabel: REVIEW_AGENT_LABELS['residential-practice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Residential practice appears proportionate.',
        riskLevel: 'low'
      },
      {
        agent: 'ethics-bias',
        agentLabel: REVIEW_AGENT_LABELS['ethics-bias'],
        decision: 'rewrite',
        flags: ['Punitive wording detected'],
        recommendation: 'Recommend child-centred, non-punitive language free from stereotyping.',
        riskLevel: 'medium'
      }
    ],
    reasonSummary:
      'Rewrite recommended — Therapeutic Practice: Judgemental or labelling language (defiant, manipulative); Ethics & Bias: Punitive wording detected.',
    createdAt: '2026-06-24T11:42:00Z',
    isDevelopment: true,
    isInternalEvaluation: true,
    origin: 'seeded',
    isRedacted: false,
    fullTextStored: true,
    founderReviewed: false,
    agentsPassed: 6,
    agentsRewrote: 2,
    agentsBlocked: 0
  },
  {
    id: 'rev-seed-003',
    source: 'orb-dictate',
    taskType: 'daily-log',
    status: 'pass',
    riskLevel: 'low',
    prompt: 'Dictated daily log entry.',
    draftAnswer:
      'At 16:30 staff observed Jay sitting quietly in the lounge. Jay said they felt calmer after earlier support. Staff responded by offering a drink and updating the support plan. Action taken: informed on-call manager at 16:45.',
    agentResults: [
      {
        agent: 'safeguarding',
        agentLabel: REVIEW_AGENT_LABELS.safeguarding,
        decision: 'pass',
        flags: [],
        recommendation: 'No safeguarding flags detected in this draft.',
        riskLevel: 'low'
      },
      {
        agent: 'therapeutic-practice',
        agentLabel: REVIEW_AGENT_LABELS['therapeutic-practice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Therapeutic tone appears supportive.',
        riskLevel: 'low'
      },
      {
        agent: 'ofsted-evidence',
        agentLabel: REVIEW_AGENT_LABELS['ofsted-evidence'],
        decision: 'pass',
        flags: [],
        recommendation: 'Evidence language appears adequately specific.',
        riskLevel: 'low'
      },
      {
        agent: 'child-voice',
        agentLabel: REVIEW_AGENT_LABELS['child-voice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Child voice appears represented.',
        riskLevel: 'low'
      },
      {
        agent: 'recording-quality',
        agentLabel: REVIEW_AGENT_LABELS['recording-quality'],
        decision: 'pass',
        flags: [],
        recommendation: 'Recording structure appears clear.',
        riskLevel: 'low'
      },
      {
        agent: 'send-neurodiversity',
        agentLabel: REVIEW_AGENT_LABELS['send-neurodiversity'],
        decision: 'pass',
        flags: [],
        recommendation: 'SEND and neurodiversity language appears careful.',
        riskLevel: 'low'
      },
      {
        agent: 'residential-practice',
        agentLabel: REVIEW_AGENT_LABELS['residential-practice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Residential practice appears proportionate.',
        riskLevel: 'low'
      },
      {
        agent: 'ethics-bias',
        agentLabel: REVIEW_AGENT_LABELS['ethics-bias'],
        decision: 'pass',
        flags: [],
        recommendation: 'Ethics and bias checks passed.',
        riskLevel: 'low'
      }
    ],
    reasonSummary: 'All review agents passed — no flags raised in this internal evaluation.',
    createdAt: '2026-06-24T15:20:00Z',
    isDevelopment: true,
    isInternalEvaluation: true,
    origin: 'seeded',
    isRedacted: false,
    fullTextStored: true,
    founderReviewed: false,
    agentsPassed: 8,
    agentsRewrote: 0,
    agentsBlocked: 0
  },
  {
    id: 'rev-seed-004',
    source: 'orb-communicate',
    taskType: 'communication-draft',
    status: 'needs-founder-review',
    riskLevel: 'high',
    prompt: 'Draft a message to the placing authority.',
    draftAnswer:
      'The young person is obviously autistic and typical ADHD behaviour led to the incident. We decided for them that contact should be reduced for staff convenience.',
    agentResults: [
      {
        agent: 'safeguarding',
        agentLabel: REVIEW_AGENT_LABELS.safeguarding,
        decision: 'pass',
        flags: [],
        recommendation: 'No safeguarding flags detected in this draft.',
        riskLevel: 'low'
      },
      {
        agent: 'therapeutic-practice',
        agentLabel: REVIEW_AGENT_LABELS['therapeutic-practice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Therapeutic tone appears supportive.',
        riskLevel: 'low'
      },
      {
        agent: 'ofsted-evidence',
        agentLabel: REVIEW_AGENT_LABELS['ofsted-evidence'],
        decision: 'pass',
        flags: [],
        recommendation: 'Ofsted evidence checks apply mainly to record-writing tasks.',
        riskLevel: 'low'
      },
      {
        agent: 'child-voice',
        agentLabel: REVIEW_AGENT_LABELS['child-voice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Child voice checks apply mainly to record and incident writing.',
        riskLevel: 'low'
      },
      {
        agent: 'recording-quality',
        agentLabel: REVIEW_AGENT_LABELS['recording-quality'],
        decision: 'pass',
        flags: [],
        recommendation: 'Recording quality checks apply mainly to structured records.',
        riskLevel: 'low'
      },
      {
        agent: 'send-neurodiversity',
        agentLabel: REVIEW_AGENT_LABELS['send-neurodiversity'],
        decision: 'rewrite',
        flags: ['Diagnosis or clinical attribution risk — avoid stating conditions as fact'],
        recommendation: 'Recommend describing observed needs and adjustments without diagnostic certainty or stereotypes.',
        riskLevel: 'high'
      },
      {
        agent: 'residential-practice',
        agentLabel: REVIEW_AGENT_LABELS['residential-practice'],
        decision: 'pass',
        flags: [],
        recommendation: 'Residential practice appears proportionate.',
        riskLevel: 'low'
      },
      {
        agent: 'ethics-bias',
        agentLabel: REVIEW_AGENT_LABELS['ethics-bias'],
        decision: 'rewrite',
        flags: ['Adult-centred language detected'],
        recommendation: 'Recommend child-centred, non-punitive language free from stereotyping.',
        riskLevel: 'medium'
      }
    ],
    reasonSummary:
      'Needs founder review — SEND & Neurodiversity: Diagnosis or clinical attribution risk — avoid stating conditions as fact; Ethics & Bias: Adult-centred language detected.',
    createdAt: '2026-06-23T18:05:00Z',
    isDevelopment: true,
    isInternalEvaluation: true,
    origin: 'seeded',
    isRedacted: false,
    fullTextStored: true,
    founderReviewed: false,
    agentsPassed: 6,
    agentsRewrote: 2,
    agentsBlocked: 0
  }
]

let events: ReviewEvent[] = [...SEEDED_REVIEW_EVENTS]
let lastReviewEventId: string | null = events[0]?.id ?? null

function emptyStatusCounts(): Record<ReviewStatus, number> {
  return {
    pass: 0,
    rewrite: 0,
    blocked: 0,
    'needs-founder-review': 0,
    reviewed: 0
  }
}

function emptyRiskCounts(): Record<ReviewRiskLevel, number> {
  return { critical: 0, high: 0, medium: 0, low: 0 }
}

function applyFilter(source: ReviewEvent[], filter?: ReviewEventFilter): ReviewEvent[] {
  let result = [...source]

  if (filter?.source) result = result.filter((e) => e.source === filter.source)
  if (filter?.taskType) result = result.filter((e) => e.taskType === filter.taskType)
  if (filter?.status) result = result.filter((e) => e.status === filter.status)
  if (filter?.riskLevel) result = result.filter((e) => e.riskLevel === filter.riskLevel)
  if (filter?.developmentOnly) result = result.filter((e) => e.isDevelopment)

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (filter?.limit && filter.limit > 0) {
    result = result.slice(0, filter.limit)
  }

  return result
}

export function listReviewEvents(filter?: ReviewEventFilter): ReviewEvent[] {
  return applyFilter(events, filter)
}

export function getReviewEventById(id: string): ReviewEvent | undefined {
  return events.find((event) => event.id === id)
}

export function createReviewEvent(input: CreateReviewEventInput): ReviewEvent {
  const event = runReviewEngine({
    source: input.source,
    taskType: input.taskType,
    prompt: input.prompt,
    draftAnswer: input.draftAnswer,
    context: input.context,
    isDevelopment: input.isDevelopment ?? true,
    origin: 'internal-test',
    isRedacted: false,
    fullTextStored: true
  })
  events.unshift(event)
  lastReviewEventId = event.id
  return event
}

/** Store a shadow review event produced by the ORB adapter (already reviewed and redacted). */
export function storeShadowReviewEvent(event: ReviewEvent): ReviewEvent {
  events.unshift(event)
  lastReviewEventId = event.id
  return event
}

export function summariseReviewEvents(filter?: ReviewEventFilter): ReviewEventSummary {
  const filtered = applyFilter(events, filter)
  const byStatus = emptyStatusCounts()
  const byRisk = emptyRiskCounts()
  const bySource: Partial<Record<ReviewSource, number>> = {}

  for (const event of filtered) {
    byStatus[event.status] += 1
    byRisk[event.riskLevel] += 1
    bySource[event.source] = (bySource[event.source] ?? 0) + 1
  }

  return {
    total: filtered.length,
    byStatus,
    byRisk,
    bySource,
    needsFounderAttention: filtered.filter((e) => FOUNDER_ACTION_ELIGIBLE_STATUSES.includes(e.status)).length,
    developmentModeCount: filtered.filter((e) => e.isDevelopment).length
  }
}

export function markReviewEventReviewed(id: string): ReviewEvent | undefined {
  const event = events.find((e) => e.id === id)
  if (!event) return undefined
  event.status = 'reviewed'
  event.founderReviewed = true
  return event
}

export function resetReviewEventStoreForTests(): void {
  events = [...SEEDED_REVIEW_EVENTS]
  lastReviewEventId = events[0]?.id ?? null
}

export function getLastReviewEventId(): string | null {
  return lastReviewEventId
}
