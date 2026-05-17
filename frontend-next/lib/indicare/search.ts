import { getOsActions } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'
import { getOsDocuments } from '@/lib/os-api/documents'
import { getOsEvidence } from '@/lib/os-api/evidence'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'
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

function includes(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase())
}

function result(params: {
  id: string
  type: string
  entityType: EntityType
  group: string
  title: string
  description: string
  href: string
}): SearchResult {
  return {
    ...params,
    previewHref: params.href,
    chronologyHref: params.entityType === 'chronology' ? params.href : `/chronology?source=${encodeURIComponent(params.id)}`,
    permissionsRequired: ['records:read'],
    actions: getEntityActions({ entity_type: params.entityType, entity_id: params.id }).slice(0, 2)
  }
}

export function searchIndiCare(_query: string): SearchResult[] {
  return [
    result({
      id: 'live-search-required',
      type: 'system',
      entityType: normalizeEntityType('chronology'),
      group: 'Live search',
      title: 'Use liveSearchIndiCare for live OS results',
      description: 'The synchronous search path no longer uses demo data. Server components should call liveSearchIndiCare.',
      href: '/chronology'
    })
  ]
}

export async function liveSearchIndiCare(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const [people, chronology, documents, evidence, actions] = await Promise.all([
    getOsYoungPeople(),
    getOsChronology(),
    getOsDocuments(),
    getOsEvidence(),
    getOsActions()
  ])

  const results: SearchResult[] = []

  people.data.forEach((person) => {
    const haystack = `${person.displayName} ${person.preferredName} ${person.riskLevel} ${person.placementStatus} ${person.legalStatus}`
    if (!includes(haystack, q)) return
    results.push(result({
      id: person.id,
      type: 'young_person',
      entityType: normalizeEntityType('young_person'),
      group: 'Young people',
      title: person.displayName || person.preferredName || `Young person ${person.id}`,
      description: `${person.placementStatus || 'Placement'} · ${person.riskLevel || 'risk not returned'}`,
      href: `/young-people/${encodeURIComponent(person.id)}`
    }))
  })

  chronology.data.forEach((event) => {
    const haystack = `${event.title} ${event.summary} ${event.fullText} ${event.category} ${event.tags.join(' ')}`
    if (!includes(haystack, q)) return
    results.push(result({
      id: event.id,
      type: 'chronology_event',
      entityType: normalizeEntityType('chronology_event'),
      group: 'Chronology',
      title: event.title,
      description: event.summary || event.category || 'Chronology event',
      href: `/chronology/${encodeURIComponent(event.id)}`
    }))
  })

  documents.data.forEach((document) => {
    const haystack = `${document.title} ${document.documentType} ${document.fileName} ${document.status} ${document.tags.join(' ')}`
    if (!includes(haystack, q)) return
    results.push(result({
      id: document.id,
      type: 'document',
      entityType: normalizeEntityType('document'),
      group: 'Documents',
      title: document.title,
      description: `${document.documentType} · ${document.status}`,
      href: `/documents/${encodeURIComponent(document.id)}`
    }))
  })

  evidence.data.forEach((item) => {
    const haystack = `${item.title} ${item.description} ${item.evidenceType} ${item.linkedRegulation || ''} ${item.tags.join(' ')}`
    if (!includes(haystack, q)) return
    results.push(result({
      id: item.id,
      type: 'evidence',
      entityType: normalizeEntityType('evidence'),
      group: 'Evidence',
      title: item.title,
      description: `${item.evidenceType} · ${item.quality}`,
      href: `/evidence/${encodeURIComponent(item.id)}`
    }))
  })

  actions.data.forEach((action) => {
    const haystack = `${action.title} ${action.description} ${action.status} ${action.priority} ${action.regulation || ''}`
    if (!includes(haystack, q)) return
    results.push(result({
      id: action.id,
      type: 'action',
      entityType: normalizeEntityType('action'),
      group: 'Actions',
      title: action.title,
      description: `${action.status} · ${action.priority}`,
      href: `/actions/${encodeURIComponent(action.id)}`
    }))
  })

  return results.slice(0, 40)
}