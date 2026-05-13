import { demoChronologyEvents } from '@/lib/chronology/demo-data'
import type { ChronologyEvent, ChronologyEventType, ChronologySeverity, ChronologySourceType } from '@/lib/chronology/types'

import { osGet, queryString } from './client'
import type { OsApiResult } from './types'

function severity(value: unknown): ChronologySeverity {
  const normalised = String(value || 'medium') as ChronologySeverity
  return ['low', 'medium', 'high', 'critical'].includes(normalised) ? normalised : 'medium'
}

export function mapOsChronology(row: Record<string, any>): ChronologyEvent {
  const sourceType = String(row.source_type || row.sourceType || 'daily_log') as ChronologySourceType
  return {
    id: String(row.id || `${sourceType}:${row.source_id || ''}`),
    dateTime: String(row.date_time || row.dateTime || row.created_at || ''),
    title: String(row.title || 'Chronology event'),
    summary: String(row.summary || ''),
    fullText: String(row.full_text || row.fullText || row.summary || ''),
    eventType: String(row.event_type || row.eventType || sourceType) as ChronologyEventType,
    category: String(row.category || sourceType),
    severity: severity(row.severity),
    sourceType,
    sourceId: String(row.source_id || row.sourceId || ''),
    youngPersonIds: Array.isArray(row.young_person_ids) ? row.young_person_ids.map(String) : row.youngPersonIds || [],
    staffIds: Array.isArray(row.staff_ids) ? row.staff_ids.map(String) : row.staffIds || [],
    homeId: String(row.home_id || row.homeId || ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    linkedRecordIds: Array.isArray(row.linked_record_ids) ? row.linked_record_ids.map(String) : row.linkedRecordIds || [],
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : row.evidenceIds || [],
    regulationLinks: Array.isArray(row.regulation_links) ? row.regulation_links : row.regulationLinks || [],
    safeguardingFlags: Array.isArray(row.safeguarding_flags) ? row.safeguarding_flags.map(String) : row.safeguardingFlags || [],
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags.map(String) : row.riskFlags || [],
    actionIds: Array.isArray(row.action_ids) ? row.action_ids.map(String) : row.actionIds || [],
    createdBy: String(row.created_by || row.createdBy || ''),
    createdAt: String(row.created_at || row.createdAt || row.date_time || ''),
    updatedAt: String(row.updated_at || row.updatedAt || row.date_time || ''),
    visibility: row.visibility || 'home',
    citationLabel: String(row.citation_label || row.citationLabel || row.title || 'Source record')
  }
}

export async function getOsChronology(params: { sourceType?: ChronologySourceType; youngPersonId?: string; search?: string } = {}): Promise<OsApiResult<ChronologyEvent[]>> {
  const result = await osGet<Record<string, any>[]>(
    `/os/chronology${queryString({ source_type: params.sourceType, young_person_id: params.youngPersonId, search: params.search })}`,
    demoChronologyEvents
  )
  return { ...result, data: result.data.map(mapOsChronology) }
}
