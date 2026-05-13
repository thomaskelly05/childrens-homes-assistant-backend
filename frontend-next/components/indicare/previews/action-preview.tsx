import { EntityPreviewCard } from './entity-preview-card'

export function ActionPreview({ actionId, title, description }: { actionId: string; title?: string; description?: string }) {
  return <EntityPreviewCard entity={{ entity_type: 'action', entity_id: actionId }} title={title} description={description} />
}
