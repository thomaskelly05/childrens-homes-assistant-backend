/**
 * IndiCare Autonomous Intelligence Scheduler — task model and safety contracts.
 * Internal-brain work may run automatically; live LLM and external actions require approval.
 */

export type SchedulerTaskType =
  | 'internal_brain_quick_check'
  | 'internal_brain_rotating_micro_check'
  | 'internal_brain_focused_check'
  | 'internal_brain_adversarial'
  | 'internal_brain_high_risk'
  | 'internal_brain_full'
  | 'coverage_gap_scan'
  | 'synthetic_scenario_generation'
  | 'learning_proposal_creation'
  | 'benchmark_bank_review'
  | 'live_llm_adversarial_recommendation'
  | 'live_llm_high_risk_recommendation'
  | 'live_llm_gold_recommendation'
  | 'daily_business_report'
  | 'daily_founder_email_report'
  | 'weekly_founder_email_report'
  | 'weekly_internal_brain_residential_audit'
  | 'finance_snapshot'
  | 'revenue_pipeline_review'

export type SchedulerAllowedMode = 'internal_brain_only' | 'recommendation_only' | 'report_only' | 'blocked'

export type SchedulerTaskStatus = 'idle' | 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_approval'

export type SchedulerFrequency =
  | { kind: 'interval'; hours: number }
  | { kind: 'interval_minutes'; minutes: number }
  | { kind: 'daily'; hourUtc: number; minuteUtc?: number }
  | { kind: 'daily_local'; hour: number; minute: number; timezone: string }
  | { kind: 'weekly'; dayOfWeek: number; hourUtc: number; minuteUtc?: number }
  | { kind: 'manual_only' }

export type SchedulerTaskMetadata = {
  timezone?: string
  localScheduleLabel?: string
  description?: string
}

export type SchedulerTask = {
  id: string
  name: string
  taskType: SchedulerTaskType
  enabled: boolean
  frequency: SchedulerFrequency
  metadata?: SchedulerTaskMetadata
  lastRunAt: string | null
  nextRunAt: string | null
  status: SchedulerTaskStatus
  allowedMode: SchedulerAllowedMode
  approvalRequired: boolean
  maxRunsPerDay: number
  maxScenarioCount: number
  createdEvents: string[]
  auditRecordIds: string[]
  runsToday: number
  lastRunDate: string | null
}

export type SchedulerTaskRunStatus =
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'awaiting_approval'
  | 'redacted'
  | 'blocked'

export type SchedulerTaskRunResult = {
  taskId: string
  taskType: SchedulerTaskType
  startedAt: string
  completedAt: string
  status: SchedulerTaskRunStatus
  summary: string
  eventIds: string[]
  auditRecordIds: string[]
  approvalItemIds: string[]
  criticalFailures: number
  weaknessesDetected: number
  proposalsCreated: number
  error?: string
  errorCode?: string
  safeMessage?: string
  technicalMessage?: string
  emailReportId?: string
  redactionCount?: number
  safetyStatus?: EmailSafetyStatus
}

export type EmailSafetyStatus = 'passed' | 'redacted' | 'blocked'

export type EmailReportRedaction = {
  sectionKey: string
  reason: string
}

export type EmailReportPreview = {
  recipient: string
  provider: EmailReportSettings['provider']
  subject: string
  generatedAt: string
  sections: Record<string, string[]>
  redactions: EmailReportRedaction[]
  safetyStatus: EmailSafetyStatus
  redactionCount: number
  noRealChildDataConfirmed: boolean
  approvalItems: string[]
}

export type LiveLlmGateStatus = {
  internalAdversarialPassed: boolean
  internalHighRiskPassed: boolean
  liveAdversarialApproved: boolean
  liveAdversarialPassed: boolean
  liveHighRiskApproved: boolean
  liveHighRiskPassed: boolean
  liveGoldApproved: boolean
  liveGoldPassed: boolean
  expandedScenarioApproved: boolean
  currentRecommendation: LiveLlmRecommendation | null
  pendingApprovals: LiveLlmApprovalItem[]
}

export type LiveLlmRecommendation =
  | 'approve_live_adversarial'
  | 'approve_live_high_risk'
  | 'approve_live_gold'
  | 'approve_expanded_scenario'

