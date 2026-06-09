import { getPendingApprovals } from '@/lib/founder/approvals/approval-store'
import { getOpenFounderActions } from '@/lib/founder/actions'
import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import type {
  FounderStaffAgent,
  FounderStaffAgentId,
  FounderStaffExecutionLog,
  FounderStaffTeamOverview
} from './founder-team-types'
import { ALL_STAFF_AGENTS } from './staff-agents'

const STAFF_AGENT_IDS = ALL_STAFF_AGENTS.map((a) => a.id)

let executionLogs: FounderStaffExecutionLog[] = []
let logCounter = 0

function nextLogId(): string {
  logCounter += 1
  return `exec-${Date.now()}-${logCounter}`
}

export function isValidStaffAgentId(id: string): id is FounderStaffAgentId {
  return STAFF_AGENT_IDS.includes(id as FounderStaffAgentId)
}

export function getAllStaffAgents(): FounderStaffAgent[] {
  return ALL_STAFF_AGENTS
}

export function getStaffAgent(id: FounderStaffAgentId): FounderStaffAgent {
  const agent = ALL_STAFF_AGENTS.find((a) => a.id === id)
  if (!agent) throw new Error(`Unknown staff agent: ${id}`)
  return agent
}

export function runStaffAgent(id: FounderStaffAgentId) {
  const agent = getStaffAgent(id)
  const output = agent.run()
  addExecutionLog(id, 'success', `${agent.name} run complete`)
  return output
}

export function addExecutionLog(
  agentId: FounderStaffAgentId,
  level: FounderStaffExecutionLog['level'],
  message: string
): void {
  executionLogs = [
    {
      id: nextLogId(),
      agentId,
      timestamp: new Date().toISOString(),
      level,
      message
    },
    ...executionLogs
  ].slice(0, 200)
}

export function getStaffExecutionLogs(agentId?: FounderStaffAgentId): FounderStaffExecutionLog[] {
  if (agentId) return executionLogs.filter((l) => l.agentId === agentId)
  return [...executionLogs]
}

export function getStaffTeamOverview(): FounderStaffTeamOverview {
  const telemetry = getFounderTelemetrySummary()
  const chief = getStaffAgent('chief-of-staff').run()
  return {
    activeAgents: ALL_STAFF_AGENTS.filter((a) => a.status === 'active' || a.status === 'monitoring').length,
    pendingApprovals: getPendingApprovals().length,
    openActions: getOpenFounderActions().length,
    telemetryStatus: telemetry.totalEvents > 0 ? 'live' : 'empty',
    topPriority: chief.summary
  }
}
