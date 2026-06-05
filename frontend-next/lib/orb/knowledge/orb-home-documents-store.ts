import type {
  OrbKnowledgeApprovalStatus,
  OrbKnowledgeLibraryItem,
  OrbKnowledgeSourceKind
} from '@/lib/orb/knowledge/orb-knowledge-library-types'

const STORAGE_KEY = 'orb-home-documents-library-v1'

function readAll(): OrbKnowledgeLibraryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OrbKnowledgeLibraryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: OrbKnowledgeLibraryItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* quota */
  }
}

export function listOrbHomeDocuments(): OrbKnowledgeLibraryItem[] {
  return readAll().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function saveOrbHomeDocument(
  input: Omit<OrbKnowledgeLibraryItem, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): OrbKnowledgeLibraryItem {
  const now = new Date().toISOString()
  const items = readAll()
  const existing = input.id ? items.find((i) => i.id === input.id) : undefined
  const item: OrbKnowledgeLibraryItem = {
    id: existing?.id ?? `home-doc-${Date.now()}`,
    provider_id: input.provider_id ?? null,
    user_id: input.user_id ?? null,
    home_id: input.home_id ?? null,
    title: input.title,
    source_kind: input.source_kind,
    publisher: input.publisher ?? null,
    url: input.url ?? null,
    file_name: input.file_name ?? null,
    content_text: input.content_text ?? null,
    summary: input.summary ?? null,
    tags: input.tags ?? [],
    related_record_type_ids: input.related_record_type_ids ?? [],
    approval_status: input.approval_status ?? 'draft',
    review_due_at: input.review_due_at ?? null,
    last_checked_at: input.last_checked_at ?? null,
    created_by: input.created_by ?? 'local_user',
    created_at: existing?.created_at ?? now,
    updated_at: now
  }
  const next = existing
    ? items.map((i) => (i.id === item.id ? item : i))
    : [item, ...items]
  writeAll(next)
  return item
}

export function updateOrbHomeDocumentStatus(
  id: string,
  approval_status: OrbKnowledgeApprovalStatus
): OrbKnowledgeLibraryItem | null {
  const items = readAll()
  const idx = items.findIndex((i) => i.id === id)
  if (idx < 0) return null
  items[idx] = { ...items[idx], approval_status, updated_at: new Date().toISOString() }
  writeAll(items)
  return items[idx]
}

export function archiveOrbHomeDocument(id: string): void {
  updateOrbHomeDocumentStatus(id, 'archived')
}

export const HOME_DOCUMENT_KIND_OPTIONS: { value: OrbKnowledgeSourceKind; label: string }[] = [
  { value: 'home_document', label: 'Home policy' },
  { value: 'provider_policy', label: 'Provider policy' },
  { value: 'local_protocol', label: 'Local authority guidance' },
  { value: 'useful_link', label: 'Useful guidance link' },
  { value: 'uploaded_document', label: 'Uploaded document' }
]
