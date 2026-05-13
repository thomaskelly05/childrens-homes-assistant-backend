import { indicareData } from './demo-data'
import {
  Appointment,
  DailyLog,
  Incident,
  KeyworkSession,
  RiskAssessment,
  StaffMember,
  YoungPerson,
  YoungPersonSummary
} from './types'

type NamedRecord = {
  firstName: string
  lastName: string
}

const REFERENCE_DATE = new Date('2026-05-13T12:00:00.000Z')

function list<T>(items: readonly T[] | null | undefined): readonly T[] {
  return Array.isArray(items) ? items : []
}

export function fullName(record: NamedRecord | null | undefined) {
  if (!record) return ''
  return `${record.firstName || ''} ${record.lastName || ''}`.trim()
}

export function sortByDateDesc<T>(items: readonly T[] | null | undefined, getDate: (item: T) => string) {
  return [...list(items)].sort((left, right) => {
    return new Date(getDate(right) || 0).getTime() - new Date(getDate(left) || 0).getTime()
  })
}

export function isOverdue(date: string, referenceDate = REFERENCE_DATE) {
  if (!date) return false
  return new Date(`${date}T23:59:59.999Z`).getTime() < referenceDate.getTime()
}

export function getYoungPersonById(id: string | null | undefined): YoungPerson | undefined {
  if (!id) return undefined
  return list(indicareData.youngPeople).find((person) => person.id === id)
}

export function getStaffById(id: string | null | undefined): StaffMember | undefined {
  if (!id) return undefined
  return list(indicareData.staff).find((member) => member.id === id)
}

export function getPlacementForYoungPerson(youngPersonId: string) {
  return list(indicareData.placements).find((placement) => placement.youngPersonId === youngPersonId)
}

export function getIncidentsForYoungPerson(youngPersonId: string): Incident[] {
  return sortByDateDesc(
    list(indicareData.incidents).filter((incident) => incident.youngPersonId === youngPersonId),
    (incident) => incident.dateTime
  )
}

export function getAppointmentsForYoungPerson(youngPersonId: string): Appointment[] {
  return [...list(indicareData.appointments)]
    .filter((appointment) => appointment.youngPersonId === youngPersonId)
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime())
}

export function getAssignedYoungPeople(staffId: string): YoungPerson[] {
  const member = getStaffById(staffId)
  if (!member) return []
  return list(member.assignedYoungPeople)
    .map((youngPersonId) => getYoungPersonById(youngPersonId))
    .filter((person): person is YoungPerson => Boolean(person))
}

export function getLogsByStaff(staffId: string): DailyLog[] {
  return sortByDateDesc(
    list(indicareData.dailyLogs).filter((log) => log.staffId === staffId),
    (log) => log.createdAt
  )
}

export function getIncidentsByStaff(staffId: string): Incident[] {
  return sortByDateDesc(
    list(indicareData.incidents).filter((incident) => list(incident.staffIds).includes(staffId)),
    (incident) => incident.dateTime
  )
}

export function getKeyworkByStaff(staffId: string): KeyworkSession[] {
  return sortByDateDesc(
    list(indicareData.keyworkSessions).filter((session) => session.staffId === staffId),
    (session) => session.date
  )
}

export function getAppointmentsByStaff(staffId: string): Appointment[] {
  return [...list(indicareData.appointments)]
    .filter((appointment) => appointment.staffId === staffId)
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime())
}

export function getYoungPersonSummary(id: string): YoungPersonSummary | undefined {
  const youngPerson = getYoungPersonById(id)
  if (!youngPerson) return undefined

  return {
    youngPerson,
    placement: getPlacementForYoungPerson(id),
    keyWorker: getStaffById(youngPerson.allocatedKeyWorkerId),
    dailyLogs: sortByDateDesc(
      list(indicareData.dailyLogs).filter((log) => log.youngPersonId === id),
      (log) => log.createdAt
    ),
    incidents: getIncidentsForYoungPerson(id),
    safeguarding: sortByDateDesc(
      list(indicareData.safeguardingEvents).filter((event) => event.youngPersonId === id),
      (event) => event.date
    ),
    risks: list(indicareData.riskAssessments).filter((risk) => risk.youngPersonId === id),
    medication: list(indicareData.medicationRecords).filter((record) => record.youngPersonId === id),
    keywork: sortByDateDesc(
      list(indicareData.keyworkSessions).filter((session) => session.youngPersonId === id),
      (session) => session.date
    ),
    appointments: getAppointmentsForYoungPerson(id),
    documents: list(indicareData.documents).filter((document) => document.youngPersonId === id),
    reports: list(indicareData.reports).filter((report) => report.youngPersonId === id),
    audit: sortByDateDesc(
      list(indicareData.audit).filter((event) => event.youngPersonId === id),
      (event) => event.timestamp
    )
  }
}

export function dashboardMetrics() {
  const activeYoungPeople = list(indicareData.youngPeople).filter((person) => person.status === 'active')
  const highRisk = list(indicareData.youngPeople).filter((person) => ['high', 'critical'].includes(person.riskLevel))
  const openIncidents = list(indicareData.incidents).filter((incident) => incident.status !== 'closed')
  const overdueReports = list(indicareData.reports).filter((report) => report.status === 'overdue')
  const upcomingAppointments = list(indicareData.appointments).filter((appointment) => appointment.status !== 'closed')
  const medicationAlerts = list(indicareData.medicationRecords).filter((record) =>
    list(record.administrationHistory).some((entry) => ['missed', 'overdue'].includes(entry.status))
  )
  const safeguardingConcerns = list(indicareData.safeguardingEvents).filter((event) => event.status !== 'closed')

  return {
    currentYoungPeople: activeYoungPeople.length,
    availableBeds: Math.max(0, 7 - activeYoungPeople.length),
    highRisk: highRisk.length,
    openIncidents: openIncidents.length,
    overdueReports: overdueReports.length,
    upcomingAppointments: upcomingAppointments.length,
    medicationAlerts: medicationAlerts.length,
    safeguardingConcerns: safeguardingConcerns.length
  }
}

export function risksForYoungPerson(youngPersonId: string): RiskAssessment[] {
  return list(indicareData.riskAssessments).filter((risk) => risk.youngPersonId === youngPersonId)
}
