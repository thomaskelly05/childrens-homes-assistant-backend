import { EntityPreviewCard } from './entity-preview-card'

export function EvidencePreview({ evidenceId, title, description }: { evidenceId: string; title?: string; description?: string }) {
  return <EntityPreviewCard entity={{ entity_type: 'evidence', entity_id: evidenceId }} title={title} description={description} />
}
