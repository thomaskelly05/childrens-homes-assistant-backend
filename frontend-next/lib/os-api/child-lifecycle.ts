import { osGet } from '@/lib/os-api/client'

export type ChildArchiveRecord = {
  id: string
  child_id: number
  title: string
  safe_summary: string
  record_type: string
  source_type: string
  source_id?: string | null
  signed_off_at?: string | null
  author_name?: string | null
  signed_off_by_name?: string | null
  chronology_event_id?: string | null
  plan_impact_ids?: string[]
  lifeecho_memory_id?: string | null
  tags?: string[]
}

const EMPTY_ARCHIVE = { records: [] as ChildArchiveRecord[], total: 0 }
const EMPTY_STORY = {
  child_id: 0,
  sections: [] as Array<{ label: string; events: Array<Record<string, unknown>> }>,
  themes: [] as string[],
  safe_story_summary: '',
  total_events: 0
}
const EMPTY_PLAN_IMPACTS = { suggestions: [] as Array<Record<string, unknown>>, total: 0 }
const EMPTY_LIFEECHO = {
  memories: [] as Array<Record<string, unknown>>,
  suggestions: [] as Array<Record<string, unknown>>,
  total: 0
}

export async function fetchChildArchive(childId: string, search?: string) {
  const q = new URLSearchParams({ child_id: childId, page_size: '100' })
  if (search) q.set('search', search)
  return osGet(`/api/archive/records?${q}`, EMPTY_ARCHIVE)
}

export async function fetchChronologyStory(childId: string) {
  return osGet(`/api/chronology-story/${encodeURIComponent(childId)}`, EMPTY_STORY)
}

export async function fetchPlanImpacts(childId: string) {
  return osGet(`/api/plan-impacts/?child_id=${encodeURIComponent(childId)}`, EMPTY_PLAN_IMPACTS)
}

export async function fetchLifeEchoMemories(childId: string) {
  return osGet(`/api/lifeecho-memories/${encodeURIComponent(childId)}`, EMPTY_LIFEECHO)
}
