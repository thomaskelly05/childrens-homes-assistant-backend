import type { DailyLog, RiskLevel, StaffMember, YoungPerson } from '@/lib/indicare/types'
import { getCommandCentre, getSafeguardingDashboard } from '@/lib/os-api/platform'
import { getOsActions } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'
import { getOsYoungPeople } from '@/lib/os-api/workspaces'

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

function toRisk(value: string | undefined): RiskLevel {
  const normalised = String(value || 'medium').toLowerCase()
  return ['low', 'medium', 'high', 'critical'].includes(normalised) ? normalised as RiskLevel : 'medium'
}

function cardType(value: string): OperationalCard['type'] {
  const text = value.toLowerCase()
  if (text.includes('missing')) return 'missing episode'
  if (text.includes('safeguard')) return 'safeguarding alert'
  if (text.includes('medication')) return 'medication concern'
  if (text.includes('record')) return 'missing recording'
  if (text.includes('incident')) return 'active incident'
  return 'placement concern'
}

function scoreFor(urgency: RiskLevel, index = 0) {
  const base = urgency === 'critical' ? 96 : urgency === 'high' ? 84 : urgency === 'medium' ? 62 : 36
  return Math.max(1, base - index * 3)
}

export function currentShift() {
  return {
    id: 'live-shift-summary',
    homeName: 'Live home',
    shiftType: 'Current shift',
    stats: {
      activeStaff: 0,
      assignedChildren: 0,
      outstandingTasks: 0,
      managerEscalations: 0,
      incidents: 0,
      safeguardingConcerns: 0,
      medicationAlerts: 0,
      welfareChecksDue: 0
    },
    cards: [] as OperationalCard[],
    lifecycle: [
      { label: 'live data required', completed: false },
      { label: 'open liveShift() for schema-backed data', completed: false }
    ] satisfies ShiftLifecycleState[],
    activeStaff: [] as StaffMember[]
  }
}

export async function liveCurrentShift() {
  const command = await getCommandCentre()
  const children = command.data.children
  const openActions = command.data.actions.filter((action) => action.status !== 'completed')
  const safeguarding = command.data.safeguarding.filter((record) => record.status !== 'closed')
  const cards: OperationalCard[] = [
    ...command.data.attention.map((item, index) => ({
      id: item.id,
      type: cardType(item.theme),
      title: item.title,
      summary: item.body,
      urgency: toRisk(item.status.includes('critical') ? 'critical' : item.status.includes('review') || item.status.includes('needed') ? 'high' : 'medium'),
      priorityScore: scoreFor(toRisk(item.status.includes('critical') ? 'critical' : item.status.includes('review') || item.status.includes('needed') ? 'high' : 'medium'), index),
      href: item.href
    })),
    ...openActions.slice(0, 4).map((action, index) => ({
      id: `action-${action.id}`,
      type: cardType(action.sourceType || action.title),
      title: action.title,
      summary: action.description,
      urgency: toRisk(action.priority === 'urgent' ? 'critical' : action.priority),
      priorityScore: scoreFor(toRisk(action.priority === 'urgent' ? 'critical' : action.priority), index),
      assignment: action.assignedToStaffId,
      href: `/actions/${encodeURIComponent(action.id)}`
    }))
  ].slice(0, 8)

  return {
    id: 'live-shift-summary',
    homeName: command.data.homes[0]?.title || 'Live home',
    shiftType: 'Current shift',
    stats: {
      activeStaff: command.data.workforce.length,
      assignedChildren: children.length,
      outstandingTasks: openActions.length,
      managerEscalations: cards.filter((card) => ['high', 'critical'].includes(card.urgency)).length,
      incidents: command.data.chronology.filter((event) => `${event.category} ${event.title}`.toLowerCase().includes('incident')).length,
      safeguardingConcerns: safeguarding.length,
      medicationAlerts: command.data.chronology.filter((event) => `${event.category} ${event.title}`.toLowerCase().includes('medication')).length,
      welfareChecksDue: children.filter((child) => ['high', 'critical'].includes(String(child.riskLevel || '').toLowerCase())).length
    },
    cards,
    lifecycle: [
      { label: 'shift started', completed: true },
      { label: 'live priorities loaded', completed: cards.length > 0 },
      { label: 'open actions reviewed', completed: openActions.length === 0 },
      { label: 'handover prepared', completed: false }
    ] satisfies ShiftLifecycleState[],
    activeStaff: [] as StaffMember[]
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
  return {
    items: [] as HandoverAction[],
    timeline: [] as HandoverTimelineItem[],
    unresolvedActions: [] as HandoverAction[],
    safeguardingAlerts: [] as HandoverAction[],
    childrenRequiringAttention: [] as HandoverAction[],
    keyEventsToday: [] as HandoverAction[],
    recordingGaps: [] as HandoverAction[]
  }
}

export async function liveCurrentHandover() {
  const [actions, chronology, safeguarding, youngPeople] = await Promise.all([
    getOsActions(),
    getOsChronology(),
    getSafeguardingDashboard(),
    getOsYoungPeople()
  ])
  const openActions = actions.data.filter((action) => action.status !== 'completed')
  const items: HandoverAction[] = openActions.slice(0, 10).map((action) => ({
    id: `handover-${action.id}`,
    title: action.title,
    details: action.description,
    priority: action.priority,
    requiresFollowUp: action.status !== 'completed',
    href: `/actions/${encodeURIComponent(action.id)}`
  }))
  const timeline: HandoverTimelineItem[] = chronology.data.slice(0, 15).map((event) => ({
    id: `timeline-${event.id}`,
    type: event.category || 'chronology',
    title: event.title,
    details: event.summary,
    date: event.dateTime,
    href: `/chronology/${encodeURIComponent(event.id)}`
  }))
  const safeguardingAlerts = safeguarding.data.records.slice(0, 8).map((record) => ({
    id: record.id,
    title: record.title,
    details: record.summary,
    priority: record.priority || 'high',
    requiresFollowUp: record.status !== 'closed',
    href: record.href || '/safeguarding'
  }))
  const childrenRequiringAttention = youngPeople.data
    .filter((child) => ['high', 'critical'].includes(String(child.riskLevel || '').toLowerCase()))
    .slice(0, 8)
    .map((child) => ({
      id: child.id,
      title: child.displayName || child.preferredName || `Young person ${child.id}`,
      details: `${child.riskLevel || 'risk not returned'} · ${child.placementStatus || 'placement status not returned'}`,
      priority: child.riskLevel || 'medium',
      requiresFollowUp: true,
      href: `/young-people/${encodeURIComponent(child.id)}`
    }))
  return {
    items,
    timeline,
    unresolvedActions: items.filter((item) => item.requiresFollowUp),
    safeguardingAlerts,
    childrenRequiringAttention,
    keyEventsToday: timeline.slice(0, 8),
    recordingGaps: chronology.data
      .filter((event) => `${event.title} ${event.summary}`.toLowerCase().includes('missing recording'))
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        title: event.title,
        details: event.summary,
        priority: event.severity || 'medium',
        requiresFollowUp: true,
        href: `/chronology/${encodeURIComponent(event.id)}`
      }))
  }
}

