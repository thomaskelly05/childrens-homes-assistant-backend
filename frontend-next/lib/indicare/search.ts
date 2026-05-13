import { indicareData } from './demo-data'
import { fullName, getYoungPersonById } from './selectors'

export type SearchResult = {
  id: string
  type: string
  group: string
  title: string
  description: string
  href: string
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
      group: 'Young people',
      title: fullName(person),
      description: `${person.preferredName}. ${person.riskLevel} risk. ${person.educationStatus}`,
      href: `/young-people/${person.id}`
    })),
    ...indicareData.staff.map((member) => ({
      id: member.id,
      type: 'staff',
      group: 'Staff',
      title: fullName(member),
      description: `${member.role}. ${member.qualifications.join(', ')}`,
      href: `/staff/${member.id}`
    })),
    ...indicareData.incidents.map((incident) => {
      const person = getYoungPersonById(incident.youngPersonId)
      return {
        id: incident.id,
        type: 'incident',
        group: 'Incidents',
        title: incident.type,
        description: `${person?.preferredName || incident.youngPersonId}. ${incident.severity} severity. ${incident.outcome}`,
        href: `/incidents/${incident.id}`
      }
    }),
    ...indicareData.reports.map((report) => ({
      id: report.id,
      type: 'report',
      group: 'Reports',
      title: report.title,
      description: `${report.type}. ${report.status}. ${report.dateRangeStart} to ${report.dateRangeEnd}`,
      href: `/reports/${report.id}`
    })),
    ...indicareData.documents.map((document) => ({
      id: document.id,
      type: 'document',
      group: 'Documents',
      title: document.title,
      description: `${document.category}. Tags: ${document.tags.join(', ')}`,
      href: '/documents'
    })),
    ...indicareData.notifications.map((notification) => ({
      id: notification.id,
      type: 'notification',
      group: 'Notifications',
      title: notification.title,
      description: notification.message,
      href: '/notifications'
    }))
  ]

  return results.filter((result) => matches(result, clean)).slice(0, 12)
}
