import { CareAction, EvidenceGap } from '@/lib/evidence/types'

export type RecordQueryScope = {
  homeId?: string
  youngPersonIds?: string[]
  dateFrom?: string
  dateTo?: string
  categories?: string[]
  regulation?: string
  eventIds?: string[]
}

export type RecordQuestion = {
  id: string
  question: string
  askedByStaffId?: string
  askedAt: string
  scope: RecordQueryScope
}

export type RecordCitation = {
  eventId: string
  label: string
  sourceType: string
  sourceId: string
  excerpt: string
}

export type RecordEvidenceSnippet = {
  eventId: string
  text: string
  citationLabel: string
}

export type RecordAnswer = {
  answer: string
  confidence: 'low' | 'medium' | 'high'
  citations: RecordCitation[]
  relatedActions: CareAction[]
  evidenceGaps: EvidenceGap[]
  suggestedFollowUps: string[]
  sourceEventIds: string[]
}
