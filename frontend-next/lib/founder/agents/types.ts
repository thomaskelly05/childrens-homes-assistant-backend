export type AgentStatus = 'active' | 'idle' | 'monitoring'

export type AgentRunResult = {
  title: string
  summary: string
  recommendations: string[]
  status: AgentStatus
}

export type AgentDefinition = {
  id: string
  name: string
  purpose: string
  run: () => AgentRunResult
}

export type AgentExecutionLog = {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'success'
  message: string
}

export type AgentDetail = {
  id: string
  name: string
  purpose: string
  latestRun: AgentRunResult
  lastRunAt: string
  executionLogs: AgentExecutionLog[]
}
