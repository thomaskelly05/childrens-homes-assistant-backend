import type { RiskLevel, YoungPerson } from '@/lib/indicare/types'
import { osGet } from '@/lib/os-api/client'

export type ChildSelectorCard = {
  id: string
  displayName: string
  preferredName?: string
  avatarLabel: string
  age?: number
  status?: string
  placementStatus?: string
  riskLevel?: RiskLevel
  keyWorkerName: string
  currentMood: string
  activeRisksCount: number
  actionsDue: number
  importantAlert?: string
  lastRecordedNote: string
}

export type JourneyTimelineItem = {
  id: string
  title: string
  summary: string
  category: string
  severity: RiskLevel
  occurredAt: string
  href: string
}

export type JourneyDailyNote = {
  id: string
  title: string
  summary: string
  noteDate: string
  workflowStatus?: string
  href: string
}

export type JourneyAction = {
  id: string
  title: string
  description?: string
  status: string
  href: string
}

export type JourneyEvidence = {
  id: string
  title: string
  description?: string
  linkedRegulation?: string
}

export type ChildJourneyData = {
  source: 'live' | 'unavailable'
  error?: string
  child?: (YoungPerson & { displayName?: string; placementStatus?: string })
  dailyNotes: JourneyDailyNote[]
  timeline: JourneyTimelineItem[]
  actions: JourneyAction[]
  evidence: JourneyEvidence[]
  story: ChildJourneyStory
}

export type ChildJourneyStory = {
  storySoFar: string
  whatChanged: string
  todayMatteredBecause: string
  progressHighlights: string[]
  relationshipMarkers: string[]
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] || '?') + (parts[1]?.[0] || '')
}

function riskFromValue(value: unknown): RiskLevel {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical' ? value : 'medium'
}

function coerceLiveCards(payload: unknown): ChildSelectorCard[] {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as any)?.young_people)
      ? (payload as any).young_people
      : Array.isArray((payload as any)?.items)
        ? (payload as any).items
        : Array.isArray((payload as any)?.records)
          ? (payload as any).records
          : []

  return source.map((item: any) => {
    const displayName = item.display_name || item.displayName || [item.first_name, item.last_name].filter(Boolean).join(' ') || item.name || `Young person ${item.id}`
    return {
      id: String(item.id),
      displayName,
      preferredName: item.preferred_name || item.preferredName || item.first_name,
      avatarLabel: initials(displayName),
      age: Number.isFinite(Number(item.age)) ? Number(item.age) : undefined,
      status: item.status || item.placement_status,
      placementStatus: item.placement_status || item.placementStatus || item.status,
      riskLevel: riskFromValue(item.risk_level || item.riskLevel),
      keyWorkerName: item.key_worker_name || item.keyWorkerName || 'Key worker not assigned',
      currentMood: item.current_mood || item.currentMood || 'Not recorded today',
      activeRisksCount: Number(item.active_risks_count || item.activeRisksCount || 0),
      actionsDue: Number(item.actions_due || item.actionsDue || 0),
      importantAlert: item.important_alert || item.importantAlert,
      lastRecordedNote: item.last_recorded_note || item.lastRecordedNote || 'No daily note has been recorded yet.'
    }
  })
}

function emptyJourneyData(id: string, source: ChildJourneyData['source'] = 'unavailable', error?: string): ChildJourneyData {
  const base = {
    source,
    child: undefined,
    dailyNotes: [],
    timeline: [],
    actions: [],
    evidence: [],
    error
  } satisfies Omit<ChildJourneyData, 'story'>
  return { ...base, story: buildJourneyStory(base) }
}

