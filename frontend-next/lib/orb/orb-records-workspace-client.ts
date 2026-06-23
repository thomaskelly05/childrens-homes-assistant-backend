import { authFetch } from '@/lib/auth/api'

export type OrbRecordWorkspaceStatus = 'draft' | 'reviewed' | 'finalised' | 'archived'

export type OrbRecordSourceStation =
  | 'chat'
  | 'dictate'
  | 'voice'
  | 'write'
  | 'templates'
  | 'communicate'
  | 'records'
  | 'manual'

export type OrbRecordWorkspaceItem = {
  id: string
  owner_user_id: string
  home_id?: string | null
  organisation_id?: string | null
  child_id?: string | null
  workspace_section: string
  category?: string | null
  template_id?: string | null
  source_station: OrbRecordSourceStation
  title: string
  body?: string | null
  status: OrbRecordWorkspaceStatus
  privacy_classification: string
  retention_policy: string
  created_at: string
  updated_at: string
  reviewed_at?: string | null
  finalised_at?: string | null
  exported_at?: string | null
  audit_trail?: Array<Record<string, unknown>>
  metadata?: Record<string, unknown>
}

export type OrbTemplateTaxonomyEntry = {
  template_id: string
  title: string
  lifecycle_group: string
  lifecycle_family: string
  station_availability: string[]
  regulation_anchors: string[]
  suggestion_label?: string
}

export const ORB_RECORDS_WORKSPACE_API = {
  health: '/orb/records-workspace/health',
  summary: '/orb/records-workspace/summary',
  items: '/orb/records-workspace/items'
} as const

export const ORB_TAXONOMY_API = {
  search: '/templates/taxonomy/search',
  byStation: (stationId: string) => `/templates/taxonomy/by-station/${encodeURIComponent(stationId)}`,
  byCategory: (category: string) => `/templates/taxonomy/by-category/${encodeURIComponent(category)}`,
  entry: (templateId: string) => `/templates/taxonomy/${encodeURIComponent(templateId)}`
} as const

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function createOrbRecordsWorkspaceItem(body: {
  title: string
  body?: string
  category?: string
  template_id?: string
  source_station?: OrbRecordSourceStation
  workspace_section?: string
  status?: OrbRecordWorkspaceStatus
  privacy_classification?: string
  metadata?: Record<string, unknown>
}) {
  const payload = await authFetch(ORB_RECORDS_WORKSPACE_API.items, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrap<OrbRecordWorkspaceItem>(payload)
}

export async function listOrbRecordsWorkspaceItems(params?: {
  section?: string
  status?: OrbRecordWorkspaceStatus
  template_id?: string
  source_station?: OrbRecordSourceStation
  search?: string
  limit?: number
  offset?: number
}) {
  const qs = new URLSearchParams()
  if (params?.section) qs.set('section', params.section)
  if (params?.status) qs.set('status', params.status)
  if (params?.template_id) qs.set('template_id', params.template_id)
  if (params?.source_station) qs.set('source_station', params.source_station)
  if (params?.search) qs.set('search', params.search)
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const payload = await authFetch(`${ORB_RECORDS_WORKSPACE_API.items}${query}`, {
    credentials: 'include'
  })
  return unwrap<{ items: OrbRecordWorkspaceItem[]; total: number }>(payload)
}

export async function getOrbRecordsWorkspaceItem(itemId: string) {
  const payload = await authFetch(`${ORB_RECORDS_WORKSPACE_API.items}/${encodeURIComponent(itemId)}`, {
    credentials: 'include'
  })
  return unwrap<OrbRecordWorkspaceItem>(payload)
}

export async function updateOrbRecordsWorkspaceItem(
  itemId: string,
  body: Partial<{
    title: string
    body: string
    category: string
    template_id: string
    status: OrbRecordWorkspaceStatus
    metadata: Record<string, unknown>
  }>
) {
  const payload = await authFetch(`${ORB_RECORDS_WORKSPACE_API.items}/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrap<OrbRecordWorkspaceItem>(payload)
}

export async function archiveOrbRecordsWorkspaceItem(itemId: string) {
  const payload = await authFetch(`${ORB_RECORDS_WORKSPACE_API.items}/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  return unwrap<{ archived: boolean; item: OrbRecordWorkspaceItem }>(payload)
}

export async function reviewOrbRecordsWorkspaceItem(itemId: string) {
  const payload = await authFetch(
    `${ORB_RECORDS_WORKSPACE_API.items}/${encodeURIComponent(itemId)}/review`,
    { method: 'POST', credentials: 'include' }
  )
  return unwrap<OrbRecordWorkspaceItem>(payload)
}

export async function finaliseOrbRecordsWorkspaceItem(itemId: string) {
  const payload = await authFetch(
    `${ORB_RECORDS_WORKSPACE_API.items}/${encodeURIComponent(itemId)}/finalise`,
    { method: 'POST', credentials: 'include' }
  )
  return unwrap<OrbRecordWorkspaceItem>(payload)
}

export async function fetchOrbRecordsWorkspaceSummary() {
  const payload = await authFetch(ORB_RECORDS_WORKSPACE_API.summary, { credentials: 'include' })
  return unwrap<{ total: number; needs_review: number }>(payload)
}

export async function searchOrbTemplateTaxonomy(query: string, params?: { station?: string }) {
  const qs = new URLSearchParams({ q: query })
  if (params?.station) qs.set('station', params.station)
  const payload = await authFetch(`${ORB_TAXONOMY_API.search}?${qs.toString()}`, {
    credentials: 'include'
  })
  return unwrap<{ query: string; templates: OrbTemplateTaxonomyEntry[] }>(payload)
}

export async function fetchOrbTemplatesForStation(stationId: string) {
  const payload = await authFetch(ORB_TAXONOMY_API.byStation(stationId), { credentials: 'include' })
  return unwrap<{ station: string; templates: OrbTemplateTaxonomyEntry[] }>(payload)
}

export async function fetchOrbTemplatesByCategory(category: string) {
  const payload = await authFetch(ORB_TAXONOMY_API.byCategory(category), { credentials: 'include' })
  return unwrap<{ category: string; templates: OrbTemplateTaxonomyEntry[] }>(payload)
}

export async function fetchOrbTemplateTaxonomyEntry(templateId: string) {
  const payload = await authFetch(ORB_TAXONOMY_API.entry(templateId), { credentials: 'include' })
  return unwrap<OrbTemplateTaxonomyEntry>(payload)
}

/** Strip source chips from visible body while preserving metadata for audit. */
export function stripSourceChipsFromBody(
  body: string,
  sources?: Array<{ title?: string; label?: string }>
): { body: string; sourceChipsMetadata?: Array<{ title?: string; label?: string }> } {
  if (!sources?.length) return { body }
  let cleaned = body
  for (const source of sources) {
    const label = source.title || source.label
    if (label && cleaned.includes(label)) {
      cleaned = cleaned.replace(label, '').trim()
    }
  }
  return {
    body: cleaned.trim() || body,
    sourceChipsMetadata: sources.map((s) => ({ title: s.title, label: s.label }))
  }
}

export const ORB_SAVED_TO_MY_DRAFTS_NOTICE = 'Saved to My Drafts'
