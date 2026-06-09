export type BuildBriefStatus = 'draft' | 'sent-to-cursor' | 'complete'

export type BuildBrief = {
  id: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  createdBy: string
  problem: string
  goal: string
  phases: string[]
  filesLikelyAffected: string[]
  acceptanceCriteria: string[]
  testPlan: string[]
  safetyNotes: string[]
  cursorPrompt: string
  status: BuildBriefStatus
  createdAt: string
}
