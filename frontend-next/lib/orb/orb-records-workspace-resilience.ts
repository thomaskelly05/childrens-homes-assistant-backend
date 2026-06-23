'use client'

import {
  createOrbRecordsWorkspaceItem,
  listOrbRecordsWorkspaceItems,
  ORB_SAVED_TO_MY_DRAFTS_NOTICE,
  stripSourceChipsFromBody,
  type OrbRecordSourceStation,
  type OrbRecordWorkspaceItem
} from '@/lib/orb/orb-records-workspace-client'

export { ORB_SAVED_TO_MY_DRAFTS_NOTICE }

export type OrbRecordsWorkspaceListResult = {
  items: OrbRecordWorkspaceItem[]
  total: number
  storageMode: 'server'
  reconnectSuggested: boolean
}

/** Canonical server-backed list — localStorage is not used for workspace items. */
export async function listOrbRecordsWorkspaceResilient(params?: {
  section?: string
  status?: 'draft' | 'reviewed' | 'finalised' | 'archived'
  template_id?: string
  source_station?: OrbRecordSourceStation
  search?: string
  limit?: number
  offset?: number
}): Promise<OrbRecordsWorkspaceListResult> {
  try {
    const payload = await listOrbRecordsWorkspaceItems(params)
    return {
      items: payload.items ?? [],
      total: payload.total ?? 0,
      storageMode: 'server',
      reconnectSuggested: false
    }
  } catch {
    return { items: [], total: 0, storageMode: 'server', reconnectSuggested: true }
  }
}

export async function saveChatToRecordsWorkspace(options: {
  title: string
  content: string
  sources?: Array<{ title?: string; label?: string }>
  template_id?: string
  category?: string
  message_id?: string
  turn_into_record?: boolean
}) {
  const { body, sourceChipsMetadata } = stripSourceChipsFromBody(options.content, options.sources)
  return createOrbRecordsWorkspaceItem({
    title: options.title,
    body,
    template_id: options.template_id,
    category: options.category,
    source_station: 'chat',
    workspace_section: 'my_drafts',
    status: 'draft',
    metadata: {
      message_id: options.message_id,
      turn_into_record: Boolean(options.turn_into_record),
      source_chips: sourceChipsMetadata,
      saved_notice: ORB_SAVED_TO_MY_DRAFTS_NOTICE
    }
  })
}

export async function saveStationDraftToRecordsWorkspace(options: {
  title: string
  body: string
  source_station: OrbRecordSourceStation
  template_id?: string
  category?: string
}) {
  return createOrbRecordsWorkspaceItem({
    title: options.title,
    body: options.body,
    template_id: options.template_id,
    category: options.category,
    source_station: options.source_station,
    workspace_section: 'my_drafts',
    status: 'draft'
  })
}

export function workspaceItemAsSavedSummary(item: OrbRecordWorkspaceItem): {
  id: string
  title: string
  type: string
  summary?: string
  status: string
  created_at: string
  updated_at: string
  project_name?: string
} {
  return {
    id: item.id,
    title: item.title,
    type: item.template_id || item.category || item.source_station,
    summary: item.body?.slice(0, 200),
    status: item.status,
    created_at: item.created_at,
    updated_at: item.updated_at,
    project_name: item.workspace_section
  }
}
