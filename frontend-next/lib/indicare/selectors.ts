import { getOsActions } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'
import { getOsEvidence } from '@/lib/os-api/evidence'
import { getSchemaLiveResource, getYoungPersonSchemaRecord } from '@/lib/os-api/schema-live'
import { getOsYoungPeople, getOsYoungPersonWorkspace } from '@/lib/os-api/workspaces'
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

function str(value: unknown, fallback = '') {
  return value === null || value === undefined ? fallback : String(value)
}

function arr<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value === null || value === undefined || value === '') return []
  return [value as T]
}

function rowList(payload: unknown): Record<string, any>[] {
  if (Array.isArray(payload)) return payload as Record<string, any>[]
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, any>
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.records)) return record.records
  if (Array.isArray(record.data)) return record.data
  return []
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

function mapYoungPerson(row: Record<string, any>): YoungPerson {
  return {
    id: str(row.id || row.source_id),
    firstName: str(row.first_name || row.firstName || row.preferredName || row.displayName || 'Young'),
    lastName: str(row.last_name || row.lastName || (row.displayName ? '' : 'Person')),
    preferredName: str(row.preferred_name || row.preferredName || row.display_name || row.displayName || row.first_name || row.firstName || 'Young person'),
    dateOfBirth: str(row.date_of_birth || row.dateOfBirth),
    age: Number(row.age || 0),
    gender: str(row.gender || row.sex),
    status: str(row.status || row.placementStatus || 'active'),
    legalStatus: str(row.legal_status || row.legalStatus),
    riskLevel: str(row.risk_level || row.riskLevel || 'medium') as YoungPerson['riskLevel'],
    safeguardingStatus: str(row.safeguarding_status || row.safeguardingStatus || ''),
    educationStatus: str(row.education_status || row.educationStatus || ''),
    healthSummary: str(row.health_summary || row.healthSummary || ''),
    allocatedKeyWorkerId: str(row.allocated_key_worker_id || row.keyWorkerId || row.key_worker_id),
    currentPlacementId: str(row.current_placement_id || row.placement_id || row.currentPlacementId),
    likes: arr<string>(row.likes),
    dislikes: arr<string>(row.dislikes),
    allergies: arr<string>(row.allergies),
    importantContacts: arr<Record<string, any>>(row.important_contacts || row.importantContacts).map((contact) => ({
      name: str(contact.name || contact.full_name || contact.fullName),
      relationship: str(contact.relationship || contact.relationship_to_young_person),
      phone: str(contact.phone || contact.telephone || contact.mobile)
    })),
    communicationNeeds: arr<string>(row.communication_needs || row.communicationNeeds),
    sensoryNeeds: arr<string>(row.sensory_needs || row.sensoryNeeds),
    routines: arr<string>(row.routines)
  }
}

function mapStaff(row: Record<string, any>): StaffMember {
  return {
    id: str(row.id || row.staff_id || row.user_id),
    firstName: str(row.first_name || row.firstName || row.display_name || row.name || 'Staff'),
    lastName: str(row.last_name || row.lastName || ''),
    role: str(row.role || row.job_title || 'staff'),
    email: str(row.email),
    phone: str(row.phone),
    status: str(row.status || row.employment_status || 'active') as StaffMember['status'],
    startDate: str(row.start_date || row.created_at),
    training: [],
    supervision: [],
    qualifications: [],
    assignedYoungPeople: [],
    shiftPattern: ''
  }
}

function mapIncident(event: any): Incident {
  return {
    id: str(event.id),
    youngPersonId: str(event.youngPersonIds?.[0] || event.young_person_id || ''),
    staffIds: arr<string>(event.staffIds || event.staff_ids || event.createdBy || event.created_by),
    dateTime: str(event.dateTime || event.date_time || event.created_at),
    type: str(event.eventType || event.category || 'incident'),
    severity: str(event.severity || 'medium') as Incident['severity'],
    location: str(event.location || ''),
    status: str(event.status || 'open'),
    description: str(event.fullText || event.summary || event.title),
    trigger: str(event.trigger || ''),
    deEscalationUsed: arr<string>(event.deEscalationUsed || event.de_escalation_used),
    outcome: str(event.outcome || event.summary || ''),
    injuries: str(event.injuries || ''),
    policeInvolved: Boolean(event.policeInvolved || event.police_involved),
    ambulanceInvolved: Boolean(event.ambulanceInvolved || event.ambulance_involved),
    safeguardingRequired: Boolean(event.safeguardingRequired || event.safeguarding_required || event.safeguardingFlags?.length),
    managerReview: str(event.managerReview || event.manager_review || event.managerReviewStatus || 'pending'),
    followUpActions: arr<string>(event.actionIds || event.action_ids),
    recordedBy: str(event.createdBy || event.created_by),
    managerReviewStatus: str(event.managerReviewStatus || event.managerReview || 'pending'),
    safeguardingLinked: Boolean(event.safeguardingFlags?.length),
    restraintUsed: str(event.title || event.category || '').toLowerCase().includes('restraint')
  }
}

