import { osGet } from './client'
import type { OsApiResult } from './types'

export type UnknownRecord = Record<string, any>

export type WorkspaceBundle = {
  identity: UnknownRecord
  home: UnknownRecord
  today: UnknownRecord
  handover: { status?: string; items: UnknownRecord[]; unread_required_count?: number; summary?: UnknownRecord }
  notifications: { unread_count: number; items: UnknownRecord[] }
  connect: { unread_count: number; recent_threads: UnknownRecord[]; home_channel?: UnknownRecord | null }
  children: { visible: UnknownRecord[]; priority: UnknownRecord[]; favourites: UnknownRecord[] }
  actions: { open: UnknownRecord[]; overdue: UnknownRecord[]; assigned_to_me: UnknownRecord[] }
  recent_chronology: UnknownRecord[]
  preferences: UnknownRecord
}

export type ChildProfileBundle = {
  identity: UnknownRecord
  personhood: UnknownRecord
  communication: UnknownRecord
  relationships: UnknownRecord[]
  safety: UnknownRecord
  plans: UnknownRecord[]
  documents: UnknownRecord[]
  recent_chronology: UnknownRecord[]
  evidence: UnknownRecord[]
  actions: UnknownRecord[]
}

export type HomeOperationalBundle = {
  home: UnknownRecord
  today: UnknownRecord
  children_needing_attention: UnknownRecord[]
  safeguarding: { open_count?: number; items?: UnknownRecord[] }
  missing: { open_count?: number; items?: UnknownRecord[] }
  handover: { status?: string; items?: UnknownRecord[]; summary?: UnknownRecord }
  notifications: { unread_count?: number; items?: UnknownRecord[] }
  connect: { unread_count?: number; recent_threads?: UnknownRecord[]; home_channel?: UnknownRecord | null }
  inspection: UnknownRecord
  actions: UnknownRecord[]
  recent_chronology: UnknownRecord[]
  operational_pressure: UnknownRecord
}

export const emptyWorkspaceBundle: WorkspaceBundle = {
  identity: {},
  home: {},
  today: {},
  handover: { items: [] },
  notifications: { unread_count: 0, items: [] },
  connect: { unread_count: 0, recent_threads: [], home_channel: null },
  children: { visible: [], priority: [], favourites: [] },
  actions: { open: [], overdue: [], assigned_to_me: [] },
  recent_chronology: [],
  preferences: {}
}

export const emptyChildProfileBundle: ChildProfileBundle = {
  identity: {},
  personhood: {},
  communication: {},
  relationships: [],
  safety: {},
  plans: [],
  documents: [],
  recent_chronology: [],
  evidence: [],
  actions: []
}

export const emptyHomeOperationalBundle: HomeOperationalBundle = {
  home: {},
  today: {},
  children_needing_attention: [],
  safeguarding: { items: [] },
  missing: { items: [] },
  handover: { items: [] },
  notifications: { unread_count: 0, items: [] },
  connect: { unread_count: 0, recent_threads: [], home_channel: null },
  inspection: {},
  actions: [],
  recent_chronology: [],
  operational_pressure: {}
}

export function text(row: UnknownRecord | undefined, keys: string[], fallback = 'Not returned yet') {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return fallback
}

export function recordTitle(row: UnknownRecord, fallback = 'Record') {
  return text(row, ['title', 'name', 'display_name', 'summary', 'category', 'record_type'], fallback)
}

export async function getWorkspaceBundle(): Promise<OsApiResult<WorkspaceBundle>> {
  return osGet<WorkspaceBundle>('/api/me/workspace', emptyWorkspaceBundle)
}

export async function getChildProfileBundle(id: string): Promise<OsApiResult<ChildProfileBundle>> {
  return osGet<ChildProfileBundle>(`/api/young-people/${encodeURIComponent(id)}/profile-bundle`, emptyChildProfileBundle)
}

export async function getHomeOperationalBundle(id: string): Promise<OsApiResult<HomeOperationalBundle>> {
  return osGet<HomeOperationalBundle>(`/api/homes/${encodeURIComponent(id)}/operational-bundle`, emptyHomeOperationalBundle)
}
