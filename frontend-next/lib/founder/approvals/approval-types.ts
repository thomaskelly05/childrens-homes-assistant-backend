export type ApprovalType =
  | 'linkedin-post'
  | 'email-draft'
  | 'investor-update'
  | 'provider-message'
  | 'technical-build-brief'
  | 'evidence-pack'
  | 'public-claim'
  | 'revenue-claim'
  | 'product-action'
  | 'relationship-message'
  | 'founder-briefing'
  | 'founder-narrative'
  | 'company-board-report'
  | 'weekly-executive-pack'
  | 'investor-ready-scorecard'
  | 'public-company-narrative'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs-changes'

export type ApprovalItem = {
  id: string
  type: ApprovalType
  title: string
  content: string
  requestedByAgent: string
  riskLevel: 'low' | 'medium' | 'high'
  safetyCheck: string
  status: ApprovalStatus
  createdAt: string
  approvedAt?: string
}
