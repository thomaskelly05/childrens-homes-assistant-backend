export type OrbHomeDocumentType =
  | 'statement_of_purpose'
  | 'safeguarding_policy'
  | 'missing_from_care_policy'
  | 'behaviour_support_policy'
  | 'physical_intervention_policy'
  | 'medication_policy'
  | 'complaints_policy'
  | 'fire_safety_policy'
  | 'whistleblowing_policy'
  | 'staff_supervision_policy'
  | 'admission_policy'
  | 'placement_planning_document'
  | 'child_specific_plan'
  | 'risk_assessment'
  | 'behaviour_support_plan'
  | 'communication_plan'
  | 'health_plan'
  | 'education_plan'
  | 'local_authority_protocol'
  | 'other_home_policy'

export type TextExtractStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type IndexingStatus = 'pending' | 'indexed' | 'failed' | 'disabled'

export interface OrbHomeDocumentRecord {
  document_id: string
  title: string
  document_type: OrbHomeDocumentType
  filename: string | null
  mime_type: string | null
  text_extract_status: TextExtractStatus
  indexing_status: IndexingStatus
  version: number
  archived: boolean
  ready_for_orb_use: boolean
  citation_label: string | null
  created_at: string
  updated_at: string
}

export interface OrbHomeDocumentTypeOption {
  value: OrbHomeDocumentType
  label: string
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail || `Request failed (${res.status})`)
  }
  const json = await res.json()
  return json.data as T
}

export async function listOrbHomeDocumentTypes(): Promise<OrbHomeDocumentTypeOption[]> {
  const data = await apiFetch<{ types: OrbHomeDocumentTypeOption[] }>('/api/orb/home-documents/types')
  return data.types
}

export async function listOrbHomeDocumentsApi(): Promise<OrbHomeDocumentRecord[]> {
  const data = await apiFetch<{ items: OrbHomeDocumentRecord[] }>('/api/orb/home-documents')
  return data.items
}

export async function uploadOrbHomeDocumentApi(input: {
  file: File
  title: string
  documentType: OrbHomeDocumentType
}): Promise<OrbHomeDocumentRecord> {
  const form = new FormData()
  form.append('file', input.file)
  form.append('title', input.title)
  form.append('document_type', input.documentType)
  return apiFetch<OrbHomeDocumentRecord>('/api/orb/home-documents/upload', {
    method: 'POST',
    body: form
  })
}

export async function archiveOrbHomeDocumentApi(documentId: string): Promise<OrbHomeDocumentRecord> {
  return apiFetch<OrbHomeDocumentRecord>(`/api/orb/home-documents/${documentId}/archive`, {
    method: 'POST'
  })
}
