export type ApprovalType =
  | 'linkedin-post'
  | 'email-draft'
  | 'investor-update'
  | 'provider-message'
  | 'technical-build-brief'
  | 'evidence-pack'
  | 'public-claim'
  | 'product-action'

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
