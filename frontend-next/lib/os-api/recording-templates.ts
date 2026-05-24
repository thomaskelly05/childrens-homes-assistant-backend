'use client'

export type RecordingStructuredFieldType =
  | 'text'
  | 'textarea'
  | 'datetime'
  | 'date'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'checklist'
  | 'person_list'
  | 'action_list'

export type RecordingStructuredFieldDefinition = {
  id: string
  label: string
  field_type: RecordingStructuredFieldType
  description?: string | null
  required?: boolean
  privacy_sensitive?: boolean
  safeguarding_sensitive?: boolean
  options?: string[]
  placeholder?: string | null
  guidance?: string | null
  review_trigger?: boolean
  maps_to_summary?: boolean
}

export type RecordingStructuredSection = {
  id: string
  title: string
  description?: string | null
  fields: RecordingStructuredFieldDefinition[]
}

export type RecordingStructuredTemplate = {
  form_id: string
  recording_type?: string | null
  title: string
  description: string
  high_risk: boolean
  requires_manager_review: boolean
  safeguarding_sensitive: boolean
  privacy_sensitive: boolean
  sections: RecordingStructuredSection[]
  quality_prompts: string[]
  orb_prompts: string[]
  safety_notices: string[]
  review_triggers: string[]
  version: string
}

export type RecordingStructuredCompletionResult = {
  valid: boolean
  required_missing: string[]
  completion_summary: string[]
  review_triggers: string[]
  safety_flags: string[]
  privacy_field_ids: string[]
}

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

async function parseEnvelope<T>(response: Response, fallback: T): Promise<{ data: T; ok: boolean; error?: string }> {
  if (!response.ok) {
    return { data: fallback, ok: false, error: `${response.status} ${response.statusText}` }
  }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T
  const envelope = payload as ApiEnvelope<T>
  return {
    data: envelope && typeof envelope === 'object' && 'data' in envelope ? (envelope.data as T) : (payload as T),
    ok: true
  }
}

export async function listRecordingTemplates() {
  const response = await fetch('/api/recording-templates', { credentials: 'include' })
  return parseEnvelope<{ items: RecordingStructuredTemplate[]; total: number }>(response, { items: [], total: 0 })
}

export async function getRecordingTemplate(formId: string) {
  const response = await fetch(`/api/recording-templates/${encodeURIComponent(formId)}`, {
    credentials: 'include'
  })
  return parseEnvelope<{ template: RecordingStructuredTemplate }>(response, { template: {} as RecordingStructuredTemplate })
}

export async function validateRecordingTemplate(formId: string, values: Record<string, unknown>) {
  const response = await fetch(`/api/recording-templates/${encodeURIComponent(formId)}/validate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  })
  return parseEnvelope<RecordingStructuredCompletionResult>(response, {
    valid: false,
    required_missing: [],
    completion_summary: [],
    review_triggers: [],
    safety_flags: [],
    privacy_field_ids: []
  })
}

export async function summariseRecordingTemplate(formId: string, values: Record<string, unknown>) {
  const response = await fetch(`/api/recording-templates/${encodeURIComponent(formId)}/summary`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  })
  return parseEnvelope<{
    completion_summary: string[]
    required_missing: string[]
    review_triggers: string[]
    safety_flags: string[]
  }>(response, {
    completion_summary: [],
    required_missing: [],
    review_triggers: [],
    safety_flags: []
  })
}
