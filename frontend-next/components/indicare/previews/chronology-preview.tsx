import { EntityPreviewCard } from './entity-preview-card'

export function ChronologyPreview({ eventId, title, summary }: { eventId: string; title?: string; summary?: string }) {
  return <EntityPreviewCard entity={{ entity_type: 'chronology_event', entity_id: eventId }} title={title} description={summary} />
}
