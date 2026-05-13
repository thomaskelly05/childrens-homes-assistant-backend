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

export function fullName(record: NamedRecord) {
  return `${record.firstName} ${record.lastName}`.trim()
}

export function sortByDateDesc<T>(items: readonly T[], getDate: (item: T) => string) {
  return [...items].sort((left, right) => {
    return new Date(getDate(right)).getTime() - new Date(getDate(left)).getTime()
  })
}

export function isOverdue(date: string, referenceDate = REFERENCE_DATE) {
  return new Date(`${date}T23:59:59.999Z`).getTime() < referenceDate.getTime()
}

export function getYoungPersonById(id: string): YoungPerson | undefined {
  return indicareData.youngPeople.find((person) => person.id === id)
}

export function getStaffById(id: string): StaffMember | undefined {
  return indicareData.staff.find((member) => member.id === id)
}

export function getPlacementForYoungPerson(youngPersonId: string) {
  return indicareData.placements.find((placement) => placement.youngPersonId === youngPersonId)
}

export function getIncidentsForYoungPerson(youngPersonId: string): Incident[] {
  return sortByDateDesc(
    indicareData.incidents.filter((incident) => incident.youngPersonId === youngPersonId),
    (incident) => incident.dateTime
  )
}

export function getAppointmentsForYoungPerson(youngPersonId: string): Appointment[] {
  return [...indicareData.appointments]
    .filter((appointment) => appointment.youngPersonId === youngPersonId)
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime())
}

export function getAssignedYoungPeople(staffId: string): YoungPerson[] {
  const member = getStaffById(staffId)
  if (!member) return []
  return member.assignedYoungPeople
    .map((youngPersonId) => getYoungPersonById(youngPersonId))
    .filter((person): person is YoungPerson => Boolean(person))
}

export function getLogsByStaff(staffId: string): DailyLog[] {
  return sortByDateDesc(
    indicareData.dailyLogs.filter((log) => log.staffId === staffId),
    (log) => log.createdAt
  )
}

export function getIncidentsByStaff(staffId: string): Incident[] {
  return sortByDateDesc(
    indicareData.incidents.filter((incident) => incident.staffIds.includes(staffId)),
    (incident) => incident.dateTime
  )
}

export function getKeyworkByStaff(staffId: string): KeyworkSession[] {
  return sortByDateDesc(
    indicareData.keyworkSessions.filter((session) => session.staffId === staffId),
    (session) => session.date
  )
}

export function getAppointmentsByStaff(staffId: string): Appointment[] {
  return [...indicareData.appointments]
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
      indicareData.dailyLogs.filter((log) => log.youngPersonId === id),
      (log) => log.createdAt
    ),
    incidents: getIncidentsForYoungPerson(id),
    safeguarding: sortByDateDesc(
      indicareData.safeguardingEvents.filter((event) => event.youngPersonId === id),
      (event) => event.date
    ),
    risks: indicareData.riskAssessments.filter((risk) => risk.youngPersonId === id),
    medication: indicareData.medicationRecords.filter((record) => record.youngPersonId === id),
    keywork: sortByDateDesc(
      indicareData.keyworkSessions.filter((session) => session.youngPersonId === id),
      (session) => session.date
    ),
    appointments: getAppointmentsForYoungPerson(id),
    documents: indicareData.documents.filter((document) => document.youngPersonId === id),
    reports: indicareData.reports.filter((report) => report.youngPersonId === id),
    audit: sortByDateDesc(
      indicareData.audit.filter((event) => event.youngPersonId === id),
      (event) => event.timestamp
    )
  }
}

export function dashboardMetrics() {
  const activeYoungPeople = indicareData.youngPeople.filter((person) => person.status === 'active')
  const highRisk = indicareData.youngPeople.filter((person) => ['high', 'critical'].includes(person.riskLevel))
  const openIncidents = indicareData.incidents.filter((incident) => incident.status !== 'closed')
  const overdueReports = indicareData.reports.filter((report) => report.status === 'overdue')
  const upcomingAppointments = indicareData.appointments.filter((appointment) => appointment.status !== 'closed')
  const medicationAlerts = indicareData.medicationRecords.filter((record) =>
    record.administrationHistory.some((entry) => ['missed', 'overdue'].includes(entry.status))
  )
  const safeguardingConcerns = indicareData.safeguardingEvents.filter((event) => event.status !== 'closed')

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
  return indicareData.riskAssessments.filter((risk) => risk.youngPersonId === youngPersonId)
}
