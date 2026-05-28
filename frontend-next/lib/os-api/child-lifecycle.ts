import { osGet } from '@/lib/os-api/client'

export type ChildArchiveRecord = {
  id: string
  child_id: number
  title: string
  safe_summary: string
  record_type: string
  source_type: string
  source_id?: string | null
  event_date?: string | null
  signed_off_at?: string | null
  author_name?: string | null
  signed_off_by_name?: string | null
  safeguarding_sensitive?: boolean
  chronology_event_id?: string | null
  plan_impact_ids?: string[]
  lifeecho_memory_id?: string | null
  tags?: string[]
}

export type ChronologyStoryGap = {
  label: string
  hint: string
  route_hint?: string | null
}

type ChronologyStory = {
  child_id: number
  sections: Array<{ label: string; events: Array<Record<string, unknown>> }>
  themes: string[]
  safe_story_summary: string
  total_events: number
  story_gaps: ChronologyStoryGap[]
}

type WorkspacePayload = {
  timeline?: Array<Record<string, unknown>>
  care_records?: Array<Record<string, unknown>>
  counts?: Record<string, number>
  source?: string
}

const EMPTY_ARCHIVE = { records: [] as ChildArchiveRecord[], total: 0 }
const EMPTY_STORY: ChronologyStory = {
  child_id: 0,
  sections: [] as Array<{ label: string; events: Array<Record<string, unknown>> }>,
  themes: [] as string[],
  safe_story_summary: '',
  total_events: 0,
  story_gaps: [] as ChronologyStoryGap[]
}
const EMPTY_PLAN_IMPACTS = { suggestions: [] as Array<Record<string, unknown>>, total: 0 }
const EMPTY_LIFEECHO = {
  memories: [] as Array<Record<string, unknown>>,
  suggestions: [] as Array<Record<string, unknown>>,
  total: 0
}
const EMPTY_WORKSPACE: WorkspacePayload = { timeline: [], care_records: [], counts: {} }

function text(value: unknown, fallback = '') {
  const next = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
  return next || fallback
}

function dateValue(record: Record<string, unknown>) {
  return text(record.occurred_at || record.event_date || record.note_date || record.created_at || record.updated_at)
}

function isSignedOffStoryRecord(record: Record<string, unknown>) {
  const status = text(record.status || record.timeline_state).toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
  if (!status) return true
  return ['approved', 'signed_off', 'signedoff', 'recorded', 'completed', 'closed'].includes(status)
}

function safeStorySummary(record: Record<string, unknown>) {
  const summary = text(record.safe_summary || record.summary || record.positives || record.activities || record.title, 'Recorded event.')
  const voice = text(record.child_voice || record.young_person_voice)
  const action = text(record.recommended_action || record.actions_required)
  const parts = [summary]
  if (voice) parts.push(`Child voice: ${voice}`)
  if (action) parts.push(`Follow-up: ${action}`)
  return parts.join(' ')
}

function eventFromWorkspaceRecord(record: Record<string, unknown>, index: number) {
  const sourceType = text(record.source_type || record.source_table || record.record_type || record.type, 'workspace_record')
  const sourceId = text(record.source_id || record.id || `${index}`)
  return {
    archive_record_id: '',
    title: text(record.title || record.shift_type || record.mood || sourceType, 'Recorded event'),
    safe_summary: safeStorySummary(record),
    record_type: sourceType,
    source_type: sourceType,
    source_id: sourceId,
    event_date: dateValue(record),
    recorded_at: text(record.created_at || record.updated_at || dateValue(record)),
    author_name: text(record.author_name || record.recorded_by_name || record.recorded_by),
    signed_off_by_name: text(record.signed_off_by_name || record.approved_by_name || record.manager_name)
  }
}

function monthLabel(value: string) {
  if (!value) return 'Recent story'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Recent story'
  return parsed.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function buildStoryFromWorkspace(childId: string, workspace: WorkspacePayload): ChronologyStory {
  const seen = new Set<string>()
  const records = [...(workspace.timeline || []), ...(workspace.care_records || [])]
    .filter((record) => record && typeof record === 'object')
    .filter((record) => isSignedOffStoryRecord(record))
    .map((record, index) => eventFromWorkspaceRecord(record, index))
    .filter((event) => {
      const key = `${event.source_type}:${event.source_id}:${event.event_date}`
      if (seen.has(key)) return false
      seen.add(key)
      return Boolean(event.safe_summary)
    })
    .sort((a, b) => String(b.event_date || '').localeCompare(String(a.event_date || '')))
    .slice(0, 60)

  const grouped = new Map<string, Array<Record<string, unknown>>>()
  for (const event of records) {
    const label = monthLabel(String(event.event_date || ''))
    grouped.set(label, [...(grouped.get(label) || []), event])
  }

  const sections = Array.from(grouped.entries()).map(([label, events]) => ({ label, events }))
  const total = records.length

  return {
    child_id: Number(childId) || 0,
    sections,
    themes: ['Daily lived experience', 'Child voice', 'Staff support'],
    safe_story_summary: total
      ? `This child-centred story is currently built from ${total} signed-off or recorded workspace events while the formal archive catches up.`
      : '',
    total_events: total,
    story_gaps: total
      ? []
      : [
          {
            label: 'No signed-off story records found',
            hint: 'The workspace is connected, but no signed-off chronology items were available for this child.',
            route_hint: `/young-people/${childId}/workspace`
          }
        ]
  }
}

function hasStorySections(story: ChronologyStory | undefined) {
  return Boolean(story?.sections?.some((section) => (section.events || []).length > 0))
}

export async function fetchChildArchive(childId: string, search?: string) {
  const q = new URLSearchParams({ child_id: childId, page_size: '100' })
  if (search) q.set('search', search)
  return osGet(`/api/archive/records?${q}`, EMPTY_ARCHIVE)
}

export async function fetchChronologyStory(childId: string) {
  const formal = await osGet(`/api/chronology-story/${encodeURIComponent(childId)}`, EMPTY_STORY)
  if (formal.source === 'live' && hasStorySections(formal.data)) return formal

  const workspace = await osGet(`/api/os-command/young-person/${encodeURIComponent(childId)}/workspace?limit=100`, EMPTY_WORKSPACE)
  const fallbackStory = buildStoryFromWorkspace(childId, workspace.data)

  if (hasStorySections(fallbackStory)) {
    return {
      data: fallbackStory,
      source: 'live' as const,
      meta: {
        ...(formal.meta || {}),
        fallback_source: workspace.data.source || 'workspace',
        formal_archive_source: formal.source
      }
    }
  }

  return formal
}

export async function fetchPlanImpacts(childId: string) {
  return osGet(`/api/plan-impacts/?child_id=${encodeURIComponent(childId)}`, EMPTY_PLAN_IMPACTS)
}

export async function fetchLifeEchoMemories(childId: string) {
  return osGet(`/api/lifeecho-memories/${encodeURIComponent(childId)}`, EMPTY_LIFEECHO)
}