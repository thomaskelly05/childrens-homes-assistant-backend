import type {
  FounderAgentActionResult,
  FounderAgentLiveState,
  FounderAgentApprovalItem,
  FounderAutonomousLoopResult,
  FounderAutonomySettings,
  FounderChiefOfStaffBrief,
  FounderCoverageAreaId,
  FounderCoverageMap,
  FounderAgentActionType,
  FounderAgentId,
  FounderAgentAuditEntry,
  FounderAutonomousLoopTrigger
} from './founder-agent-types'

type ApiResponse<T> = { success: boolean; data: T; error?: string }

async function founderAgentsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    },
    credentials: 'include'
  })

  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T> & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`)
  }
  return payload.data
}

export type FounderAgentsOverview = {
  agents: FounderAgentLiveState[]
  approvalQueue: FounderAgentApprovalItem[]
  qualityLabIntegration: ReturnType<
    typeof import('./founder-agent-service').getQualityLabAgentIntegration
  >
}

export async function fetchFounderAgents(): Promise<FounderAgentsOverview> {
  return founderAgentsFetch('/api/founder/agents')
}

export async function fetchFounderAgentsBrief(): Promise<FounderChiefOfStaffBrief> {
  return founderAgentsFetch('/api/founder/agents/brief')
}

export async function postFounderAgentAction(input: {
  agentId: FounderAgentId
  actionType: FounderAgentActionType
  areaId?: FounderCoverageAreaId
}): Promise<FounderAgentActionResult> {
  return founderAgentsFetch('/api/founder/agents/action', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export async function postFounderAutonomousLoop(
  trigger: FounderAutonomousLoopTrigger
): Promise<FounderAutonomousLoopResult> {
  return founderAgentsFetch('/api/founder/agents/action', {
    method: 'POST',
    body: JSON.stringify({ trigger })
  })
}

export async function approveFounderAgentAction(approvalId: string): Promise<FounderAgentApprovalItem> {
  return founderAgentsFetch('/api/founder/agents/approve', {
    method: 'POST',
    body: JSON.stringify({ approvalId })
  })
}

export async function rejectFounderAgentAction(
  approvalId: string,
  requestChanges = false
): Promise<FounderAgentApprovalItem> {
  return founderAgentsFetch('/api/founder/agents/reject', {
    method: 'POST',
    body: JSON.stringify({ approvalId, requestChanges })
  })
}

export async function fetchFounderAgentAudit(agentId?: FounderAgentId): Promise<FounderAgentAuditEntry[]> {
  const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''
  return founderAgentsFetch(`/api/founder/agents/audit${query}`)
}

export async function fetchFounderAgentCoverage(): Promise<FounderCoverageMap> {
  return founderAgentsFetch('/api/founder/agents/coverage')
}

export async function postGenerateCoverageScenarios(areaId: FounderCoverageAreaId) {
  return founderAgentsFetch('/api/founder/agents/coverage/generate-scenarios', {
    method: 'POST',
    body: JSON.stringify({ areaId })
  })
}

export async function fetchAutonomySettings(): Promise<FounderAutonomySettings> {
  return founderAgentsFetch('/api/founder/agents/autonomy-settings')
}

export async function updateAutonomySettingsClient(
  patch: Partial<FounderAutonomySettings>
): Promise<FounderAutonomySettings> {
  return founderAgentsFetch('/api/founder/agents/autonomy-settings', {
    method: 'POST',
    body: JSON.stringify(patch)
  })
}
