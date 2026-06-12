import type {
  BenchmarkScenario,
  LearningBuildBrief,
  LearningLoopAutonomySettings,
  LearningLoopAuditEntry,
  LearningLoopOverview,
  LearningLoopRecord,
  LearningLoopTriggerType,
  LearningProposal
} from './learning-loop-types.ts'

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Request failed (${res.status})`)
  }
  const payload = (await res.json()) as { data: T }
  return payload.data
}

export async function fetchLearningLoopOverview(): Promise<LearningLoopOverview> {
  const res = await fetch('/api/founder/learning-loop', { cache: 'no-store' })
  return parseResponse<LearningLoopOverview>(res)
}

export async function startLearningLoopClient(input: {
  triggerType?: LearningLoopTriggerType
  sourceRunId?: string
  sourceEventId?: string
}): Promise<LearningLoopRecord> {
  const res = await fetch('/api/founder/learning-loop/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  return parseResponse<LearningLoopRecord>(res)
}

export async function detectWeaknessesClient(loopId: string): Promise<LearningLoopRecord> {
  const res = await fetch('/api/founder/learning-loop/detect-weaknesses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loopId })
  })
  return parseResponse<LearningLoopRecord>(res)
}

export async function generateScenariosClient(
  loopId: string,
  input?: { areaId?: string; count?: number }
): Promise<LearningLoopRecord> {
  const res = await fetch('/api/founder/learning-loop/generate-scenarios', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loopId, ...input })
  })
  return parseResponse<LearningLoopRecord>(res)
}

export async function approveScenarioClient(
  scenarioId: string,
  targetStatus?: 'approved_for_testing' | 'active_benchmark'
): Promise<BenchmarkScenario> {
  const res = await fetch('/api/founder/learning-loop/approve-scenario', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenarioId, targetStatus })
  })
  return parseResponse<BenchmarkScenario>(res)
}

export async function rejectScenarioClient(scenarioId: string, reason?: string): Promise<BenchmarkScenario> {
  const res = await fetch('/api/founder/learning-loop/reject-scenario', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenarioId, reason })
  })
  return parseResponse<BenchmarkScenario>(res)
}

export async function createProposalClient(loopId: string): Promise<LearningProposal> {
  const res = await fetch('/api/founder/learning-loop/create-proposal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loopId })
  })
  return parseResponse<LearningProposal>(res)
}

export async function approveProposalClient(proposalId: string, notes?: string): Promise<LearningProposal> {
  const res = await fetch('/api/founder/learning-loop/approve-proposal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proposalId, notes })
  })
  return parseResponse<LearningProposal>(res)
}

export async function rejectProposalClient(proposalId: string, notes?: string): Promise<LearningProposal> {
  const res = await fetch('/api/founder/learning-loop/reject-proposal', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proposalId, notes })
  })
  return parseResponse<LearningProposal>(res)
}

export async function createBuildBriefClient(
  proposalId: string
): Promise<{ brief: LearningBuildBrief; formatted: string }> {
  const res = await fetch('/api/founder/learning-loop/create-build-brief', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proposalId })
  })
  return parseResponse<{ brief: LearningBuildBrief; formatted: string }>(res)
}

export async function fetchLearningLoopAudit(loopId?: string): Promise<LearningLoopAuditEntry[]> {
  const url = loopId
    ? `/api/founder/learning-loop/audit?loopId=${encodeURIComponent(loopId)}`
    : '/api/founder/learning-loop/audit'
  const res = await fetch(url, { cache: 'no-store' })
  const data = await parseResponse<{ entries: LearningLoopAuditEntry[] }>(res)
  return data.entries
}

export async function fetchBenchmarkBank(): Promise<{
  active: BenchmarkScenario[]
  awaitingApproval: BenchmarkScenario[]
  all: BenchmarkScenario[]
}> {
  const res = await fetch('/api/founder/learning-loop/benchmark-bank', { cache: 'no-store' })
  return parseResponse(res)
}

export async function fetchLearningLoopAutonomySettings(): Promise<LearningLoopAutonomySettings> {
  const res = await fetch('/api/founder/learning-loop/autonomy-settings', { cache: 'no-store' })
  return parseResponse<LearningLoopAutonomySettings>(res)
}

export async function updateLearningLoopAutonomySettingsClient(
  patch: Partial<LearningLoopAutonomySettings>
): Promise<LearningLoopAutonomySettings> {
  const res = await fetch('/api/founder/learning-loop/autonomy-settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch)
  })
  return parseResponse<LearningLoopAutonomySettings>(res)
}
