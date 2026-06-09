export type BuildBriefStatus =
  | 'draft'
  | 'approved'
  | 'sent-to-cursor'
  | 'in-progress'
  | 'completed'
  | 'dismissed'

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
