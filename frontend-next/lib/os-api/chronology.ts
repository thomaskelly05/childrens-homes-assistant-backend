import type { ChronologyEvent, ChronologyEventType, ChronologySeverity, ChronologySourceType } from '@/lib/chronology/types'

import { osGet, queryString } from './client'
import type { OsApiResult } from './types'

const SOURCE_TYPES = [
  'daily_log',
  'incident',
  'safeguarding',
  'risk_assessment',
  'medication',
  'health',
  'education',
  'keywork',
  'appointment',
  'document',
  'report',
  'manager_review',
  'audit',
  'reg44_report',
  'reg45_report',
  'lac_review'
] as const

const EVENT_TYPES = [
  'daily_log',
  'incident',
  'safeguarding',
  'medication',
  'health',
  'education',
  'keywork',
  'appointment',
  'missing_episode',
  'family_contact',
  'professional_contact',
  'direct_work',
  'manager_review',
  'reg44_finding',
  'reg45_evidence',
  'lac_review',
  'document_upload',
  'audit_event',
  'placement_update',
  'risk_review',
  'behaviour_observation',
  'complaint',
  'allegation',
  'restraint',
  'sanction',
  'positive_outcome'
] as const

function text(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function asStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined).map(String)
  return [String(value)]
}

function severity(value: unknown): ChronologySeverity {
  const normalised = String(value || 'medium').toLowerCase() as ChronologySeverity
  return ['low', 'medium', 'high', 'critical'].includes(normalised) ? normalised : 'medium'
}

function normaliseSourceType(value: unknown): ChronologySourceType {
  const raw = String(value || '').toLowerCase().trim()
  const mapped = raw
    .replace('daily_record', 'daily_log')
    .replace('daily_note', 'daily_log')
    .replace('daily_notes', 'daily_log')
    .replace('risk', 'risk_assessment')
    .replace('missing', 'safeguarding')
  return (SOURCE_TYPES as readonly string[]).includes(mapped) ? (mapped as ChronologySourceType) : 'daily_log'
}

function normaliseEventType(value: unknown, sourceType: ChronologySourceType): ChronologyEventType {
  const raw = String(value || sourceType || '').toLowerCase().trim()
  const mapped = raw
    .replace('daily_record', 'daily_log')
    .replace('daily_note', 'daily_log')
    .replace('daily_notes', 'daily_log')
    .replace('missing', 'missing_episode')
    .replace('risk', 'risk_review')
  return (EVENT_TYPES as readonly string[]).includes(mapped) ? (mapped as ChronologyEventType) : (sourceType as ChronologyEventType)
}

function extractRows(payload: unknown): Record<string, any>[] {
  if (Array.isArray(payload)) return payload as Record<string, any>[]
  const value = payload as Record<string, any> | null | undefined
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.data)) return value.data
  if (Array.isArray(value.items)) return value.items
  if (Array.isArray(value.timeline)) return value.timeline
  if (Array.isArray(value.chronology)) return value.chronology
  if (Array.isArray(value.records)) return value.records
  return []
}

