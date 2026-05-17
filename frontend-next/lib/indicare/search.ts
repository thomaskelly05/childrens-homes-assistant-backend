import { getEntityActions, normalizeEntityType, type EntityType } from '@/lib/navigation/entity-resolver'

export type SearchResult = {
  id: string
  type: string
  entityType: EntityType
  group: string
  title: string
  description: string
  href: string
  previewHref: string
  chronologyHref: string
  permissionsRequired: string[]
  actions: Array<{ id: string; label: string; route: string }>
}

export function searchIndiCare(_query: string): SearchResult[] {
  return [
    {
      id: 'live-search-unavailable',
      type: 'system',
      entityType: normalizeEntityType('chronology'),
      group: 'Live search',
      title: 'Live search requires the backend search API',
      description: 'Demo search data has been removed. Connect this component to /api/os/context or a dedicated search endpoint before showing care records here.',
      href: '/chronology',
      previewHref: '/chronology',
      chronologyHref: '/chronology',
      permissionsRequired: ['records:read'],
      actions: getEntityActions({ entity_type: 'chronology_event', entity_id: 'live-search-unavailable' }).slice(0, 2)
    }
  ]
}