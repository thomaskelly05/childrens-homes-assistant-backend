import type { ExtractedFinding, HomeDocument, HomeDocumentStatus, HomeDocumentType } from '@/lib/documents/types'

import { osGet } from './client'
import type { OsApiResult } from './types'

function status(value: unknown): HomeDocumentStatus {
  const normalised = String(value || 'uploaded') as HomeDocumentStatus
  return ['draft', 'uploaded', 'processing', 'review', 'review_required', 'returned_for_update', 'action_plan_open', 'approved', 'signed_off', 'archived'].includes(normalised) ? normalised : 'uploaded'
}

function documentType(value: unknown): HomeDocumentType {
  const normalised = String(value || 'policy') as HomeDocumentType
  return [
    'reg44_report',
    'reg45_report',
    'lac_review',
    'care_plan',
    'risk_assessment',
    'placement_plan',
    'statement_of_purpose',
    'missing_protocol',
    'behaviour_support_plan',
    'safeguarding_report',
    'medication_audit',
    'fire_safety',
    'staff_supervision',
    'training_record',
    'policy',
    'inspection_report',
    'complaint_record'
  ].includes(normalised) ? normalised : normalised.includes('reg44') ? 'reg44_report' : 'policy'
}

function findings(value: unknown): ExtractedFinding[] {
  return Array.isArray(value) ? value.map((item: any, index) => ({
    id: String(item.id || item.title || `finding-${index}`),
    title: String(item.title || 'Finding'),
    summary: String(item.summary || ''),
    regulation: item.regulation ? String(item.regulation) : undefined,
    severity: item.severity || 'medium',
    actionIds: Array.isArray(item.actionIds) ? item.actionIds : item.action_ids || [],
    evidenceRequired: Array.isArray(item.evidenceRequired) ? item.evidenceRequired : item.evidence_required || [],
    chronologyEventId: item.chronologyEventId || item.chronology_event_id
  })) : []
}

export function mapOsDocument(row: Record<string, any>): HomeDocument {
  return {
    id: String(row.id || row.original_id || ''),
    homeId: String(row.home_id || row.homeId || ''),
    title: String(row.title || 'Document'),
    documentType: documentType(row.document_type || row.documentType || row.category),
    uploadedAt: String(row.uploaded_at || row.uploadedAt || ''),
    uploadedBy: String(row.uploaded_by || row.uploadedBy || ''),
    periodStart: row.period_start || row.periodStart,
    periodEnd: row.period_end || row.periodEnd,
    fileName: String(row.file_name || row.fileName || row.title || ''),
    fileUrl: String(row.file_url || row.fileUrl || '#'),
    status: status(row.status),
    extractedText: row.extracted_text || row.extractedText,
    extractedFindings: findings(row.extracted_findings || row.extractedFindings || row.metadata?.findings),
    linkedActions: Array.isArray(row.linked_actions) ? row.linked_actions.map(String) : row.linkedActions || [],
    linkedEvidence: Array.isArray(row.linked_evidence) ? row.linked_evidence.map(String) : row.linkedEvidence || [],
    regulation: row.regulation,
    reviewRequiredBy: row.review_required_by || row.reviewRequiredBy,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : []
  }
}

export async function getOsDocuments(): Promise<OsApiResult<HomeDocument[]>> {
  const result = await osGet<Record<string, any>[]>('/os/documents', [])
  return { ...result, data: result.data.map(mapOsDocument) }
}

export async function getOsDocument(id: string): Promise<OsApiResult<HomeDocument | undefined>> {
  const result = await osGet<Record<string, any> | undefined>(`/os/documents/${encodeURIComponent(id)}`, undefined)
  return { ...result, data: result.data ? mapOsDocument(result.data) : undefined }
}
