import { getEntityActions, normalizeEntityType, type EntityType } from '@/lib/navigation/entity-resolver'

import { getCommandCentre, type CommandCentreData } from './platform'
import type { OsApiResult } from './types'

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
  date?: string
  linkedContext?: string
  whyItMatters?: string
}

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function matches(result: SearchResult, query: string) {
  const haystack = normalise([
    result.title,
    result.description,
    result.group,
    result.type,
    result.date,
    result.linkedContext,
    result.whyItMatters
  ].filter(Boolean).join(' '))
  return haystack.includes(query)
}

function formatDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date)
}

function resultActions(entity: { entity_type: string; entity_id?: string; linked_child_id?: string }, href: string) {
  const actions = getEntityActions(entity).slice(0, 3)
  if (!actions.some((action) => action.route === href)) {
    return [{ id: 'open', label: 'Open', route: href }, ...actions].slice(0, 4)
  }
  return actions
}

function buildIndex(data: CommandCentreData): SearchResult[] {
  const children = data.children.map((person) => {
    const href = `/young-people/${encodeURIComponent(person.id)}`
    return {
      id: person.id,
      type: 'young-person',
      entityType: normalizeEntityType('young_person'),
      group: 'Young people',
      title: person.displayName,
      description: [
        person.preferredName,
        person.age ? `Age ${person.age}` : undefined,
        person.placementStatus || person.status,
        person.legalStatus
      ].filter(Boolean).join(' · ') || 'Young person record',
      href,
      previewHref: href,
      chronologyHref: `/young-people/${encodeURIComponent(person.id)}/chronology`,
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'young_person', entity_id: person.id, linked_child_id: person.id }, href),
      linkedContext: person.keyWorkerId ? `Key worker ${person.keyWorkerId}` : undefined,
      whyItMatters: person.riskLevel ? `${person.riskLevel} risk level` : 'Open child overview'
    } satisfies SearchResult
  })

  const chronology = data.chronology.map((event) => {
    const href = `/chronology/${encodeURIComponent(event.id)}`
    const childId = event.youngPersonIds[0]
    return {
      id: event.id,
      type: 'chronology-event',
      entityType: normalizeEntityType('chronology_event'),
      group: 'Chronology',
      title: event.title,
      description: event.summary || event.fullText || 'Chronology event',
      href,
      previewHref: href,
      chronologyHref: childId ? `/young-people/${encodeURIComponent(childId)}/chronology` : '/chronology',
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'chronology_event', entity_id: event.id, linked_child_id: childId }, href),
      date: formatDate(event.dateTime),
      linkedContext: childId ? `Child ${childId}` : event.homeId ? `Home ${event.homeId}` : undefined,
      whyItMatters: event.safeguardingFlags.length ? 'Safeguarding-linked event' : event.actionIds.length ? 'Has open follow-up links' : event.category
    } satisfies SearchResult
  })

  const documents = data.documents.map((document) => {
    const href = `/documents/${encodeURIComponent(document.id)}`
    return {
      id: document.id,
      type: 'document',
      entityType: normalizeEntityType('document'),
      group: 'Documents',
      title: document.title,
      description: `${document.documentType.replaceAll('_', ' ')} · ${document.status.replaceAll('_', ' ')}`,
      href,
      previewHref: href,
      chronologyHref: '/chronology',
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'document', entity_id: document.id }, href),
      date: formatDate(document.uploadedAt),
      linkedContext: document.homeId ? `Home ${document.homeId}` : undefined,
      whyItMatters: document.reviewRequiredBy ? `Review by ${document.reviewRequiredBy}` : document.regulation || 'Document evidence'
    } satisfies SearchResult
  })

  const evidence = data.evidence.map((item) => {
    const href = `/evidence/${encodeURIComponent(item.id)}`
    return {
      id: item.id,
      type: 'evidence',
      entityType: normalizeEntityType('evidence'),
      group: 'Evidence',
      title: item.title,
      description: item.description || item.evidenceType.replaceAll('_', ' '),
      href,
      previewHref: href,
      chronologyHref: item.youngPersonId ? `/young-people/${encodeURIComponent(item.youngPersonId)}/chronology` : '/chronology',
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'evidence', entity_id: item.id, linked_child_id: item.youngPersonId }, href),
      date: formatDate(item.createdAt),
      linkedContext: item.youngPersonId ? `Child ${item.youngPersonId}` : item.homeId ? `Home ${item.homeId}` : undefined,
      whyItMatters: item.linkedRegulation || `${item.quality.replaceAll('_', ' ')} evidence`
    } satisfies SearchResult
  })

  const actions = data.actions.map((action) => {
    const href = `/actions/${encodeURIComponent(action.id)}`
    return {
      id: action.id,
      type: 'action',
      entityType: normalizeEntityType('action'),
      group: 'Actions',
      title: action.title,
      description: action.description || 'Operational action',
      href,
      previewHref: href,
      chronologyHref: action.youngPersonId ? `/young-people/${encodeURIComponent(action.youngPersonId)}/chronology` : '/chronology',
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'action', entity_id: action.id, linked_child_id: action.youngPersonId }, href),
      date: formatDate(action.dueDate || action.createdAt),
      linkedContext: action.youngPersonId ? `Child ${action.youngPersonId}` : action.homeId ? `Home ${action.homeId}` : undefined,
      whyItMatters: `${action.priority} priority · ${action.status.replaceAll('_', ' ')}`
    } satisfies SearchResult
  })

  const safeguarding = data.safeguarding.map((record) => {
    const href = record.href || `/safeguarding/${encodeURIComponent(record.id)}`
    return {
      id: record.id,
      type: 'safeguarding-record',
      entityType: normalizeEntityType('safeguarding_record'),
      group: 'Safeguarding',
      title: record.title,
      description: record.summary,
      href,
      previewHref: href,
      chronologyHref: record.youngPersonId ? `/young-people/${encodeURIComponent(record.youngPersonId)}/chronology` : '/chronology',
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'safeguarding_record', entity_id: record.id, linked_child_id: record.youngPersonId }, href),
      date: formatDate(record.date),
      linkedContext: record.childName || (record.youngPersonId ? `Child ${record.youngPersonId}` : undefined),
      whyItMatters: record.priority || record.status || 'Safeguarding review'
    } satisfies SearchResult
  })

  const staff = data.workforce.map((member) => {
    const href = `/staff/${encodeURIComponent(member.id)}`
    return {
      id: member.id,
      type: 'staff',
      entityType: normalizeEntityType('staff_record'),
      group: 'Staff',
      title: member.title,
      description: member.summary,
      href,
      previewHref: href,
      chronologyHref: '/chronology',
      permissionsRequired: ['staff:read'],
      actions: resultActions({ entity_type: 'staff_record', entity_id: member.id }, href),
      date: formatDate(member.date),
      linkedContext: member.status,
      whyItMatters: member.priority || 'Staff context'
    } satisfies SearchResult
  })

  const homes = data.homes.map((home) => {
    const href = '/home'
    return {
      id: home.id,
      type: 'home',
      entityType: normalizeEntityType('home'),
      group: 'Homes',
      title: home.title,
      description: home.summary || 'Home operating picture',
      href,
      previewHref: href,
      chronologyHref: '/chronology',
      permissionsRequired: ['records:read'],
      actions: resultActions({ entity_type: 'home', entity_id: home.id }, href),
      date: formatDate(home.date),
      linkedContext: home.status,
      whyItMatters: home.priority || 'Home situational awareness'
    } satisfies SearchResult
  })

  return [...children, ...homes, ...safeguarding, ...actions, ...documents, ...evidence, ...chronology, ...staff]
}

export async function getCommandSearchResults(query: string): Promise<OsApiResult<SearchResult[]>> {
  const command = await getCommandCentre()
  const clean = normalise(query)
  const results = clean ? buildIndex(command.data).filter((result) => matches(result, clean)).slice(0, 20) : []
  return {
    data: results,
    source: command.source,
    warning: command.warning,
    error: command.error,
    meta: command.meta
  }
}