export type LiveLlmApprovalItem = {
  id: string
  recommendation: LiveLlmRecommendation
  title: string
  reason: string
  previousGateStatus: string
  expectedOutcome: string
  estimatedCostGbp: number | null
  estimatedRisk: 'low' | 'medium' | 'high' | 'critical'
  safetyNotes: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  scenarioCount?: number
}

export type ApprovalCategory =
  | 'live_llm_run'
  | 'learning_proposal'
  | 'benchmark_scenario'
  | 'build_brief'
  | 'draft_pr'
  | 'governance_review'
  | 'finance_decision'
  | 'content_public_communication'
  | 'relationship_outreach'

export type EmailReportType = 'daily' | 'weekly'

export type EmailReportContent = {
  type: EmailReportType
  subject: string
  recipient: string
  htmlBody: string
  textBody: string
  generatedAt: string
  sections: Record<string, string[]>
}

export type EmailReportRecord = {
  id: string
  type: EmailReportType
  recipient: string
  subject: string
  generatedAt: string
  sentAt: string | null
  status: 'generated' | 'sent' | 'failed' | 'dry_run' | 'blocked' | 'redacted'
  auditRecordId: string
  error?: string
  safetyStatus?: EmailSafetyStatus
  redactionCount?: number
  preview?: EmailReportPreview
}

export type DailyBusinessReportSectionKey =
  | 'executiveSummary'
  | 'autonomousIntelligenceLoop'
  | 'orbInternalBrain'
  | 'liveLlmGate'
  | 'qualityLab'
  | 'prsAndBuild'
  | 'governance'
  | 'revenue'
  | 'finance'
  | 'relationships'
  | 'contentBrand'
  | 'technical'
  | 'tomApproval'

export type EmailReportSettings = {
  recipient: string
  dailyEnabled: boolean
  weeklyEnabled: boolean
  /** @deprecated Use dailyHourLocal with dailyTimezone */
  dailyHourUtc: number
  /** @deprecated Use dailyMinuteLocal with dailyTimezone */
  dailyMinuteUtc: number
  dailyHourLocal: number
  dailyMinuteLocal: number
  dailyTimezone: string
  weeklyDayOfWeek: number
  weeklyHourUtc: number
  provider: 'smtp' | 'resend' | 'sendgrid' | 'postmark' | 'dry_run'
  dryRun: boolean
  businessReportEnabled: boolean
  includedSections: DailyBusinessReportSectionKey[]
  founderConfirmedSend: boolean
}

export type AutonomousLoopHealthStatus = 'healthy' | 'needs_attention' | 'blocked' | 'untested'

export type AutonomousLoopHealthSummary = {
  status: AutonomousLoopHealthStatus
  latestMicroCheck: { status: string; completedAt: string | null; summary: string }
  latestFocusedCheck: { status: string; completedAt: string | null; summary: string }
  latestFullBenchmark: { status: string; completedAt: string | null; summary: string }
  latestBrainAudit: { updatedAt: string | null; lastUpdatedFrom: string | null; coveragePercent: number | null }
  openLearningProposals: number
  approvalQueueCount: number
  nextScheduledRun: string | null
  failedTasks: string[]
  businessReportStatus: string
  href: '/founder/autonomy' | '/founder/intelligence-centre/brain-audit'
}

export type AutonomyLoopStateStatus = {
  seeded: boolean
  loadWarning?: string
  statusMessage?: string
}

export type AutonomyOverview = {
  tasks: SchedulerTask[]
  liveLlmGate: LiveLlmGateStatus
  emailSettings: EmailReportSettings
  emailHistory: EmailReportRecord[]
  safetyGates: string[]
  lastSchedulerTick: string | null
  loopHealth: AutonomousLoopHealthSummary
  loopState?: AutonomyLoopStateStatus
}

export const SCHEDULER_SAFETY_GATES = [
  'Internal brain testing may run automatically',
  'Live LLM testing requires approval by default',
  'No auto-merge',
  'No auto-send external customer emails',
  'No auto-publish',
  'Failed runs remain visible',
  'Launch gates cannot be overridden',
  'Tom remains approval gate'
] as const
