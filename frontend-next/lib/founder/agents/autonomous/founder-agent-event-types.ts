import type {
  FounderAgentActionType,
  FounderAgentId,
  FounderAgentRiskLevel
} from './founder-agent-types'

export type FounderAgentEventType =
  | 'evaluation_run_completed'
  | 'evaluation_run_failed'
  | 'critical_failure_detected'
  | 'high_risk_failure_detected'
  | 'adversarial_failure_detected'
  | 'gold_run_missing'
  | 'launch_gate_blocked'
  | 'privacy_review_missing'
  | 'retention_review_missing'
  | 'coverage_area_weak'
  | 'deploy_completed'
  | 'deploy_failed'
  | 'build_failed'
  | 'api_error_detected'
  | 'provider_error_detected'
  | 'new_pr_created'
  | 'pr_merged'
  | 'pilot_feedback_received'
  | 'demo_request_received'
  | 'content_milestone_reached'
  | 'scenario_generation_recommended'

export type FounderAgentEventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type FounderAgentEventSource =
  | 'orb_evaluation'
  | 'quality_lab'
  | 'deploy'
  | 'pr_workflow'
  | 'governance'
  | 'telemetry'
  | 'relationships'
  | 'content'

export type FounderAgentEvent = {
  id: string
  type: FounderAgentEventType
  source: FounderAgentEventSource
  createdAt: string
  severity: FounderAgentEventSeverity
  title: string
  summary: string
  relatedRunId?: string
  relatedScenarioIds?: string[]
  relatedPrUrl?: string
  relatedRoute?: string
  affectedAgents: FounderAgentId[]
  payload: Record<string, unknown>
  requiresReview: boolean
  processed: boolean
  processedAt?: string
  resultingRecommendations?: string[]
  auditRecordId?: string
}

export type FounderAgentRecommendation = {
  id: string
  eventId: string
  agentId: FounderAgentId
  createdAt: string
  recommendation: string
  rationale: string
  riskLevel: FounderAgentRiskLevel
  proposedAction: FounderAgentActionType
  approvalRequired: boolean
  approvalItemId?: string
  auditRecordId?: string
}

export type FounderAgentApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'completed'
  | 'reviewed'

export type FounderAutonomyLoopStatus = {
  settings: import('./founder-agent-types').FounderAutonomySettings
  lastAutonomousLoopRun: string | null
  lastAutonomousLoopTrigger: import('./founder-agent-types').FounderAutonomousLoopTrigger | null
  nextSuggestedAction: string
  safetyGatesActive: string[]
}