export function mapOsChronology(row: Record<string, any>): ChronologyEvent {
  const metadata = row.metadata || row.metadata_json || {}
  const sourceType = normaliseSourceType(row.source_type || row.sourceType || row.source_table || row.record_type || row.category || row.event_type)
  const eventType = normaliseEventType(row.event_type || row.eventType || row.record_type || row.category || sourceType, sourceType)
  const dateTime = text(row.date_time || row.dateTime || row.occurred_at || row.event_at || row.record_date || row.created_at || row.updated_at)
  const sourceId = text(row.source_id || row.sourceId || row.id)
  const title = text(row.title || row.event_title || row.category || row.record_type || 'Chronology event')
  const summary = text(row.summary || row.event_summary || row.narrative || row.child_voice || row.full_text || row.description || '')
  const youngPersonIds = asStringArray(row.young_person_ids || row.youngPersonIds || row.young_person_id || row.youngPersonId)

  return {
    id: text(row.id || row.feed_id || row.chronology_event_id || `${sourceType}:${sourceId}`),
    dateTime,
    title,
    summary,
    fullText: text(row.full_text || row.fullText || row.narrative || row.event_summary || row.summary || row.child_voice || ''),
    eventType,
    category: text(row.category || row.sccif_area || row.domain || sourceType),
    severity: severity(row.severity || row.priority || metadata.severity),
    sourceType,
    sourceId,
    youngPersonIds,
    staffIds: asStringArray(row.staff_ids || row.staffIds || row.staff_id || row.staffId),
    homeId: text(row.home_id || row.homeId),
    tags: asStringArray(row.tags || metadata.tags),
    linkedRecordIds: asStringArray(row.linked_record_ids || row.linkedRecordIds || row.source_id || row.sourceId),
    evidenceIds: asStringArray(row.evidence_ids || row.evidenceIds || row.evidence_refs || metadata.evidence_ids),
    documentIds: asStringArray(row.document_ids || row.documentIds || metadata.document_ids),
    regulationLinks: Array.isArray(row.regulation_links) ? row.regulation_links : row.regulationLinks || [],
    sccifLinks: asStringArray(row.sccif_links || row.sccifLinks || row.sccif_area || metadata.sccif_links),
    qualityStandardLinks: asStringArray(row.quality_standard_links || row.qualityStandardLinks || metadata.quality_standard_links),
    safeguardingFlags: asStringArray(row.safeguarding_flags || row.safeguardingFlags || (row.safeguarding_relevant ? 'Safeguarding' : undefined)),
    riskFlags: asStringArray(row.risk_flags || row.riskFlags || row.risk_level),
    actionIds: asStringArray(row.action_ids || row.actionIds || row.actions_taken || metadata.action_ids),
    createdBy: text(row.created_by || row.createdBy),
    createdAt: text(row.created_at || row.createdAt || dateTime),
    updatedAt: text(row.updated_at || row.updatedAt || dateTime),
    visibility: row.visibility || 'home',
    citationLabel: text(row.citation_label || row.citationLabel || row.title || row.event_title || 'Source record'),
    replayCursor: Number(row.replay_cursor || row.replayCursor || 0) || undefined,
    sourceEventIds: asStringArray(row.source_event_ids || row.sourceEventIds),
    linkedOperationalStateIds: asStringArray(row.linked_operational_states || row.linkedOperationalStateIds),
    linkedGovernanceReviewIds: asStringArray(row.linked_governance_reviews || row.linkedGovernanceReviewIds),
    linkedInspectionIds: asStringArray(row.linked_inspections || row.linkedInspectionIds),
    linkedSignoffIds: asStringArray(row.linked_signoffs || row.linkedSignoffIds)
  }
}

export async function getOsChronology(params: { sourceType?: ChronologySourceType; youngPersonId?: string; search?: string } = {}): Promise<OsApiResult<ChronologyEvent[]>> {
  const path = `/os/chronology${queryString({ young_person_id: params.youngPersonId, source_type: params.sourceType, search: params.search })}`

  const result = await osGet<any>(path, [])
  let rows = extractRows(result.data).map(mapOsChronology)

  if (params.sourceType) {
    rows = rows.filter((event) => event.sourceType === params.sourceType || event.eventType === params.sourceType)
  }

  return { ...result, data: rows }
}

export async function getOsChronologyEvent(id: string): Promise<OsApiResult<ChronologyEvent | null>> {
  const result = await osGet<any>(`/os/chronology/${encodeURIComponent(id)}`, null)
  const rows = extractRows(result.data)
  const row = rows.find((item) => String(item.id || item.feed_id || item.chronology_event_id) === id) || (result.data && !Array.isArray(result.data) ? result.data : null)
  return { ...result, data: row ? mapOsChronology(row as Record<string, any>) : null }
}