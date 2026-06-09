export type ContentChannel =
  | 'linkedin'
  | 'newsletter'
  | 'investor-update'
  | 'provider-update'
  | 'website'
  | 'founder-update'

export type ContentDraftStatus = 'draft' | 'needs-review' | 'approved' | 'rejected' | 'posted'

export type ContentDraft = {
  id: string
  title: string
  channel: ContentChannel
  body: string
  status: ContentDraftStatus
  createdByAgent: string
  createdAt: string
  approvedAt?: string
  postedAt?: string
  safetyNotes: string[]
  dataBasis: string
}

export type LinkedInPostTemplate =
  | 'today-progress'
  | 'weekly-progress'
  | 'founder-story'
  | 'orb-feature-launch'
  | 'ethical-intelligence'
  | 'call-for-testers'
  | 'sector-experts'
  | 'investor-update-style'
  | 'lessons-residential-childcare'
