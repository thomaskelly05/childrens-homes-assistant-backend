import type { CareAction, CareActionStatus, ActionPriority } from '@/lib/evidence/types'

import { osGet, osPost } from './client'
import type { OsApiResult, OsTransitionPayload, OsTransitionResult } from './types'

function priority(value: unknown): ActionPriority {
  const normalised = String(value || 'medium') as ActionPriority
  return ['low', 'medium', 'high', 'urgent'].includes(normalised) ? normalised : 'medium'
}

function status(value: unknown): CareActionStatus {
  const normalised = String(value || 'open') as CareActionStatus
  return ['open', 'in_progress', 'completed', 'overdue', 'blocked'].includes(normalised) ? normalised : 'open'
}

export function mapOsAction(row: Record<string, any>): CareAction {
  return {
    id: String(row.id || row.original_id || ''),
    title: String(row.title || 'Action'),
    description: String(row.description || row.summary || ''),
    sourceType: String(row.source_type || row.sourceType || ''),
    sourceId: String(row.source_id || row.sourceId || row.original_id || ''),
    assignedToStaffId: String(row.assigned_to_staff_id || row.assignedToStaffId || ''),
    youngPersonId: row.young_person_id ? String(row.young_person_id) : row.youngPersonId,
    homeId: String(row.home_id || row.homeId || ''),
    dueDate: String(row.due_date || row.dueDate || ''),
    priority: priority(row.priority),
    status: status(row.status),
    regulation: row.regulation ? String(row.regulation) : undefined,
    evidenceRequired: Array.isArray(row.evidence_required) ? row.evidence_required.map(String) : row.evidenceRequired || [],
    evidenceIds: Array.isArray(row.evidence_ids) ? row.evidence_ids.map(String) : row.evidenceIds || [],
    createdAt: String(row.created_at || row.createdAt || ''),
    completedAt: row.completed_at ? String(row.completed_at) : row.completedAt
  }
}

export async function getOsActions(params: { status?: string; sourceType?: string; sourceId?: string } = {}): Promise<OsApiResult<CareAction[]>> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.sourceType) query.set('source_type', params.sourceType)
  if (params.sourceId) query.set('source_id', params.sourceId)
  const result = await osGet<Record<string, any>[]>(`/os/actions${query.toString() ? `?${query}` : ''}`, [])
  return { ...result, data: result.data.map(mapOsAction) }
}

export async function getOsAction(id: string): Promise<OsApiResult<CareAction | undefined>> {
  const result = await osGet<Record<string, any> | undefined>(`/os/actions/${encodeURIComponent(id)}`, undefined)
  return { ...result, data: result.data ? mapOsAction(result.data) : undefined }
}

export async function transitionOsAction(id: string, transition: string, payload: Partial<OsTransitionPayload> = {}) {
  return osPost<OsTransitionResult>(`/os/actions/${encodeURIComponent(id)}/${transition}`, payload, {
    entity_type: 'action',
    record_id: id,
    transition,
    status: transition === 'complete' ? 'completed' : 'open'
  })
}
