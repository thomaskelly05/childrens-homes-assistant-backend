import { indicareData } from '@/lib/indicare/demo-data'
import type { DailyLog, RiskLevel, StaffMember, YoungPerson } from '@/lib/indicare/types'
import { getAssignedYoungPeople, getIncidentsByStaff, getLogsByStaff, getStaffById, getYoungPersonById } from '@/lib/indicare/selectors'

export type OperationalCard = {
  id: string
  type: 'active incident' | 'missing episode' | 'safeguarding alert' | 'medication concern' | 'missing recording' | 'placement concern'
  title: string
  summary: string
  urgency: RiskLevel
  priorityScore: number
  assignment?: string
  href: string
}

export type ShiftLifecycleState = {
  label: string
  completed: boolean
}

export type RapidRecordingType = {
  id: string
  label: string
  route: string
  hint: string
}

export type HandoverAction = {
  id: string
  title: string
  details: string
  priority: string
  requiresFollowUp: boolean
  href: string
}

export type HandoverTimelineItem = {
  id: string
  type: string
  title: string
  details: string
  date?: string
  href: string
}

export type StaffOperationalTask = {
  id: string
  title: string
  summary: string
  urgency: string
  href: string
}

export type StaffQueueItem = StaffOperationalTask | {
  id: string
  type: string
  urgency: string
} | {
  id: string
  urgency: string
}

export type StaffOperationalWorkspace = {
  staff?: StaffMember
  assignedChildren: YoungPerson[]
  outstandingTasks: StaffOperationalTask[]
  recordingDue: DailyLog[]
  handoverActions: HandoverAction[]
  queues: Record<'needsAttention' | 'recordingOverdue' | 'awaitingReview', StaffQueueItem[]>
}

export const rapidRecordingTypes: RapidRecordingType[] = [
  { id: 'daily_note', label: 'Daily note', route: '/daily-logs', hint: 'Turn a short observation into a professional daily record draft.' },
  { id: 'incident', label: 'Incident', route: '/incidents', hint: 'Capture facts, de-escalation, outcome and manager review needs.' },
  { id: 'safeguarding', label: 'Safeguarding', route: '/safeguarding', hint: 'Record facts separately from interpretation and prompt escalation review.' },
  { id: 'handover', label: 'Handover', route: '/handover/current', hint: 'Prepare concise handover points with actions and evidence links.' }
]

const referenceDate = new Date('2026-05-13T12:00:00.000Z')

function firstStaff() {
  return indicareData.staff[0]
}

function childName(id: string) {
  const child = getYoungPersonById(id)
  return child?.preferredName || id
}

function highRiskChildren() {
  return indicareData.youngPeople.filter((child) => ['high', 'critical'].includes(child.riskLevel))
}

function openIncidents() {
  return indicareData.incidents.filter((incident) => incident.status !== 'closed')
}

function safeguardingConcerns() {
  return indicareData.safeguardingEvents.filter((event) => event.status !== 'closed')
}

function overdueLogs() {
  return indicareData.dailyLogs.filter((log) => new Date(`${log.date}T23:59:59.999Z`).getTime() < referenceDate.getTime())
}

function buildCards(): OperationalCard[] {
  const cards: OperationalCard[] = []
  const incident = openIncidents()[0]
  if (incident) {
    cards.push({
      id: incident.id,
      type: incident.safeguardingRequired ? 'safeguarding alert' : 'active incident',
      title: `${childName(incident.youngPersonId)} - ${incident.type}`,
      summary: incident.description,
      urgency: incident.severity,
      priorityScore: incident.safeguardingRequired ? 92 : 72,
      assignment: incident.staffIds[0],
      href: `/incidents/${incident.id}`
    })
  }

  highRiskChildren().forEach((child, index) => {
    cards.push({
      id: `risk-${child.id}`,
      type: child.safeguardingStatus === 'active' ? 'safeguarding alert' : 'placement concern',
      title: `${child.preferredName} needs shift awareness`,
      summary: `${child.preferredName} is ${child.riskLevel} risk with ${child.safeguardingStatus} safeguarding status.`,
      urgency: child.riskLevel,
      priorityScore: 80 - index * 8,
      assignment: child.allocatedKeyWorkerId,
      href: `/young-people/${child.id}`
    })
  })

  overdueLogs().slice(0, 2).forEach((log, index) => {
    cards.push({
      id: `recording-${log.id}`,
      type: 'missing recording',
      title: `${childName(log.youngPersonId)} recording follow-up`,
      summary: log.followUpActions.join(', ') || 'Recording follow-up is required.',
      urgency: 'medium',
      priorityScore: 58 - index * 4,
      assignment: log.staffId,
      href: '/daily-logs'
    })
  })

  return cards.slice(0, 6)
}