function mapDailyLog(event: any): DailyLog {
  return {
    id: str(event.id),
    youngPersonId: str(event.youngPersonIds?.[0] || event.young_person_id || ''),
    staffId: str(event.staffId || event.staff_id || event.createdBy || event.created_by),
    date: str(event.dateTime || event.date_time || event.created_at).slice(0, 10),
    createdAt: str(event.createdAt || event.created_at || event.dateTime),
    shift: str(event.category || 'daily note'),
    mood: str(event.mood || ''),
    presentation: str(event.summary || event.fullText || event.title),
    positiveMoments: [],
    concerns: event.severity === 'high' || event.severity === 'critical' ? [str(event.summary || event.title)] : [],
    routines: [],
    foodAndSleep: '',
    educationAndActivities: '',
    familyContact: '',
    followUpActions: arr<string>(event.actionIds || event.action_ids),
    recordedBy: str(event.createdBy || event.created_by)
  }
}

function mapRisk(event: any): RiskAssessment {
  return {
    id: str(event.id),
    youngPersonId: str(event.youngPersonIds?.[0] || event.young_person_id || ''),
    category: str(event.category || event.eventType || 'risk'),
    riskLevel: str(event.severity || 'medium') as RiskAssessment['riskLevel'],
    description: str(event.summary || event.fullText || event.title),
    controlMeasures: arr<string>(event.riskFlags || event.risk_flags),
    reviewDate: str(event.updatedAt || event.updated_at || event.createdAt || event.created_at).slice(0, 10),
    reviewedBy: str(event.createdBy || event.created_by),
    responsibleStaffId: str(event.createdBy || event.created_by),
    status: 'active'
  }
}

function buildSummaryFromWorkspace(id: string, workspace: Awaited<ReturnType<typeof getOsYoungPersonWorkspace>>['data']): YoungPersonSummary | undefined {
  const person = workspace.youngPerson ? mapYoungPerson(workspace.youngPerson as any) : undefined
  if (!person) return undefined
  const chronology = workspace.chronology || []
  const dailyLogs = chronology.filter((event) => ['daily_log', 'daily_note', 'daily_notes'].includes(String(event.sourceType || event.eventType))).map((event) => mapDailyLog(event))
  const incidents = chronology.filter((event) => `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('incident')).map((event) => mapIncident(event))
  const safeguarding = chronology.filter((event) => event.safeguardingFlags.length || `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('safeguard')).map((event) => ({
    id: event.id,
    youngPersonId: id,
    date: event.dateTime.slice(0, 10),
    concernType: event.category,
    description: event.summary || event.fullText || event.title,
    actionTaken: event.actionIds.join(', '),
    reportedTo: '',
    status: 'open',
    externalAgencies: []
  }))
  const keywork = chronology.filter((event) => `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('keywork')).map((event) => ({
    id: event.id,
    youngPersonId: id,
    staffId: str(event.createdBy),
    date: event.dateTime.slice(0, 10),
    topic: event.title,
    goals: [],
    youngPersonVoice: event.summary || event.fullText,
    actions: event.actionIds,
    nextSessionDate: '',
    staffReflection: '',
    recordedBy: event.createdBy
  }))
  const risks = chronology.filter((event) => event.riskFlags.length || `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('risk')).map((event) => mapRisk(event))
  const appointments = chronology.filter((event) => `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('appointment')).map((event) => ({
    id: event.id,
    youngPersonId: id,
    staffId: str(event.createdBy),
    type: event.title,
    appointmentType: event.title,
    dateTime: event.dateTime,
    professional: '',
    location: '',
    outcome: event.summary,
    followUpRequired: Boolean(event.actionIds.length),
    status: 'scheduled',
    nextAppointmentDate: undefined
  }))
  const medication = chronology.filter((event) => `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('medication')).map((event) => ({
    id: event.id,
    youngPersonId: id,
    medicationName: event.title,
    dosage: '',
    frequency: '',
    route: '',
    prescribedBy: '',
    status: 'active',
    reviewDate: event.updatedAt.slice(0, 10),
    notes: event.summary,
    administrationHistory: []
  }))
  return {
    youngPerson: person,
    placement: undefined,
    dailyLogs,
    incidents,
    risks,
    keywork,
    appointments,
    medication,
    safeguarding,
    documents: [],
    reports: [],
    audit: []
  }
}

