import type { OrbSavedOutputSummary, OrbSavedOutputType } from '@/lib/orb/standalone-client'

export const ORB_SAVED_OUTPUTS_LOCAL_KEY = 'orb-saved-outputs-local'

export type OrbLocalSavedOutput = OrbSavedOutputSummary & {
  content_markdown?: string | null
  local_only?: boolean
}

function readRaw(): OrbLocalSavedOutput[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORB_SAVED_OUTPUTS_LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OrbLocalSavedOutput[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(items: OrbLocalSavedOutput[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ORB_SAVED_OUTPUTS_LOCAL_KEY, JSON.stringify(items.slice(0, 80)))
}

export function listOrbLocalSavedOutputs(params?: {
  search?: string
  output_type?: string
  project_id?: string
}): { items: OrbLocalSavedOutput[]; total: number } {
  let items = readRaw()
  if (params?.search?.trim()) {
    const q = params.search.trim().toLowerCase()
    items = items.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        (row.summary || '').toLowerCase().includes(q) ||
        (row.tags || []).some((t) => t.toLowerCase().includes(q))
    )
  }
  if (params?.output_type) {
    items = items.filter((row) => row.type === params.output_type)
  }
  if (params?.project_id) {
    items = items.filter((row) => row.project_id === params.project_id)
  }
  return { items, total: items.length }
}

export function upsertOrbLocalSavedOutput(input: {
  id?: string
  title: string
  type: OrbSavedOutputType
  summary?: string
  content_markdown?: string
  project_id?: string | null
  project_name?: string | null
  tags?: string[]
}): OrbLocalSavedOutput {
  const now = new Date().toISOString()
  const id = input.id || `local_${Date.now()}`
  const row: OrbLocalSavedOutput = {
    id,
    title: input.title,
    type: input.type,
    status: 'draft',
    summary: input.summary || input.content_markdown?.slice(0, 280) || null,
    content_markdown: input.content_markdown,
    project_id: input.project_id,
    project_name: input.project_name,
    tags: input.tags,
    created_at: now,
    updated_at: now,
    standalone_only: true,
    local_only: true
  }
  const rest = readRaw().filter((item) => item.id !== id)
  writeRaw([row, ...rest])
  return row
}

export function getOrbLocalSavedOutput(id: string): OrbLocalSavedOutput | null {
  return readRaw().find((row) => row.id === id) ?? null
}

export function removeOrbLocalSavedOutput(id: string): void {
  writeRaw(readRaw().filter((row) => row.id !== id))
}

export function localSavedOutputsSummary(): { total: number; storage_mode: 'local' } {
  return { total: readRaw().length, storage_mode: 'local' }
}