export function currentShift() {
  const cards = buildCards()
  return {
    id: 'shift-evening-oak-house',
    homeName: 'Oak House',
    shiftType: 'Evening shift',
    stats: {
      activeStaff: indicareData.staff.filter((staff) => staff.status === 'active').length,
      assignedChildren: indicareData.youngPeople.filter((child) => child.status === 'active').length,
      outstandingTasks: cards.length,
      managerEscalations: cards.filter((card) => ['high', 'critical'].includes(card.urgency)).length,
      incidents: openIncidents().length,
      safeguardingConcerns: safeguardingConcerns().length,
      medicationAlerts: indicareData.medicationRecords.filter((record) => record.administrationHistory.some((entry) => ['missed', 'overdue'].includes(entry.status))).length,
      welfareChecksDue: highRiskChildren().length
    },
    cards,
    lifecycle: [
      { label: 'shift started', completed: true },
      { label: 'welfare checks', completed: false },
      { label: 'recording quality review', completed: false },
      { label: 'handover prepared', completed: false }
    ] satisfies ShiftLifecycleState[],
    activeStaff: indicareData.staff.filter((staff) => staff.status === 'active')
  }
}

export function proactiveAssistantSupport() {
  return {
    prompts: [
      'Start my shift.',
      'What do I need to know?',
      'Prepare handover.',
      'What changed today?',
      'What requires follow-up?',
      'Which children require attention?',
      'Which incidents still need follow-up?'
    ],
    suggestedActions: [
      'Check manager review on high-priority incidents.',
      'Confirm child voice evidence is present for key records.',
      'Link overdue recording into chronology where appropriate.',
      'Assign unresolved actions before handover sign-off.',
      'Return weak records for amendment rather than approving unclear wording.'
    ]
  }
}

export function currentHandover() {
  const items: HandoverAction[] = buildCards().map((card) => ({
    id: `handover-${card.id}`,
    title: card.title,
    details: card.summary,
    priority: card.urgency,
    requiresFollowUp: card.urgency !== 'low',
    href: card.href
  }))
  const timeline: HandoverTimelineItem[] = items.map((item, index) => ({
    id: `timeline-${item.id}`,
    type: item.title.toLowerCase().includes('safeguarding') ? 'safeguarding review' : 'handover action',
    title: item.title,
    details: item.details,
    date: new Date(referenceDate.getTime() - index * 60 * 60 * 1000).toISOString(),
    href: item.href
  }))
  const unresolvedActions = items.filter((item) => item.requiresFollowUp)
  const safeguardingAlerts = safeguardingConcerns().map((event) => ({
    id: event.id,
    title: `${childName(event.youngPersonId)} - ${event.concernType}`,
    details: event.actionTaken,
    href: `/safeguarding/${event.id}`
  }))
  const childrenRequiringAttention = highRiskChildren().map((child) => ({
    id: child.id,
    title: child.preferredName,
    details: `${child.riskLevel} risk; ${child.safeguardingStatus} safeguarding status.`,
    href: `/young-people/${child.id}/journey`
  }))
  const keyEventsToday = [
    ...openIncidents().map((incident) => ({
      id: `incident-${incident.id}`,
      title: `${childName(incident.youngPersonId)} - ${incident.type}`,
      details: incident.outcome,
      href: `/incidents/${incident.id}`
    })),
    ...indicareData.dailyLogs.slice(0, 3).map((log) => ({
      id: `daily-${log.id}`,
      title: `${childName(log.youngPersonId)} - ${log.shift} note`,
      details: log.presentation,
      href: `/daily-logs/${log.id}`
    }))
  ]

  return {
    items,
    timeline,
    unresolvedActions,
    safeguardingAlerts,
    childrenRequiringAttention,
    keyEventsToday,
    recordingGaps: overdueLogs().map((log) => ({
      id: log.id,
      title: `${childName(log.youngPersonId)} recording follow-up`,
      details: log.followUpActions.join(', ') || 'Daily note follow-up needs review.',
      href: '/daily-logs'
    }))
  }
}

