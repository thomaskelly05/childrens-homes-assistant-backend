export type ReplayIntegrity = {
  ordering_valid: boolean
  duplicate_event_keys: string[]
  replay_gap_after_ids: number[]
  stale_event_ids: string[]
}

export type ChronologyProjection = {
  schema_version: string
  projection_id: string
  projection_type: string
  entity_type: string
  entity_id: string
  occurred_at: string
  title: string
  summary: string
  linked_evidence: string[]
  linked_operational_states: string[]
  linked_lifecycle_events: string[]
  linked_governance_reviews: string[]
  linked_inspections: string[]
  linked_signoffs: string[]
  source_event_ids: string[]
  replay_cursor: number
  metadata: Record<string, unknown>
}

export type EvidenceTraversalNode = {
  node_id: string
  node_type: string
  label: string
  metadata: Record<string, unknown>
}

export type EvidenceTraversalEdge = {
  source_id: string
  target_id: string
  relationship: string
  why_linked: string
  source_event_id?: string | null
  metadata: Record<string, unknown>
}

export type EvidenceTraversal = {
  root_entity_type: string
  root_entity_id: string
  nodes: EvidenceTraversalNode[]
  edges: EvidenceTraversalEdge[]
  chronology_linked_evidence: string[]
  inspection_linked_evidence: string[]
  lifecycle_linked_evidence: string[]
  governance_linked_evidence: string[]
}

export type ProviderOperationalQueueItem = {
  queue_id: string
  category: string
  provider_id?: number | null
  home_id?: number | null
  entity_type: string
  entity_id: string
  status: string
  priority: string
  title: string
  reason: string
  chronology_links: string[]
  lifecycle_links: string[]
  evidence_links: string[]
  governance_links: string[]
  inspection_links: string[]
  replay_cursor: number
}
