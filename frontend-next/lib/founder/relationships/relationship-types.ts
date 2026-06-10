export type RelationshipType =
  | 'provider'
  | 'investor'
  | 'partner'
  | 'sector-expert'
  | 'tester'
  | 'champion'
  | 'local-authority'
  | 'government'
  | 'technology-partner'
  | 'advisor'
  | 'other'

export type RelationshipStatus =
  | 'new'
  | 'contacted'
  | 'meeting-booked'
  | 'active'
  | 'waiting'
  | 'follow-up-needed'
  | 'converted'
  | 'closed'
  | 'archived'

export type RelationshipPriority = 'critical' | 'high' | 'medium' | 'low'

export type FounderRelationship = {
  id: string
  name: string
  organisation: string
  relationshipType: RelationshipType
  status: RelationshipStatus
  priority: RelationshipPriority
  email?: string
  linkedin?: string
  website?: string
  notes: string
  interests: string[]
  lastContactAt?: string
  nextAction: string
  nextActionDue?: string
  source: string
  createdAt: string
  updatedAt: string
  createdBy: string
  tags: string[]
  linkedEvidencePackIds?: string[]
}

export type InteractionType =
  | 'email'
  | 'linkedin'
  | 'call'
  | 'meeting'
  | 'demo'
  | 'note'
  | 'follow-up'
  | 'application'
  | 'intro'

export type RelationshipInteraction = {
  id: string
  relationshipId: string
  type: InteractionType
  summary: string
  outcome: string
  nextStep?: string
  createdAt: string
  createdBy: string
}

export type OpportunityType =
  | 'pilot'
  | 'investment'
  | 'partnership'
  | 'endorsement'
  | 'testing'
  | 'grant'
  | 'provider-sale'
  | 'strategic-intro'

export type OpportunityStatus = 'open' | 'progressing' | 'won' | 'lost' | 'deferred'

export type OpportunityConfidence = 'high' | 'medium' | 'low'

export type RelationshipOpportunity = {
  id: string
  relationshipId: string
  title: string
  opportunityType: OpportunityType
  status: OpportunityStatus
  valueEstimate?: string
  confidence: OpportunityConfidence
  evidenceNeeded: string[]
  nextStep: string
  createdAt: string
  updatedAt: string
}

export type RelationshipBundle = {
  relationship: FounderRelationship
  interactions: RelationshipInteraction[]
  opportunities: RelationshipOpportunity[]
}

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  provider: 'Provider',
  investor: 'Investor',
  partner: 'Partner',
  'sector-expert': 'Sector Expert',
  tester: 'Tester',
  champion: 'Champion',
  'local-authority': 'Local Authority',
  government: 'Government',
  'technology-partner': 'Technology Partner',
  advisor: 'Advisor',
  other: 'Other'
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  'meeting-booked': 'Meeting Booked',
  active: 'Active',
  waiting: 'Waiting',
  'follow-up-needed': 'Follow-up Needed',
  converted: 'Converted',
  closed: 'Closed',
  archived: 'Archived'
}

export const PIPELINE_STATUSES: RelationshipStatus[] = [
  'new',
  'contacted',
  'meeting-booked',
  'active',
  'waiting',
  'follow-up-needed',
  'converted'
]

export const TYPE_COUNT_GROUPS: Array<{ label: string; types: RelationshipType[] }> = [
  { label: 'Providers', types: ['provider'] },
  { label: 'Investors', types: ['investor'] },
  { label: 'Technology Partners', types: ['technology-partner', 'partner'] },
  { label: 'Sector Experts', types: ['sector-expert', 'advisor'] },
  { label: 'Local Authorities', types: ['local-authority', 'government'] },
  { label: 'Testers', types: ['tester'] },
  { label: 'Champions', types: ['champion'] }
]
