/**
 * Founder Memory V1 — private strategic memory contracts for IndiCare Intelligence.
 */

export type FounderMemoryItemType =
  | 'priority'
  | 'decision'
  | 'product-direction'
  | 'relationship-note'
  | 'risk'
  | 'principle'
  | 'milestone'
  | 'deferred-item'

export type FounderMemoryItemStatus = 'active' | 'archived' | 'superseded'

export type FounderMemoryImportance = 'critical' | 'high' | 'medium' | 'low'

export type FounderMemoryItem = {
  id: string
  type: FounderMemoryItemType
  title: string
  content: string
  status: FounderMemoryItemStatus
  importance: FounderMemoryImportance
  tags: string[]
  source: string
  createdAt: string
  updatedAt: string
  createdBy: string
  linkedEntityId?: string
  linkedEntityType?: string
}

export type FounderStrategicContext = {
  primaryObjective: string
  secondaryObjectives: string[]
  deferredObjectives: string[]
  currentProductFocus: string
  currentCommercialFocus: string
  currentRisks: string[]
  operatingPrinciples: string[]
  importantDecisions: string[]
  keyRelationships: string[]
  /** ISO timestamp of the most recently updated active memory item */
  memoryUpdatedAt: string
  /** Count of active memory items used to build this context */
  activeMemoryCount: number
}

export type CreateFounderMemoryItemInput = {
  type: FounderMemoryItemType
  title: string
  content: string
  importance?: FounderMemoryImportance
  tags?: string[]
  status?: FounderMemoryItemStatus
  source?: string
  linkedEntityId?: string
  linkedEntityType?: string
}

export type UpdateFounderMemoryItemInput = Partial<
  Pick<
    FounderMemoryItem,
    'type' | 'title' | 'content' | 'importance' | 'tags' | 'status' | 'linkedEntityId' | 'linkedEntityType'
  >
>

export const FOUNDER_MEMORY_TYPE_LABELS: Record<FounderMemoryItemType, string> = {
  priority: 'Priorities',
  decision: 'Decisions',
  'product-direction': 'Product Direction',
  'relationship-note': 'Relationships',
  risk: 'Risks',
  principle: 'Principles',
  milestone: 'Milestones',
  'deferred-item': 'Deferred Items'
}
