import { demoEvidenceItems } from '@/lib/evidence/demo-data'
import type { EvidenceItem, EvidenceQuality, EvidenceType } from '@/lib/evidence/types'

import { osGet, osPost } from './client'
import type { OsApiResult } from './types'

function quality(value: unknown): EvidenceQuality {
  const normalised = String(value || 'adequate') as EvidenceQuality
  return ['draft', 'partial', 'adequate', 'strong', 'review_required'].includes(normalised) ? normalised : 'adequate'
}

function evidenceType(value: unknown): EvidenceType {
  const normalised = String(value || 'document') as EvidenceType
  return [
    'daily_record',
    'incident_record',
    'direct_observation',
    'child_voice',
    'professional_feedback',
    'family_feedback',
    'document',
    'photo',
    'manager_review',
    'audit',
    'regulatory_finding'
  ].includes(normalised) ? normalised : 'document'
}

export function mapOsEvidence(row: Record<string, any>): EvidenceItem {
  return {
    id: String(row.id || row.original_id || ''),
    title: String(row.title || 'Evidence item'),
    description: String(row.description || ''),
    evidenceType: evidenceType(row.evidence_type || row.evidenceType),
    sourceType: String(row.source_type || row.sourceType || ''),
    sourceId: String(row.source_id || row.sourceId || ''),
    youngPersonId: row.young_person_id ? String(row.young_person_id) : row.youngPersonId,
    homeId: String(row.home_id || row.homeId || ''),
    linkedRegulation: row.linked_regulation || row.linkedRegulation,
    linkedReportIds: Array.isArray(row.linked_report_ids) ? row.linked_report_ids.map(String) : row.linkedReportIds || [],
    createdBy: String(row.created_by || row.createdBy || ''),
    createdAt: String(row.created_at || row.createdAt || ''),
    quality: quality(row.quality),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : []
  }
}

export async function getOsEvidence(): Promise<OsApiResult<EvidenceItem[]>> {
  const result = await osGet<Record<string, any>[]>('/os/evidence', demoEvidenceItems)
  return { ...result, data: result.data.map(mapOsEvidence) }
}

export async function getOsEvidenceItem(id: string): Promise<OsApiResult<EvidenceItem | undefined>> {
  const fallback = demoEvidenceItems.find((item) => item.id === id)
  const result = await osGet<Record<string, any> | undefined>(`/os/evidence/${encodeURIComponent(id)}`, fallback as any)
  return { ...result, data: result.data ? mapOsEvidence(result.data) : fallback }
}

export async function attachOsEvidence(payload: Record<string, unknown>) {
  return osPost('/os/evidence/attach', payload, {})
}
