export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type ImportantContact = {
  name: string
  relationship: string
  phone: string
}

export type YoungPerson = {
  id: string
  firstName: string
  lastName: string
  preferredName: string
  age: number
  gender: string
  status: string
  legalStatus: string
  communicationNeeds: string | string[]
  educationStatus: string
  healthSummary: string
  riskLevel: RiskLevel
  safeguardingStatus: string
  allocatedKeyWorkerId: string
  likes: string[]
  dislikes: string[]
  allergies: string[]
  importantContacts: ImportantContact[]
  dateOfBirth?: string
  currentPlacementId?: string
  sensoryNeeds?: string[]
  routines?: string[]
}

export type StaffMember = {
  id: string
  firstName: string
  lastName: string
  role: string
  status: string
  qualifications: string[]
  assignedYoungPeople: string[]
  shiftPattern: string
  email: string
  phone: string
  startDate?: string
  training?: unknown[]
  supervision?: unknown[]
}

export type Placement = {
  id: string
  youngPersonId: string
  placementType: string
  startDate: string
  plannedEndDate?: string
  localAuthority: string
  socialWorkerName: string
  socialWorkerContact: string
  placementGoals: string[]
  status: string
}

export type DailyLog = {
  id: string
  youngPersonId: string
  staffId: string
  date: string
  createdAt: string
  shift: string
  mood: string
  presentation: string
  followUpActions: string[]
  positiveMoments?: string[]
  concerns?: string[]
  routines?: string[]
  foodAndSleep?: string
  educationAndActivities?: string
  familyContact?: string
  recordedBy?: string
}

export type Incident = {
  id: string
  youngPersonId: string
  staffIds: string[]
  dateTime: string
  type: string
  severity: RiskLevel
  location: string
  status: string
  description: string
  trigger: string
  deEscalationUsed: string[]
  outcome: string
  injuries: string
  policeInvolved: boolean
  ambulanceInvolved: boolean
  safeguardingRequired: boolean
  managerReview: string
  followUpActions: string[]
  managerReviewStatus?: string
  safeguardingLinked?: boolean
  restraintUsed?: boolean
  recordedBy?: string
}

export type SafeguardingEvent = {
  id: string
  youngPersonId: string
  date: string
  concernType: string
  description: string
  actionTaken: string
  reportedTo: string
  externalAgencies: string[]
  status: string
}

export type RiskAssessment = {
  id: string
  youngPersonId: string
  category: string
  riskLevel: RiskLevel
  description: string
  controlMeasures: string[]
  reviewDate: string
  reviewedBy: string
  status: string
  responsibleStaffId?: string
}

export type MedicationAdministration = {
  dateTime: string
  status: string
  notes: string
}

export type MedicationRecord = {
  id: string
  youngPersonId: string
  medicationName: string
  dosage: string
  frequency: string
  route: string
  prescribedBy: string
  status: string
  administrationHistory: MedicationAdministration[]
  reviewDate?: string
  notes?: string
}

export type KeyworkSession = {
  id: string
  youngPersonId: string
  staffId: string
  date: string
  topic: string
  goals: string[]
  youngPersonVoice: string
  actions: string[]
  nextSessionDate: string
  staffReflection?: string
  recordedBy?: string
}

export type Appointment = {
  id: string
  youngPersonId: string
  staffId: string
  dateTime: string
  type: string
  professional: string
  location: string
  outcome: string
  followUpRequired: boolean
  status: string
  appointmentType?: string
  nextAppointmentDate?: string
}

export type DocumentRecord = {
  id: string
  youngPersonId: string
  title: string
  category: string
  uploadedBy: string
  uploadedAt: string
  reviewDate: string
  tags: string[]
  fileUrl: string
}

export type ReportRecord = {
  id: string
  youngPersonId: string
  title: string
  type: string
  dateRangeStart: string
  dateRangeEnd: string
  generatedBy: string
  status: string
  createdAt: string
  updatedAt: string
}

export type NotificationRecord = {
  id: string
  createdAt: string
  priority: string
  title: string
  message: string
  linkedRecordType: string
  read: boolean
}

export type AuditEvent = {
  id: string
  youngPersonId: string
  timestamp: string
  actorId: string
  action: string
}

export type ReportSection = {
  title: string
  body: string
  evidence: string[]
}

export type IndiCareData = {
  youngPeople: YoungPerson[]
  staff: StaffMember[]
  placements: Placement[]
  dailyLogs: DailyLog[]
  incidents: Incident[]
  safeguardingEvents: SafeguardingEvent[]
  riskAssessments: RiskAssessment[]
  medicationRecords: MedicationRecord[]
  keyworkSessions: KeyworkSession[]
  appointments: Appointment[]
  documents: DocumentRecord[]
  reports: ReportRecord[]
  notifications: NotificationRecord[]
  audit: AuditEvent[]
}

export type YoungPersonSummary = {
  youngPerson: YoungPerson
  placement?: Placement
  keyWorker?: StaffMember
  dailyLogs: DailyLog[]
  incidents: Incident[]
  safeguarding: SafeguardingEvent[]
  risks: RiskAssessment[]
  medication: MedicationRecord[]
  keywork: KeyworkSession[]
  appointments: Appointment[]
  documents: DocumentRecord[]
  reports: ReportRecord[]
  audit: AuditEvent[]
}