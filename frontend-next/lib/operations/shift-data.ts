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

export function shiftLifecycle(): ShiftLifecycleState[] {
  return [
    { label: 'Children selected', completed: true },
    { label: 'Records reviewed', completed: false },
    { label: 'Handover prepared', completed: false },
    { label: 'Actions allocated', completed: false }
  ]
}

export async function liveShiftLifecycle(): Promise<ShiftLifecycleState[]> {
  const command = await getCommandCentre()
  const states = command.data.lifecycle?.slice(0, 5).map((item: any) => ({
    label: String(item.title || item.name || item.status || item.entityType || 'Operational state'),
    completed: ['complete', 'completed', 'resolved', 'signed_off'].includes(String(item.status || '').toLowerCase())
  })) || []
  return states.length ? states : shiftLifecycle()
}

export function operationalCards(): OperationalCard[] {
  return []
}

export async function liveOperationalCards(): Promise<OperationalCard[]> {
  const [chronology, actions] = await Promise.all([getOsChronology(), getOsActions()])
  const cards: OperationalCard[] = []
  chronology.data.slice(0, 12).forEach((event) => {
    const combined = `${event.sourceType} ${event.eventType} ${event.category} ${event.title}`.toLowerCase()
    let type: OperationalCard['type'] | null = null
    if (combined.includes('incident')) type = 'active incident'
    if (combined.includes('missing')) type = 'missing episode'
    if (combined.includes('safeguard')) type = 'safeguarding alert'
    if (combined.includes('medication')) type = 'medication concern'
    if (!type) return
    cards.push({
      id: event.id,
      type,
      title: event.title,
      summary: event.summary || event.fullText || 'Live chronology item requires review.',
      urgency: event.severity,
      priorityScore: event.severity === 'critical' ? 100 : event.severity === 'high' ? 80 : 50,
      href: `/chronology/${encodeURIComponent(event.id)}`
    })
  })
  actions.data.filter((action) => action.status !== 'completed').slice(0, 8).forEach((action) => {
    cards.push({
      id: action.id,
      type: 'missing recording',
      title: action.title,
      summary: action.description,
      urgency: action.priority === 'urgent' ? 'critical' : action.priority === 'high' ? 'high' : 'medium',
      priorityScore: action.priority === 'urgent' ? 100 : action.priority === 'high' ? 80 : 45,
      href: `/actions/${encodeURIComponent(action.id)}`
    })
  })
  return cards.sort((left, right) => right.priorityScore - left.priorityScore)
}

export function handoverActions(): HandoverAction[] {
  return []
}

export async function liveHandoverActions(): Promise<HandoverAction[]> {
  const actions = await getOsActions()
  return actions.data.filter((action) => action.status !== 'completed').slice(0, 12).map((action) => ({
    id: action.id,
    title: action.title,
    details: action.description,
    priority: action.priority,
    requiresFollowUp: action.status !== 'completed',
    href: `/actions/${encodeURIComponent(action.id)}`
  }))
}

export function handoverHistory(): HandoverTimelineItem[] {
  return []
}

export async function liveHandoverHistory(): Promise<HandoverTimelineItem[]> {
  const chronology = await getOsChronology()
  return chronology.data.slice(0, 12).map((event) => ({
    id: `handover-history-${event.id}`,
    shift: event.dateTime || 'Live chronology event',
    type: event.eventType,
    title: event.title,
    status: event.severity || 'recorded',
    details: event.summary || event.fullText || event.title,
    date: event.dateTime,
    summary: event.summary || event.title,
    href: `/chronology/${encodeURIComponent(event.id)}`
  })) as HandoverTimelineItem[]
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
  const live = dashboard.data.lifecycle.slice(0, 20).map((item) => {
    const itemAny = item as any
    const title = String(itemAny.title || itemAny.name || itemAny.entityTitle || itemAny.status || item.entityType || 'Safeguarding workflow item')
    return {
      id: item.id,
      type: item.entityType,
      title,
      details: item.reason || item.status || title,
      date: item.dueAt,
      href: item.entityType.includes('chronology') ? `/chronology/${encodeURIComponent(item.id)}` : '/safeguarding'
    }
  })
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
    assignedChildren: youngPeople.data.map((person: any) => ({
      id: String(person.id),
      firstName: String(person.firstName || person.first_name || person.preferredName || person.preferred_name || 'Young'),
      lastName: String(person.lastName || person.last_name || ''),
      preferredName: String(person.preferredName || person.preferred_name || person.firstName || person.first_name || 'Young person'),
      age: Number(person.age || 0),
      gender: String(person.gender || ''),
      status: String(person.status || 'active'),
      legalStatus: String(person.legalStatus || person.legal_status || ''),
      communicationNeeds: String(person.communicationNeeds || person.communication_needs || ''),
      educationStatus: String(person.educationStatus || person.education_status || ''),
      healthSummary: String(person.healthSummary || person.health_summary || ''),
      riskLevel: String(person.riskLevel || person.risk_level || 'medium') as RiskLevel,
      safeguardingStatus: String(person.safeguardingStatus || person.safeguarding_status || ''),
      allocatedKeyWorkerId: String(person.keyWorkerId || person.key_worker_id || ''),
      likes: [],
      dislikes: [],
      allergies: [],
      importantContacts: []
    })),
    outstandingTasks: tasks,
    recordingDue: [],
    handoverActions: await liveHandoverActions(),
    queues: {
      needsAttention: tasks.slice(0, 5),
      recordingOverdue: [],
      awaitingReview: tasks.filter((task) => ['high', 'urgent', 'critical'].includes(task.urgency)).slice(0, 5)
    }
  }
}