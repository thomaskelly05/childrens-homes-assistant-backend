import { ORB_DICTATE_DRAFTS_STORAGE_KEY, type OrbDictateDraft } from '@/lib/orb/dictate/orb-dictate-drafts'

export type OrbDictateDraftSyncMeta = {
  local_id: string
  synced_at: string | null
  backend_id: string | null
  conflict_status: 'none' | 'local_newer' | 'both'
}

export type OrbDictateDraftSyncRow = OrbDictateDraft & {
  sync: OrbDictateDraftSyncMeta
}

const SYNC_META_KEY = 'orb-dictate-draft-sync-meta'

function readMeta(): Record<string, OrbDictateDraftSyncMeta> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SYNC_META_KEY)
    return raw ? (JSON.parse(raw) as Record<string, OrbDictateDraftSyncMeta>) : {}
  } catch {
    return {}
  }
}

function writeMeta(meta: Record<string, OrbDictateDraftSyncMeta>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
}

export function listOrbDictateDraftsForSync(): OrbDictateDraftSyncRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ORB_DICTATE_DRAFTS_STORAGE_KEY)
    if (!raw) return []
    const drafts = JSON.parse(raw) as OrbDictateDraft[]
    const meta = readMeta()
    return (Array.isArray(drafts) ? drafts : []).map((draft, index) => {
      const localId = draft.note_id || `draft_${index}_${draft.updated_at}`
      const sync =
        meta[localId] ??
        ({
          local_id: localId,
          synced_at: null,
          backend_id: draft.note_id,
          conflict_status: draft.note_id ? 'none' : 'local_newer'
        } satisfies OrbDictateDraftSyncMeta)
      return { ...draft, sync }
    })
  } catch {
    return []
  }
}

export function markOrbDictateDraftSynced(localId: string, backendId: string): void {
  const meta = readMeta()
  meta[localId] = {
    local_id: localId,
    synced_at: new Date().toISOString(),
    backend_id: backendId,
    conflict_status: 'none'
  }
  writeMeta(meta)
}

export function dismissOrbDictateDraftSync(localId: string): void {
  const meta = readMeta()
  meta[localId] = {
    ...(meta[localId] || { local_id: localId, synced_at: null, backend_id: null, conflict_status: 'none' }),
    conflict_status: 'none',
    synced_at: meta[localId]?.synced_at || new Date().toISOString()
  }
  writeMeta(meta)
}

export function draftsNeedingSync(): OrbDictateDraftSyncRow[] {
  return listOrbDictateDraftsForSync().filter((row) => !row.sync.synced_at && row.is_draft)
}
