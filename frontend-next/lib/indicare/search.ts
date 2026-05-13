import { indicareData } from './demo-data'
import { fullName, getYoungPersonById } from './selectors'
import { getEntityActions, getEntityRoute, normalizeEntityType, type EntityType } from '@/lib/navigation/entity-resolver'

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

function normalise(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function matches(result: SearchResult, query: string) {
  const haystack = normalise(`${result.title} ${result.description} ${result.group} ${result.type}`)
  return haystack.includes(query)
}

export function searchIndiCare(query: string): SearchResult[] {
  const clean = normalise(query)
  if (!clean) return []

  const results: SearchResult[] = [
    ...indicareData.youngPeople.map((person) => ({
      id: person.id,
      type: 'young-person',
      entityType: normalizeEntityType('young_person'),
      group: 'Young people',
      title: fullName(person),
      description: `${person.preferredName}. ${person.riskLevel} risk. ${person.educationStatus}`,
      href: getEntityRoute({ entity_type: 'young_person', entity_id: person.id }),
      previewHref: getEntityRoute({ entity_type: 'young_person', entity_id: person.id }),
      chronologyHref: getEntityRoute({ entity_type: 'young_person', entity_id: person.id }, 'chronology'),
      permissionsRequired: ['records:read'],
      actions: getEntityActions({ entity_type: 'young_person', entity_id: person.id }).slice(0, 4)
    })),
    ...indicareData.staff.map((member) => ({
      id: member.id,
      type: 'staff',
      entityType: normalizeEntityType('staff'),
      group: 'Staff',
      title: fullName(member),
      description: `${member.role}. ${member.qualifications.join(', ')}`,
      href: getEntityRoute({ entity_type: 'staff_record', entity_id: member.id }),
      previewHref: getEntityRoute({ entity_type: 'staff_record', entity_id: member.id }),
      chronologyHref: getEntityRoute({ entity_type: 'staff_record', entity_id: member.id }, 'chronology'),
      permissionsRequired: ['staff:read'],
      actions: getEntityActions({ entity_type: 'staff_record', entity_id: member.id }).slice(0, 4)
    })),
    ...indicareData.incidents.map((incident) => {
      const person = getYoungPersonById(incident.youngPersonId)
      return {
        id: incident.id,
        type: 'incident',
        entityType: normalizeEntityType('incident'),
        group: 'Incidents',
        title: incident.type,
        description: `${person?.preferredName || incident.youngPersonId}. ${incident.severity} severity. ${incident.outcome}`,
        href: getEntityRoute({ entity_type: 'incident', entity_id: incident.id, linked_child_id: incident.youngPersonId }),
        previewHref: getEntityRoute({ entity_type: 'incident', entity_id: incident.id, linked_child_id: incident.youngPersonId }),
        chronologyHref: getEntityRoute({ entity_type: 'incident', entity_id: incident.id, linked_child_id: incident.youngPersonId }, 'chronology'),
        permissionsRequired: ['records:read'],
        actions: getEntityActions({ entity_type: 'incident', entity_id: incident.id, linked_child_id: incident.youngPersonId }).slice(0, 4)
      }
    }),
    ...indicareData.reports.map((report) => ({
      id: report.id,
      type: 'report',
      entityType: normalizeEntityType(report.type.toLowerCase().includes('lac') ? 'lac_review' : 'report'),
      group: 'Reports',
      title: report.title,
      description: `${report.type}. ${report.status}. ${report.dateRangeStart} to ${report.dateRangeEnd}`,
      href: getEntityRoute({ entity_type: report.type.toLowerCase().includes('lac') ? 'lac_review' : 'report', entity_id: report.id, linked_child_id: report.youngPersonId }),
      previewHref: getEntityRoute({ entity_type: 'report', entity_id: report.id, linked_child_id: report.youngPersonId }),
      chronologyHref: getEntityRoute({ entity_type: 'report', entity_id: report.id, linked_child_id: report.youngPersonId }, 'chronology'),
      permissionsRequired: ['reports:read'],
      actions: getEntityActions({ entity_type: 'report', entity_id: report.id, linked_child_id: report.youngPersonId }).slice(0, 4)
    })),
    ...indicareData.documents.map((document) => ({
      id: document.id,
      type: 'document',
      entityType: normalizeEntityType('document'),
      group: 'Documents',
      title: document.title,
      description: `${document.category}. Tags: ${document.tags.join(', ')}`,
      href: getEntityRoute({ entity_type: 'document', entity_id: document.id, linked_child_id: document.youngPersonId }),
      previewHref: getEntityRoute({ entity_type: 'document', entity_id: document.id, linked_child_id: document.youngPersonId }),
      chronologyHref: getEntityRoute({ entity_type: 'document', entity_id: document.id, linked_child_id: document.youngPersonId }, 'chronology'),
      permissionsRequired: ['records:read'],
      actions: getEntityActions({ entity_type: 'document', entity_id: document.id, linked_child_id: document.youngPersonId }).slice(0, 4)
    })),
    ...indicareData.notifications.map((notification) => ({
      id: notification.id,
      type: 'notification',
      entityType: normalizeEntityType(notification.linkedRecordType || 'chronology'),
      group: 'Notifications',
      title: notification.title,
      description: notification.message,
      href: getEntityRoute({ entity_type: notification.linkedRecordType || 'chronology_event', entity_id: notification.id }),
      previewHref: '/notifications',
      chronologyHref: getEntityRoute({ entity_type: notification.linkedRecordType || 'chronology_event', entity_id: notification.id }, 'chronology'),
      permissionsRequired: ['records:read'],
      actions: getEntityActions({ entity_type: notification.linkedRecordType || 'chronology_event', entity_id: notification.id }).slice(0, 4)
    })),
    {
      id: 'current-shift',
      type: 'shift',
      entityType: normalizeEntityType('shift'),
      group: 'Shift operations',
      title: 'Current shift board',
      description: 'Live operational board, rapid recording, welfare checks, safeguarding alerts and handover.',
      href: '/shifts/current',
      previewHref: '/shifts/current',
      chronologyHref: '/chronology',
      permissionsRequired: ['records:read'],
      actions: getEntityActions({ entity_type: 'shift', entity_id: 'current' }).slice(0, 4)
    },
    {
      id: 'current-handover',
      type: 'handover',
      entityType: normalizeEntityType('handover'),
      group: 'Shift operations',
      title: 'Current handover',
      description: 'Timeline-led handover with linked records, actions, evidence and management sign-off state.',
      href: '/handover/current',
      previewHref: '/handover/current',
      chronologyHref: '/chronology',
      permissionsRequired: ['records:read'],
      actions: getEntityActions({ entity_type: 'handover', entity_id: 'current' }).slice(0, 4)
    }
  ]

  return results.filter((result) => matches(result, clean)).slice(0, 12)
}
