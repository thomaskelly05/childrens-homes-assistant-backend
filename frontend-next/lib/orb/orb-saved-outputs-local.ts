'use client'

import type { OrbSavedOutputRecord, OrbSavedOutputType } from '@/lib/orb/standalone-client'

const STORAGE_KEY = 'orb-saved-outputs-local'

export type OrbLocalSavedOutput = {
  id: string
  title: string
  type: OrbSavedOutputType | string
  summary?: string
  content_markdown?: string
  project_id?: string
  project_name?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
}

function readStore(): OrbLocalSavedOutput[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is OrbLocalSavedOutput => Boolean(entry && typeof entry === 'object'))
  } catch {
    return []
  }
}

function writeStore(items: OrbLocalSavedOutput[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore quota errors
  }
}

function makeLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function listOrbLocalSavedOutputs(): OrbLocalSavedOutput[] {
  return readStore().sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || '') || 0
    const bTime = Date.parse(b.updated_at || b.created_at || '') || 0
    return bTime - aTime
  })
}

export function getOrbLocalSavedOutput(id: string): OrbLocalSavedOutput | null {
  return readStore().find((item) => item.id === id) ?? null
}

export function upsertOrbLocalSavedOutput(
  payload: Omit<OrbLocalSavedOutput, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): OrbLocalSavedOutput {
  const items = readStore()
  const now = new Date().toISOString()
  const id = payload.id?.startsWith('local_') ? payload.id : payload.id ? `local_${payload.id}` : makeLocalId()
  const existing = items.find((item) => item.id === id)
  const next: OrbLocalSavedOutput = {
    ...existing,
    ...payload,
    id,
    created_at: existing?.created_at ?? now,
    updated_at: now
  }
  const without = items.filter((item) => item.id !== id)
  writeStore([next, ...without])
  return next
}

export function removeOrbLocalSavedOutput(id: string): void {
  writeStore(readStore().filter((item) => item.id !== id))
}

export function countOrbLocalSavedOutputs(): number {
  return readStore().length
}

export function orbLocalSavedOutputAsRecord(item: OrbLocalSavedOutput): OrbSavedOutputRecord {
  const now = new Date().toISOString()
  return {
    id: item.id,
    title: item.title,
    type: item.type as OrbSavedOutputRecord['type'],
    summary: item.summary,
    content_markdown: item.content_markdown,
    project_id: item.project_id,
    project_name: item.project_name,
    tags: item.tags,
    status: 'saved',
    created_at: item.created_at || now,
    updated_at: item.updated_at || item.created_at || now,
    intelligence_output: { title: item.title, summary: item.summary || '' }
  } as unknown as OrbSavedOutputRecord
}