export function getYoungPersonById(_id: string | null | undefined): YoungPerson | undefined {
  return undefined
}

export async function getLiveYoungPersonById(id: string | null | undefined): Promise<YoungPerson | undefined> {
  if (!id) return undefined
  const people = await getOsYoungPeople()
  const found = people.data.find((person) => String(person.id) === String(id))
  return found ? mapYoungPerson(found as any) : undefined
}

export function getStaffById(_id: string | null | undefined): StaffMember | undefined {
  return undefined
}

export async function getLiveStaffById(id: string | null | undefined): Promise<StaffMember | undefined> {
  if (!id) return undefined
  const result = await getSchemaLiveResource('staff', { staffId: id, limit: 1 })
  const row = result.data.items.find((item) => String(item.id || item.staff_id || item.user_id) === String(id)) || result.data.items[0]
  return row ? mapStaff(row) : undefined
}

export function getPlacementForYoungPerson(_youngPersonId: string) {
  return undefined
}

export async function getLivePlacementForYoungPerson(youngPersonId: string) {
  const result = await getSchemaLiveResource('placement_plans', { youngPersonId, limit: 1 })
  return result.data.items[0]
}

export function getIncidentsForYoungPerson(_youngPersonId: string): Incident[] {
  return []
}

export async function getLiveIncidentsForYoungPerson(youngPersonId: string): Promise<Incident[]> {
  const chronology = await getOsChronology({ youngPersonId })
  return chronology.data.filter((event) => `${event.sourceType} ${event.eventType} ${event.category}`.toLowerCase().includes('incident')).map((event) => mapIncident(event))
}

export function getAppointmentsForYoungPerson(_youngPersonId: string): Appointment[] {
  return []
}

export async function getLiveAppointmentsForYoungPerson(youngPersonId: string): Promise<Appointment[]> {
  const summary = await getLiveYoungPersonSummary(youngPersonId)
  return summary?.appointments || []
}

export function getAssignedYoungPeople(_staffId: string): YoungPerson[] {
  return []
}

export async function getLiveAssignedYoungPeople(staffId: string): Promise<YoungPerson[]> {
  const people = await getOsYoungPeople()
  return people.data.filter((person) => String((person as any).keyWorkerId || (person as any).key_worker_id || '') === String(staffId)).map((person) => mapYoungPerson(person as any))
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

export async function getLiveYoungPersonSummary(id: string): Promise<YoungPersonSummary | undefined> {
  const workspace = await getOsYoungPersonWorkspace(id)
  if (workspace.data.youngPerson) return buildSummaryFromWorkspace(id, workspace.data)
  const record = await getYoungPersonSchemaRecord(id)
  const resources = (record.data as any).resources || {}
  const youngPersonRow = rowList(resources.young_people || resources.young_person || []).find((item) => String(item.id) === String(id))
  if (!youngPersonRow) return undefined
  return buildSummaryFromWorkspace(id, {
    youngPerson: youngPersonRow as any,
    chronology: [],
    actions: [],
    evidence: []
  })
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

export async function liveDashboardMetrics() {
  const [people, chronology, actions, evidence] = await Promise.all([
    getOsYoungPeople(),
    getOsChronology(),
    getOsActions(),
    getOsEvidence()
  ])
  const chronologyText = chronology.data.map((event) => `${event.sourceType} ${event.eventType} ${event.category} ${event.title}`.toLowerCase())
  return {
    currentYoungPeople: people.data.length,
    availableBeds: 0,
    highRisk: people.data.filter((person) => ['high', 'critical'].includes(String(person.riskLevel || '').toLowerCase())).length,
    openIncidents: chronologyText.filter((text) => text.includes('incident')).length,
    overdueReports: actions.data.filter((action) => action.status !== 'completed' && isOverdue(action.dueDate || '')).length,
    upcomingAppointments: chronologyText.filter((text) => text.includes('appointment')).length,
    medicationAlerts: chronologyText.filter((text) => text.includes('medication')).length,
    safeguardingConcerns: chronology.data.filter((event) => event.safeguardingFlags.length || `${event.category} ${event.title}`.toLowerCase().includes('safeguard')).length,
    evidenceItems: evidence.data.length,
    openActions: actions.data.filter((action) => action.status !== 'completed').length
  }
}

export function risksForYoungPerson(_youngPersonId: string): RiskAssessment[] {
  return []
}

export async function liveRisksForYoungPerson(youngPersonId: string): Promise<RiskAssessment[]> {
  const summary = await getLiveYoungPersonSummary(youngPersonId)
  return summary?.risks || []
}