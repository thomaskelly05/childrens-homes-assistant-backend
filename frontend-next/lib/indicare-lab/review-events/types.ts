export type ReviewSource =
  | 'orb-chat'
  | 'orb-write'
  | 'orb-dictate'
  | 'orb-voice'
  | 'orb-communicate'
  | 'founder-lab-test'

export type ReviewTaskType =
  | 'chat-response'
  | 'incident-record'
  | 'daily-log'
  | 'handover-note'
  | 'behaviour-record'
  | 'safeguarding-record'
  | 'communication-draft'
  | 'voice-transcript'
  | 'dictation-draft'

export type ReviewStatus =
  | 'pass'
  | 'rewrite'
  | 'blocked'
  | 'needs-founder-review'
  | 'reviewed'

export type ReviewRiskLevel = 'critical' | 'high' | 'medium' | 'low'

export type ReviewAgentDecision = 'pass' | 'rewrite' | 'block'

export type ReviewAgentName =
  | 'safeguarding'
  | 'therapeutic-practice'
  | 'ofsted-evidence'
  | 'child-voice'
  | 'recording-quality'
  | 'send-neurodiversity'
  | 'residential-practice'
  | 'ethics-bias'

export type ReviewAgentResult = {
  agent: ReviewAgentName
  agentLabel: string
  decision: ReviewAgentDecision
  flags: string[]
  recommendation: string
  riskLevel: ReviewRiskLevel
}

export type ReviewEvent = {
  id: string
  source: ReviewSource
  taskType: ReviewTaskType
  status: ReviewStatus
  riskLevel: ReviewRiskLevel
  prompt?: string
  draftAnswer: string
  context?: string
  agentResults: ReviewAgentResult[]
  reasonSummary: string
  createdAt: string
  isDevelopment: boolean
  isInternalEvaluation: boolean
  founderReviewed?: boolean
  agentsPassed: number
  agentsRewrote: number
  agentsBlocked: number
}

export type ReviewEventSummary = {
  total: number
  byStatus: Record<ReviewStatus, number>
  byRisk: Record<ReviewRiskLevel, number>
  bySource: Partial<Record<ReviewSource, number>>
  needsFounderAttention: number
  developmentModeCount: number
}

export type ReviewEventFilter = {
  source?: ReviewSource
  taskType?: ReviewTaskType
  status?: ReviewStatus
  riskLevel?: ReviewRiskLevel
  developmentOnly?: boolean
  limit?: number
}

export const REVIEW_AGENT_LABELS: Record<ReviewAgentName, string> = {
  safeguarding: 'Safeguarding',
  'therapeutic-practice': 'Therapeutic Practice',
  'ofsted-evidence': 'Ofsted Evidence',
  'child-voice': 'Child Voice',
  'recording-quality': 'Recording Quality',
  'send-neurodiversity': 'SEND & Neurodiversity',
  'residential-practice': 'Residential Practice',
  'ethics-bias': 'Ethics & Bias'
}

export const REVIEW_SOURCE_LABELS: Record<ReviewSource, string> = {
  'orb-chat': 'ORB Chat',
  'orb-write': 'ORB Write',
  'orb-dictate': 'ORB Dictate',
  'orb-voice': 'ORB Voice',
  'orb-communicate': 'ORB Communicate',
  'founder-lab-test': 'Founder Lab Test'
}

export const REVIEW_TASK_TYPE_LABELS: Record<ReviewTaskType, string> = {
  'chat-response': 'Chat response',
  'incident-record': 'Incident record',
  'daily-log': 'Daily log',
  'handover-note': 'Handover note',
  'behaviour-record': 'Behaviour record',
  'safeguarding-record': 'Safeguarding record',
  'communication-draft': 'Communication draft',
  'voice-transcript': 'Voice transcript',
  'dictation-draft': 'Dictation draft'
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pass: 'Passed',
  rewrite: 'Rewrite recommended',
  blocked: 'Blocked',
  'needs-founder-review': 'Needs founder review',
  reviewed: 'Reviewed by founder'
}

export const FOUNDER_ACTION_ELIGIBLE_STATUSES: ReviewStatus[] = [
  'rewrite',
  'blocked',
  'needs-founder-review'
]