export function handoverHistory() {
  return [
    {
      id: 'handover-2026-05-12',
      shift: '12 May evening',
      status: 'signed off',
      summary: 'Handover signed with safeguarding review and recording follow-up visible.',
      href: '/handover/current'
    },
    {
      id: 'handover-2026-05-11',
      shift: '11 May evening',
      status: 'reviewed',
      summary: 'No critical incidents; child voice evidence carried forward for manager review.',
      href: '/handover/current'
    }
  ]
}

export function safeguardingWorkflowTimeline(): HandoverTimelineItem[] {
  return [
    {
      id: 'sg-flow-1',
      type: 'incident facts',
      title: 'Incident facts recorded',
      details: 'Capture who, what, when, where and immediate safety actions without unsupported conclusions.',
      href: '/incidents'
    },
    {
      id: 'sg-flow-2',
      type: 'manager review',
      title: 'Manager oversight required',
      details: 'Registered manager reviews threshold, notifications, risk assessment and external agency actions.',
      href: '/management'
    },
    {
      id: 'sg-flow-3',
      type: 'chronology and evidence',
      title: 'Chronology/evidence linkage',
      details: 'Link relevant records to chronology, actions and evidence so inspection trail remains visible.',
      href: '/chronology'
    }
  ]
}

export function staffOperationalWorkspace(staffId: string): StaffOperationalWorkspace {
  const staff = getStaffById(staffId) || firstStaff()
  const assignedChildren = staff ? getAssignedYoungPeople(staff.id) : []
  const incidents = staff ? getIncidentsByStaff(staff.id) : []
  const logs = staff ? getLogsByStaff(staff.id) : []
  const recordingDue = logs.length ? logs : overdueLogs().filter((log) => !staff || log.staffId === staff.id)
  const needsAttention: StaffOperationalTask[] = incidents.slice(0, 4).map((incident) => ({
    id: incident.id,
    title: `${childName(incident.youngPersonId)} - ${incident.type}`,
    summary: incident.description,
    urgency: incident.severity,
    href: `/incidents/${incident.id}`
  }))
  const recordingTasks: StaffOperationalTask[] = recordingDue.slice(0, 4).map((log) => ({
    id: log.id,
    title: `${childName(log.youngPersonId)} recording due`,
    summary: log.followUpActions.join(', ') || 'Recording review required.',
    urgency: 'review',
    href: '/daily-logs'
  }))
  const awaitingReview: StaffOperationalTask[] = safeguardingConcerns().slice(0, 3).map((event) => ({
    id: event.id,
    title: `${childName(event.youngPersonId)} safeguarding review`,
    summary: event.description,
    urgency: 'high',
    href: `/safeguarding/${event.id}`
  }))
  const handoverActions = [...needsAttention, ...recordingTasks].slice(0, 5).map((task) => ({
    id: `handover-${task.id}`,
    title: task.title,
    details: task.summary,
    priority: task.urgency,
    requiresFollowUp: task.urgency !== 'low',
    href: task.href
  }))

  return {
    staff,
    assignedChildren,
    outstandingTasks: [...needsAttention, ...recordingTasks, ...awaitingReview],
    recordingDue,
    handoverActions,
    queues: {
      needsAttention,
      recordingOverdue: recordingTasks,
      awaitingReview
    }
  }
}

