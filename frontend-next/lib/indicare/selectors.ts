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

const REFERENCE_DATE = new Date()

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

export function getYoungPersonById(_id: string | null | undefined): YoungPerson | undefined {
  return undefined
}

export function getStaffById(_id: string | null | undefined): StaffMember | undefined {
  return undefined
}

export function getPlacementForYoungPerson(_youngPersonId: string) {
  return undefined
}

export function getIncidentsForYoungPerson(_youngPersonId: string): Incident[] {
  return []
}

export function getAppointmentsForYoungPerson(_youngPersonId: string): Appointment[] {
  return []
}

export function getAssignedYoungPeople(_staffId: string): YoungPerson[] {
  return []
}

export function getLogsByStaff(_staffId: string): DailyLog[] {
  return []
}

export function getIncidentsByStaff(_staffId: string): Incident[] {
  return []
}

export function getKeyworkByStaff(_staffId: string): KeyworkSession[] {
  return []
}

export function getAppointmentsByStaff(_staffId: string): Appointment[] {
  return []
}

export function getYoungPersonSummary(_id: string): YoungPersonSummary | undefined {
  return undefined
}

export function dashboardMetrics() {
  return {
    currentYoungPeople: 0,
    availableBeds: 0,
    highRisk: 0,
    openIncidents: 0,
    overdueReports: 0,
    upcomingAppointments: 0,
    medicationAlerts: 0,
    safeguardingConcerns: 0
  }
}

export function risksForYoungPerson(_youngPersonId: string): RiskAssessment[] {
  return []
}