function coerceLiveJourney(id: string, payload: any, fallback: ChildJourneyData): ChildJourneyData {
  const childPayload = payload?.child || payload?.young_person || payload?.youngPerson
  const displayName = childPayload
    ? childPayload.display_name || childPayload.displayName || [childPayload.first_name, childPayload.last_name].filter(Boolean).join(' ') || childPayload.name
    : undefined

  const base = {
    source: 'live',
    child: childPayload ? {
      id: String(childPayload.id || id),
      firstName: childPayload.first_name || childPayload.firstName || displayName || 'Young',
      lastName: childPayload.last_name || childPayload.lastName || 'Person',
      preferredName: childPayload.preferred_name || childPayload.preferredName || childPayload.first_name || displayName || `Young person ${id}`,
      displayName,
      age: Number(childPayload.age || 0),
      gender: childPayload.gender || '',
      status: childPayload.status || 'active',
      legalStatus: childPayload.legal_status || childPayload.legalStatus || '',
      communicationNeeds: childPayload.communication_needs || childPayload.communicationNeeds || '',
      educationStatus: childPayload.education_status || childPayload.educationStatus || '',
      healthSummary: childPayload.health_summary || childPayload.healthSummary || '',
      riskLevel: riskFromValue(childPayload.risk_level || childPayload.riskLevel),
      safeguardingStatus: childPayload.safeguarding_status || childPayload.safeguardingStatus || '',
      allocatedKeyWorkerId: String(childPayload.allocated_key_worker_id || childPayload.allocatedKeyWorkerId || ''),
      likes: [],
      dislikes: [],
      allergies: [],
      importantContacts: [],
      placementStatus: childPayload.placement_status || childPayload.placementStatus
    } : fallback.child,
    dailyNotes: Array.isArray(payload?.dailyNotes) ? payload.dailyNotes : Array.isArray(payload?.daily_notes) ? payload.daily_notes : fallback.dailyNotes,
    timeline: Array.isArray(payload?.timeline) ? payload.timeline : fallback.timeline,
    actions: Array.isArray(payload?.actions) ? payload.actions : fallback.actions,
    evidence: Array.isArray(payload?.evidence) ? payload.evidence : fallback.evidence
  } satisfies Omit<ChildJourneyData, 'story'>
  return { ...base, story: buildJourneyStory(base) }
}

function buildJourneyStory(data: Omit<ChildJourneyData, 'story'>): ChildJourneyStory {
  const childName = data.child?.preferredName || data.child?.displayName || 'This child'
  const recent = data.timeline.slice(0, 3)
  const lastNote = data.dailyNotes[0]
  const positive = [...data.timeline, ...data.dailyNotes].filter((item) => /progress|settled|positive|achiev|enjoy|relationship|trusted|school|health/i.test(`${item.title} ${item.summary}`))
  const relationships = [...data.timeline, ...data.dailyNotes].filter((item) => /family|key worker|staff|relationship|contact|social worker|friend/i.test(`${item.title} ${item.summary}`))
  return {
    storySoFar: recent.length
      ? `${childName}'s recent story is shaped by ${recent.map((item) => item.title.toLowerCase()).join(', ')}.`
      : `${childName}'s story will build as daily notes, chronology and direct work are recorded.`,
    whatChanged: recent[0]?.summary || 'No recent change has been recorded in the visible chronology.',
    todayMatteredBecause: lastNote?.summary || recent[0]?.summary || 'Today has not yet been written into the record.',
    progressHighlights: positive.slice(0, 3).map((item) => item.title),
    relationshipMarkers: relationships.slice(0, 3).map((item) => item.title)
  }
}

export function todayLong() {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())
}

export async function getChildSelectorCards() {
  const fallback: ChildSelectorCard[] = []
  const result = await osGet<unknown>('/young-people', fallback)
  if (result.source === 'live') {
    const cards = coerceLiveCards(result.data)
    return { cards, source: 'live' as const, error: result.error }
  }
  return { cards: [], source: 'unavailable' as const, error: result.error }
}

export async function getChildJourneyData(id: string): Promise<ChildJourneyData> {
  const fallback = emptyJourneyData(id)
  const result = await osGet<unknown>(`/young-people/${encodeURIComponent(id)}/journey`, fallback)
  if (result.source === 'live') {
    return coerceLiveJourney(id, result.data, fallback)
  }
  return emptyJourneyData(id, 'unavailable', result.error)
}
