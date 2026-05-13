import { getEntityRoute, normalizeEntityType } from '@/lib/navigation/entity-resolver'

export function routeToAction(id: string) {
  return getEntityRoute({ entity_type: 'action', entity_id: id })
}

export function routeToEvidence(id: string) {
  return getEntityRoute({ entity_type: 'evidence', entity_id: id })
}

export function routeToChronologyEvent(id: string) {
  return getEntityRoute({ entity_type: 'chronology_event', entity_id: id })
}

export function routeToYoungPersonWorkspace(id: string) {
  return getEntityRoute({ entity_type: 'young_person', entity_id: id })
}

export function routeToSourceRecord(sourceType: string, sourceId: string) {
  return getEntityRoute({
    entity_type: normalizeEntityType(sourceType),
    entity_id: sourceId,
    source_type: sourceType,
    source_id: sourceId
  })
}