export function handoverHistory() {
  return [] as Array<{ id: string; shift: string; status: string; summary: string; href: string }>
}

export async function liveHandoverHistory() {
  const chronology = await getOsChronology()
  return chronology.data.slice(0, 12).map((event) => ({
    id: `handover-history-${event.id}`,
    shift: event.dateTime || 'Live chronology event',
    status: event.severity || 'recorded',
    summary: event.summary || event.title,
    href: `/chronology/${encodeURIComponent(event.id)}`
  }))
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

export async function liveSafeguardingWorkflowTimeline(): Promise<HandoverTimelineItem[]> {
  const dashboard = await getSafeguardingDashboard()
  const live = dashboard.data.lifecycle.slice(0, 20).map((item) => ({
    id: item.id,
    type: item.entityType,
    title: item.label,
    details: item.reason || item.status,
    date: item.dueAt,
    href: item.entityType.includes('chronology') ? `/chronology/${encodeURIComponent(item.id)}` : '/safeguarding'
  }))
  return live.length ? live : safeguardingWorkflowTimeline()
}

export function staffOperationalWorkspace(_staffId: string): StaffOperationalWorkspace {
  return {
    staff: undefined,
    assignedChildren: [],
    outstandingTasks: [],
    recordingDue: [],
    handoverActions: [],
    queues: {
      needsAttention: [],
      recordingOverdue: [],
      awaitingReview: []
    }
  }
}

export async function liveStaffOperationalWorkspace(_staffId: string): Promise<StaffOperationalWorkspace> {
  const [actions, youngPeople] = await Promise.all([getOsActions(), getOsYoungPeople()])
  const tasks: StaffOperationalTask[] = actions.data.filter((action) => action.status !== 'completed').slice(0, 20).map((action) => ({
    id: action.id,
    title: action.title,
    summary: action.description,
    urgency: action.priority,
    href: `/actions/${encodeURIComponent(action.id)}`
  }))
  return {
    staff: undefined,
    assignedChildren: youngPeople.data.map((person) => ({
      id: person.id,
      firstName: person.preferredName || person.displayName || 'Young',
      lastName: 'Person',
      preferredName: person.preferredName || person.displayName || `Young person ${person.id}`,
      dateOfBirth: '',
      age: typeof person.age === 'number' ? person.age : 0,
      status: 'active',
      riskLevel: toRisk(person.riskLevel),
      safeguardingStatus: '',
      educationStatus: '',
      healthSummary: '',
      allocatedKeyWorkerId: '',
      currentPlacementId: '',
      likes: [],
      dislikes: [],
      communicationNeeds: [],
      sensoryNeeds: [],
      routines: []
    })) as YoungPerson[],
    outstandingTasks: tasks,
    recordingDue: [],
    handoverActions: tasks.slice(0, 8).map((task) => ({
      id: `handover-${task.id}`,
      title: task.title,
      details: task.summary,
      priority: task.urgency,
      requiresFollowUp: true,
      href: task.href
    })),
    queues: {
      needsAttention: tasks.filter((task) => ['high', 'urgent', 'critical'].includes(task.urgency)),
      recordingOverdue: [],
      awaitingReview: tasks.filter((task) => task.urgency !== 'low')
    }
  }
}