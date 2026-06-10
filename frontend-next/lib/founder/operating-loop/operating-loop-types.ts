import type { FounderStaffAgentId } from '@/lib/founder/team/founder-team-types'

export type OperatingLoopRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'

export type FounderOperatingLoopPlan = {
  runQualitySample: boolean
  runStaffAgents: boolean
  generateActions: boolean
  generateContentDrafts: boolean
  generateBuildBriefs: boolean
  generateApprovals: boolean
}

export type FounderOperatingLoopStaffAgentRun = {
  agentId: FounderStaffAgentId
  label: string
  status: 'complete' | 'failed' | 'skipped'
  completedAt?: string
  errorSummary?: string
}

export type FounderOperatingLoopRun = {
  id: string
  status: OperatingLoopRunStatus
  startedAt: string
  completedAt?: string
  triggeredBy: string
  dataBasis: string
  telemetrySummary: string
  qualityLabSummary: string
  staffAgentsRun: FounderOperatingLoopStaffAgentRun[]
  actionsCreated: string[]
  approvalsCreated: string[]
  draftsCreated: string[]
  buildBriefsCreated: string[]
  risksIdentified: string[]
  recommendedFounderDecisions: string[]
  strategicAlignment: string[]
  auditLogIds: string[]
  errors: string[]
}

/** @deprecated Use FounderOperatingLoopRun — kept for legacy persisted records */
export type OperatingLoopStep = {
  id: string
  agentId: string
  label: string
  status: 'pending' | 'running' | 'complete' | 'skipped'
  completedAt?: string
}

/** @deprecated Use FounderOperatingLoopRun — kept for legacy persisted records */
export type OperatingLoopResult = {
  startedAt: string
  completedAt: string
  steps: OperatingLoopStep[]
  actionsGenerated: number
  draftsGenerated: number
  briefsGenerated: number
  approvalsQueued: number
  summary: string
}

export type OperatingLoopRunResponse = {
  runId: string
  status: OperatingLoopRunStatus
  summary: string
  created: {
    actions: number
    approvals: number
    drafts: number
    buildBriefs: number
  }
  warnings: string[]
}

export const FULL_OPERATING_LOOP_PLAN: FounderOperatingLoopPlan = {
  runQualitySample: true,
  runStaffAgents: true,
  generateActions: true,
  generateContentDrafts: true,
  generateBuildBriefs: true,
  generateApprovals: true
}

export const PRODUCT_OPERATING_LOOP_PLAN: FounderOperatingLoopPlan = {
  runQualitySample: false,
  runStaffAgents: true,
  generateActions: true,
  generateContentDrafts: false,
  generateBuildBriefs: false,
  generateApprovals: false
}

export const QUALITY_OPERATING_LOOP_PLAN: FounderOperatingLoopPlan = {
  runQualitySample: true,
  runStaffAgents: true,
  generateActions: true,
  generateContentDrafts: false,
  generateBuildBriefs: false,
  generateApprovals: true
}

export const BRAND_OPERATING_LOOP_PLAN: FounderOperatingLoopPlan = {
  runQualitySample: false,
  runStaffAgents: true,
  generateActions: false,
  generateContentDrafts: true,
  generateBuildBriefs: false,
  generateApprovals: true
}

export const TECHNICAL_OPERATING_LOOP_PLAN: FounderOperatingLoopPlan = {
  runQualitySample: false,
  runStaffAgents: true,
  generateActions: true,
  generateContentDrafts: false,
  generateBuildBriefs: true,
  generateApprovals: true
}

export const LOOP_AGENT_SEQUENCE: Array<{ id: FounderStaffAgentId; label: string }> = [
  { id: 'chief-of-staff', label: 'Chief of Staff' },
  { id: 'cto', label: 'CTO Agent' },
  { id: 'lead-developer', label: 'Lead Developer Agent' },
  { id: 'product-director', label: 'Product Director Agent' },
  { id: 'ofsted-regulation', label: 'Ofsted and Regulation Agent' },
  { id: 'orb-quality', label: 'ORB Quality Agent' },
  { id: 'customer-success', label: 'Customer Success Agent' },
  { id: 'growth', label: 'Growth Agent' },
  { id: 'brand-ambassador', label: 'Brand Ambassador Agent' },
  { id: 'finance-ai-cost', label: 'Finance and AI Cost Agent' },
  { id: 'data-protection-safety', label: 'Data Protection and Safety Agent' }
]

export const PRODUCT_LOOP_AGENTS: FounderStaffAgentId[] = [
  'chief-of-staff',
  'product-director',
  'customer-success',
  'growth'
]

export const QUALITY_LOOP_AGENTS: FounderStaffAgentId[] = [
  'orb-quality',
  'ofsted-regulation',
  'data-protection-safety',
  'chief-of-staff'
]

export const BRAND_LOOP_AGENTS: FounderStaffAgentId[] = ['brand-ambassador', 'chief-of-staff']

export const TECHNICAL_LOOP_AGENTS: FounderStaffAgentId[] = ['cto', 'lead-developer', 'chief-of-staff']

export function agentsForPlan(plan: FounderOperatingLoopPlan): Array<{ id: FounderStaffAgentId; label: string }> {
  if (!plan.runStaffAgents) return []

  if (
    plan.runQualitySample &&
    !plan.generateContentDrafts &&
    !plan.generateBuildBriefs &&
    plan.generateApprovals
  ) {
    return LOOP_AGENT_SEQUENCE.filter((agent) => QUALITY_LOOP_AGENTS.includes(agent.id))
  }

  if (plan.generateContentDrafts && !plan.generateBuildBriefs && !plan.runQualitySample) {
    return LOOP_AGENT_SEQUENCE.filter((agent) => BRAND_LOOP_AGENTS.includes(agent.id))
  }

  if (plan.generateBuildBriefs && !plan.generateContentDrafts && !plan.runQualitySample) {
    return LOOP_AGENT_SEQUENCE.filter((agent) => TECHNICAL_LOOP_AGENTS.includes(agent.id))
  }

  if (
    plan.generateActions &&
    !plan.generateContentDrafts &&
    !plan.generateBuildBriefs &&
    !plan.runQualitySample
  ) {
    return LOOP_AGENT_SEQUENCE.filter((agent) => PRODUCT_LOOP_AGENTS.includes(agent.id))
  }

  return LOOP_AGENT_SEQUENCE
}
