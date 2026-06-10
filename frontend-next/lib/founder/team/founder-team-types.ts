export type FounderStaffDepartment =
  | 'Executive'
  | 'Product'
  | 'Engineering'
  | 'Regulation'
  | 'Growth'
  | 'Brand'
  | 'Finance'
  | 'Safety'
  | 'Partnerships'

export type FounderStaffPermission =
  | 'readTelemetry'
  | 'readFounderData'
  | 'draftContent'
  | 'createActions'
  | 'recommendProduct'
  | 'recommendTechnicalWork'
  | 'reviewQuality'
  | 'draftExternalPost'
  | 'draftEmail'
  | 'publishExternalContent'

export type FounderStaffAgentId =
  | 'chief-of-staff'
  | 'cto'
  | 'lead-developer'
  | 'product-director'
  | 'ofsted-regulation'
  | 'orb-quality'
  | 'customer-success'
  | 'growth'
  | 'brand-ambassador'
  | 'investor-relations'
  | 'finance-ai-cost'
  | 'sector-intelligence'
  | 'data-protection-safety'
  | 'partnerships'
  | 'evidence-pack'

export type FounderStaffAgentStatus = 'active' | 'idle' | 'monitoring' | 'awaiting-approval'

export type FounderStaffDepartmentStatus = 'healthy' | 'watch' | 'at-risk' | 'unavailable' | 'unknown'

export type FounderStaffDepartmentOwnership = {
  departmentId: string
  departmentName: string
  departmentStatus: FounderStaffDepartmentStatus
  kpiInterpretation: string[]
  recommendedDecisions: string[]
  actionsCreated: string[]
  blockers: string[]
  thomasDecisions: string[]
}

export type FounderStaffAgentOutput = {
  summary: string
  findings: string[]
  recommendations: string[]
  actions: string[]
  risks: string[]
  confidence: 'high' | 'medium' | 'low'
  requiresApproval: boolean
  departmentOwnership?: FounderStaffDepartmentOwnership
}

export type FounderStaffAgent = {
  id: FounderStaffAgentId
  name: string
  roleTitle: string
  department: FounderStaffDepartment
  status: FounderStaffAgentStatus
  purpose: string
  responsibilities: string[]
  permissions: Record<FounderStaffPermission, boolean>
  dataSources: string[]
  run: () => FounderStaffAgentOutput
  generateActions: () => string[]
  generateBriefing: () => string
}

export type FounderStaffExecutionLog = {
  id: string
  agentId: FounderStaffAgentId
  timestamp: string
  level: 'info' | 'warn' | 'success'
  message: string
}

export type FounderStaffTeamOverview = {
  activeAgents: number
  pendingApprovals: number
  openActions: number
  telemetryStatus: 'live' | 'empty'
  topPriority: string
}
