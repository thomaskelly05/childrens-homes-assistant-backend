import { EntityPreviewCard } from './entity-preview-card'

export function ReportPreview({ reportId, title, description }: { reportId: string; title?: string; description?: string }) {
  return <EntityPreviewCard entity={{ entity_type: 'report', entity_id: reportId }} title={title} description={description} />
}
