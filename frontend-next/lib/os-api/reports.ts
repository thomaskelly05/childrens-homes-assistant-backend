import type { GeneratedReport, ReportTemplateId } from '@/lib/regulatory-reporting/types'

import { osGet, osPost } from './client'
import type { OsApiResult } from './types'

export type OsReport = {
  id: string
  title: string
  type: string
  status: string
  youngPersonId?: string
  homeId?: string
  dateRangeStart?: string
  dateRangeEnd?: string
  generatedBy?: string
  approvedBy?: string
  approvedAt?: string
  body?: string
  citations: Record<string, unknown>[]
  evidenceLinks: string[]
  reviewComments: Record<string, unknown>[]
  exportHistory: Record<string, unknown>[]
  version: number
}

export function mapOsReport(row: Record<string, any>): OsReport {
  return {
    id: String(row.id || row.original_id || ''),
    title: String(row.title || 'Report draft'),
    type: String(row.type || row.report_type || 'report'),
    status: String(row.status || 'draft'),
    youngPersonId: row.young_person_id ? String(row.young_person_id) : row.youngPersonId,
    homeId: row.home_id ? String(row.home_id) : row.homeId,
    dateRangeStart: row.date_range_start || row.dateRangeStart,
    dateRangeEnd: row.date_range_end || row.dateRangeEnd,
    generatedBy: row.generated_by ? String(row.generated_by) : row.generatedBy,
    approvedBy: row.approved_by ? String(row.approved_by) : row.approvedBy,
    approvedAt: row.approved_at || row.approvedAt,
    body: row.body,
    citations: Array.isArray(row.citations) ? row.citations : [],
    evidenceLinks: Array.isArray(row.evidence_links) ? row.evidence_links.map(String) : row.evidenceLinks || [],
    reviewComments: Array.isArray(row.review_comments) ? row.review_comments : row.reviewComments || [],
    exportHistory: Array.isArray(row.export_history) ? row.export_history : row.exportHistory || [],
    version: Number(row.version || 1)
  }
}

export async function getOsReports(): Promise<OsApiResult<OsReport[]>> {
  const result = await osGet<Record<string, any>[]>('/os/reports', [])
  const rows = Array.isArray(result.data) ? result.data : []
  return {
    ...result,
    source: Array.isArray(result.data) ? result.source : 'unavailable',
    error: Array.isArray(result.data) ? result.error : 'No records found yet.',
    data: rows.map(mapOsReport)
  }
}

export async function getOsReport(id: string): Promise<OsApiResult<OsReport | undefined>> {
  const result = await osGet<Record<string, any> | undefined>(`/os/reports/${encodeURIComponent(id)}`, undefined)
  return { ...result, data: result.data ? mapOsReport(result.data) : undefined }
}

export async function generateOsReport(templateId: ReportTemplateId, homeId: string, youngPersonId?: string): Promise<OsApiResult<GeneratedReport | Record<string, unknown>>> {
  return osPost('/os/reports/generate', { report_type: templateId, home_id: homeId, young_person_id: youngPersonId }, {})
}
