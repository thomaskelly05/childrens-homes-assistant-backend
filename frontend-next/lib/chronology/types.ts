export type ChronologySeverity = 'low' | 'medium' | 'high' | 'critical'

export type ChronologyVisibility = 'home' | 'restricted' | 'leadership' | 'external_summary'

export type ChronologySourceType =
  | 'daily_log'
  | 'incident'
  | 'safeguarding'
  | 'medication'
  | 'education'
  | 'keywork'
  | 'appointment'
  | 'document'
  | 'report'
  | 'manager_review'
  | 'audit'
  | 'reg44_report'
  | 'reg45_report'
  | 'lac_review'

export type ChronologyEventType =
  | 'daily_log'
  | 'incident'
  | 'safeguarding'
  | 'medication'
  | 'health'
  | 'education'
  | 'keywork'
  | 'appointment'
  | 'missing_episode'
  | 'family_contact'
  | 'professional_contact'
  | 'direct_work'
  | 'manager_review'
  | 'reg44_finding'
  | 'reg45_evidence'
  | 'lac_review'
  | 'document_upload'
  | 'audit_event'
  | 'placement_update'
  | 'risk_review'
  | 'behaviour_observation'
  | 'complaint'
  | 'allegation'
  | 'restraint'
  | 'sanction'
  | 'positive_outcome'

export type RegulationLink = {
  regulation: string
  label: string
  confidence: 'direct' | 'supporting' | 'possible'
}

export type ChronologyEvent = {
  id: string
  dateTime: string
  title: string
  summary: string
  fullText: string
  eventType: ChronologyEventType
  category: string
  severity: ChronologySeverity
  sourceType: ChronologySourceType
  sourceId: string
  youngPersonIds: string[]
  staffIds: string[]
  homeId: string
  tags: string[]
  linkedRecordIds: string[]
  evidenceIds: string[]
  regulationLinks: RegulationLink[]
  safeguardingFlags: string[]
  riskFlags: string[]
  actionIds: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  visibility: ChronologyVisibility
  citationLabel: string
}

export type ChronologyFilter = {
  homeId?: string
  dateFrom?: string
  dateTo?: string
  youngPersonIds?: string[]
  staffIds?: string[]
  eventTypes?: ChronologyEventType[]
  categories?: string[]
  severity?: ChronologySeverity[]
  tags?: string[]
  riskFlags?: string[]
  safeguardingOnly?: boolean
  evidenceOnly?: boolean
  actionsRequiredOnly?: boolean
  regulation?: string
  sourceType?: ChronologySourceType
  searchText?: string
}

export type ChronologyCitation = {
  eventId: string
  label: string
  sourceType: ChronologySourceType
  sourceId: string
  dateTime: string
  excerpt: string
}
