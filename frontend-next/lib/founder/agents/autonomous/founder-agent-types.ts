export type FounderAgentPermissionLevel =
  | 'observe_only'
  | 'prepare_only'
  | 'approval_required'
  | 'system_action_allowed'

export type FounderAgentForbiddenAction =
  | 'auto_merge'
  | 'auto_publish'
  | 'auto_send_external_email'
  | 'auto_override_launch_gate'
  | 'auto_delete_failed_runs'
  | 'auto_weaken_safety_scoring'

export type FounderAgentActionType =
  | 'analyse_latest_run'
  | 'generate_build_brief'
  | 'create_draft_pr_summary'
  | 'run_synthetic_evaluation'
  | 'generate_synthetic_scenarios'
  | 'update_coverage_map'
  | 'draft_founder_update'
  | 'draft_linkedin_post'
  | 'draft_provider_email'
  | 'draft_partner_follow_up'
  | 'prepare_launch_gate_evidence'
  | 'prepare_privacy_review_prompt'
  | 'prepare_retention_review_prompt'
  | 'create_risk_register_entry'
  | 'create_product_build_brief'
  | 'create_technical_fix_brief'
  | 'create_pilot_summary'
  | 'create_audit_note'

export type FounderAgentId =
  | 'founder-chief-of-staff'
  | 'orb-quality-agent'
  | 'safeguarding-agent'
  | 'ofsted-regulation-agent'
  | 'product-agent'
  | 'technical-agent'
  | 'ux-recording-agent'
  | 'evidence-agent'
  | 'governance-agent'
  | 'content-agent'
  | 'revenue-agent'
  | 'relationship-agent'
  | 'pilot-agent'

export type FounderAgentStatus = 'active' | 'monitoring' | 'idle' | 'awaiting-approval' | 'blocked'

export type FounderAgentRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type FounderAgentConfidence = 'high' | 'medium' | 'low'

export type FounderAgentAuditEntry = {
  id: string
  agentId: FounderAgentId
  actionType: FounderAgentActionType | 'orchestrate' | 'approval_decision'
  timestamp: string
  summary: string
  decision?: 'approved' | 'rejected' | 'pending' | 'changes_requested'
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected'
  relatedRunId?: string
  relatedPrId?: string
  relatedDocumentId?: string
  actor?: string
}

export type FounderAgentActionResult = {
  summary: string
  rationale: string
  riskLevel: FounderAgentRiskLevel
  affectedArea: string
  approvalRequired: boolean
  suggestedNextStep: string
  auditRecord: FounderAgentAuditEntry
}

export type FounderAgentDefinition = {
  id: FounderAgentId
  name: string
  roleTitle: string
  purpose: string
  scope: string[]
  permissions: FounderAgentPermissionLevel
  forbiddenActions: FounderAgentForbiddenAction[]
  approvalRequirements: string[]
  connectedSignals: string[]
  availablePreparedActions: FounderAgentActionType[]
  requiresFounderApproval: boolean
}

export type FounderAgentLiveState = FounderAgentDefinition & {
  status: FounderAgentStatus
  confidence: FounderAgentConfidence
  riskLevel: FounderAgentRiskLevel
  lastActivity: string | null
  recommendedNextAction: string
  currentFocus: string
  auditTrailEntries: FounderAgentAuditEntry[]
}

export type FounderChiefOfStaffBrief = {
  generatedAt: string
  whatChanged: string[]
  whatIsBlocked: string[]
  whatNeedsApproval: string[]
  whatIsRisky: string[]
  whatShouldBeTestedNext: string[]
  prsAwaitingReview: string[]
  launchGateBlockers: string[]
  commercialRelationshipActionsWaiting: string[]
  topPriorities: string[]
}

export type FounderAgentApprovalItem = {
  id: string
  agentId: FounderAgentId
  actionType: FounderAgentActionType
  title: string
  summary: string
  riskLevel: FounderAgentRiskLevel
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  createdAt: string
  decidedAt?: string
  decidedBy?: string
}

export type FounderAutonomySettings = {
  autoRunAfterDeploy: boolean
  autoRunNightly: boolean
  autoCreateDraftPR: boolean
  requireApprovalForPRCreation: boolean
  maxScenarioRunsPerDay: number
  allowedPacks: string[]
}

export type FounderAutonomousLoopTrigger =
  | 'after_deploy_completed'
  | 'after_pr_merged'
  | 'manual_founder_trigger'
  | 'scheduled_nightly_synthetic'

export type FounderAutonomousLoopResult = {
  trigger: FounderAutonomousLoopTrigger
  startedAt: string
  completedAt: string
  syntheticRunRecommended: boolean
  analysisSummary: string
  coverageUpdated: boolean
  failureClassified: boolean
  buildBriefPrepared: boolean
  draftPrPrepared: boolean
  auditRecorded: boolean
  founderApprovalRequired: boolean
  autoMergeAttempted: false
  recommendations: string[]
}

export type FounderCoverageAreaId =
  | 'missing_from_home'
  | 'self_harm'
  | 'suicidal_ideation'
  | 'cse'
  | 'cce'
  | 'online_harm'
  | 'radicalisation'
  | 'allegations_against_staff'
  | 'whistleblowing'
  | 'medication'
  | 'physical_intervention_restraint'
  | 'reg_20'
  | 'reg_44'
  | 'reg_45'
  | 'daily_records'
  | 'incident_reflection'
  | 'care_planning'
  | 'risk_assessment'
  | 'supervision'
  | 'management_oversight'
  | 'child_voice'
  | 'autism_communication_needs'
  | 'global_developmental_delay'
  | 'equality_disability'
  | 'family_contact'
  | 'education'
  | 'health_appointments'
  | 'complaints'
  | 'professional_meetings'
  | 'data_protection'
  | 'ofsted_readiness'

export type FounderCoverageStrength = 'untested' | 'weak' | 'moderate' | 'strong'

export type FounderCoverageArea = {
  id: FounderCoverageAreaId
  label: string
  scenariosRun: number
  passRate: number | null
  criticalFailures: number
  lastTested: string | null
  coverageStrength: FounderCoverageStrength
  weakMarkers: string[]
  recommendedNewScenarios: string[]
  benchmarkCoverageExists: boolean
}

export type FounderCoverageMap = {
  generatedAt: string
  areas: FounderCoverageArea[]
  weakAreas: FounderCoverageAreaId[]
  untestedAreas: FounderCoverageAreaId[]
  overallStrength: FounderCoverageStrength
}

export type FounderAgentContext = {
  qualityRuns?: import('@/lib/founder/quality-lab/quality-lab-types').QualityRun[]
  evaluationRuns?: import('@/lib/orb/evaluation/orb-evaluation-types').OrbEvaluationRun[]
  whistleblowingCovered?: boolean
  privacyRetentionReviewed?: boolean
  pendingApprovals?: number
}
