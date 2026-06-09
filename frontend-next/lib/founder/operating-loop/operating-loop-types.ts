export type OperatingLoopStep = {
  id: string
  agentId: string
  label: string
  status: 'pending' | 'running' | 'complete' | 'skipped'
  completedAt?: string
}

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
