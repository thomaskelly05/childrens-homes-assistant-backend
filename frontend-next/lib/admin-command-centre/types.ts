/** Admin Command Centre shared types — operational SaaS console for ORB Residential. */

export type AdminDataMode = 'development' | 'live' | 'mixed'

export type AdminSectionId =
  | 'overview'
  | 'users'
  | 'providers'
  | 'homes'
  | 'live-usage'
  | 'safety-flags'
  | 'abuse-bots'
  | 'onboarding'
  | 'offboarding'
  | 'marketing'
  | 'support'
  | 'audit-log'
  | 'settings'

export type UserStatus = 'active' | 'invited' | 'disabled' | 'suspended' | 'deleted'

export type ProviderStatus = 'active' | 'paused' | 'onboarding' | 'offboarding' | 'suspended'

export type HomeStatus = 'active' | 'onboarding' | 'disabled' | 'pilot' | 'live'

export type SafetyFlagType =
  | 'fabricated-record-request'
  | 'hide-incident-request'
  | 'unsafe-safeguarding-wording'
  | 'abusive-prompt'
  | 'repeated-high-risk'
  | 'content-policy-trigger'

export type SafetyFlagStatus = 'open' | 'reviewing' | 'resolved' | 'escalated'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type AbuseIndicatorType =
  | 'failed-login-spike'
  | 'rate-limit-warning'
  | 'suspicious-signup'
  | 'password-reset-abuse'
  | 'unusual-request-volume'
  | 'disposable-email'

export type AbuseIndicatorStatus = 'open' | 'investigating' | 'resolved' | 'dismissed'

export type MarketingLeadStage =
  | 'new'
  | 'contacted'
  | 'demo-booked'
  | 'pilot'
  | 'converted'
  | 'lost'

export type MarketingLeadType =
  | 'demo-request'
  | 'pilot-request'
  | 'newsletter'
  | 'provider-interest'

export type SupportTicketType =
  | 'password-reset'
  | 'locked-account'
  | 'invite-issue'
  | 'onboarding-help'
  | 'bug-report'
  | 'escalation'

export type SupportTicketStatus = 'pending' | 'in-progress' | 'resolved' | 'escalated'

export type AuditRiskLevel = 'low' | 'medium' | 'high'

export type AuditStatus = 'completed' | 'pending' | 'failed'

export type OnboardingChecklistItemId =
  | 'provider-created'
  | 'home-created'
  | 'manager-invited'
  | 'staff-invited'
  | 'roles-assigned'
  | 'safeguarding-accepted'
  | 'first-orb-use'
  | 'first-test-record'
  | 'training-completed'
  | 'ready-for-pilot'

export type OffboardingStepId =
  | 'disable-access'
  | 'revoke-sessions'
  | 'export-data'
  | 'retention-status'
  | 'deletion-scheduled'

export type OrbStation = 'chat' | 'write' | 'dictate' | 'voice' | 'communicate'

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  provider: string
  home: string
  status: UserStatus
  lastLogin: string | null
  createdAt: string
  riskFlags: string[]
}

export type AdminProvider = {
  id: string
  name: string
  status: ProviderStatus
  homesCount: number
  usersCount: number
  onboardingStage: string
  subscriptionStatus: string
  riskFlags: string[]
  supportFlags: string[]
}

export type AdminHome = {
  id: string
  name: string
  provider: string
  registeredManager: string
  status: HomeStatus
  usersCount: number
  activeStations: OrbStation[]
  onboardingStatus: string
  riskFlags: string[]
}

export type SafetyFlag = {
  id: string
  type: SafetyFlagType
  status: SafetyFlagStatus
  severity: Severity
  user: string
  provider: string
  home: string
  createdAt: string
  summary: string
}

export type AbuseIndicator = {
  id: string
  type: AbuseIndicatorType
  status: AbuseIndicatorStatus
  severity: Severity
  subject: string
  detail: string
  createdAt: string
}

export type OnboardingWorkflow = {
  id: string
  provider: string
  home: string
  checklist: Record<OnboardingChecklistItemId, boolean>
  overallProgress: number
}

export type OffboardingWorkflow = {
  id: string
  provider: string
  home: string
  leavingReason: string
  steps: Record<OffboardingStepId, 'pending' | 'completed' | 'scheduled' | 'n/a'>
  finalStatus: string
}

export type MarketingLead = {
  id: string
  type: MarketingLeadType
  contact: string
  organisation: string
  stage: MarketingLeadStage
  source: string
  createdAt: string
  nextAction: string
}

export type SupportTicket = {
  id: string
  type: SupportTicketType
  subject: string
  requester: string
  provider: string
  status: SupportTicketStatus
  createdAt: string
  priority: Severity
}

export type AuditLogEntry = {
  id: string
  actor: string
  action: string
  targetType: string
  target: string
  timestamp: string
  riskLevel: AuditRiskLevel
  reason: string
  status: AuditStatus
}

export type UsageActivity = {
  id: string
  user: string
  station: OrbStation
  action: string
  timestamp: string
  metadataOnly: true
}

export type AdminOverviewMetrics = {
  totalUsers: number
  activeUsers: number
  disabledUsers: number
  invitedUsers: number
  providers: number
  homes: number
  openSafetyFlags: number
  suspiciousActivityAlerts: number
  onboardingProviders: number
  supportActionsPending: number
}

export type LiveUsageMetrics = {
  activeUsersToday: number
  activeUsersThisWeek: number
  stationUsage: Record<OrbStation, number>
  totalRequests: number
  failedRequests: number
  averageResponseTimeMs: number | null
  latestActivity: UsageActivity[]
}

export type AdminActionKind =
  | 'resend-invite'
  | 'force-password-reset'
  | 'disable-user'
  | 'reactivate-user'
  | 'revoke-sessions'
  | 'pause-provider'
  | 'add-home'
  | 'invite-manager'
  | 'assign-manager'
  | 'disable-home'
  | 'review-flag'
  | 'resolve-flag'
  | 'escalate-flag'
  | 'suspend-user'
  | 'mark-safe'
  | 'lock-account'
  | 'require-password-reset'
  | 'investigate'

export type AdminActionDescriptor = {
  kind: AdminActionKind
  label: string
  wired: boolean
  description?: string
}
