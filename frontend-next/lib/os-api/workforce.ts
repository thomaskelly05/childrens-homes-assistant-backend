import { osGet, osPost, queryString } from './client'
import type { OsApiResult } from './types'

type UnknownRecord = Record<string, any>

export type WorkforceNavItem = {
  id: string
  label: string
  href: string
  enabled: boolean
  reason?: string | null
}

export type WorkforceStaff = {
  id: string
  title: string
  name?: string
  email?: string
  role?: string
  home_id?: string | number
  status?: string
  raw?: UnknownRecord
}

export type TrainingMatrixItem = {
  training_name: string
  status: 'completed' | 'due' | 'expired' | 'missing' | string
  mandatory?: boolean
  completion_date?: string | null
  expiry_date?: string | null
  evidence?: string | number | null
}

export type TrainingMatrixRow = {
  staff: WorkforceStaff
  role: string
  items: TrainingMatrixItem[]
}

export type WorkforceDashboard = {
  staff_count: number
  alerts: Array<{ id: string; label: string; count: number; severity: string }>
  training: { matrix: TrainingMatrixRow[]; summary: Record<string, number> }
  supervision: { records: UnknownRecord[]; reflective_prompts: string[]; workflow: string[]; actions: UnknownRecord[] }
  probation: { reviews: UnknownRecord[]; milestones: UnknownRecord[]; support_actions: UnknownRecord[] }
  evidence: { items: UnknownRecord[]; inspection_links: UnknownRecord; regulation_links: string[] }
  feature_flags: Record<string, boolean>
}

export type WorkforceProfile = {
  staff: WorkforceStaff
  overview: UnknownRecord
  employment: UnknownRecord
  dbs?: UnknownRecord | null
  right_to_work?: UnknownRecord | null
  references: UnknownRecord[]
  qualifications: UnknownRecord[]
  training: { matrix: TrainingMatrixRow[]; summary: Record<string, number> }
  supervision: { records: UnknownRecord[]; reflective_prompts: string[]; workflow: string[]; actions: UnknownRecord[] }
  probation: { reviews: UnknownRecord[]; milestones: UnknownRecord[]; support_actions: UnknownRecord[] }
  appraisals: UnknownRecord[]
  shift_history: UnknownRecord[]
  recording_history: UnknownRecord[]
  tasks: UnknownRecord[]
  wellbeing: UnknownRecord[]
  concerns: UnknownRecord[]
  evidence: UnknownRecord[]
  documents: UnknownRecord[]
  inspection_readiness: UnknownRecord
}

function object(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
}

function envelopeData<T>(value: unknown, fallback: T): T {
  const root = object(value)
  return (root.data ?? root.navigation ?? root.feature_flags ?? fallback) as T
}

export async function getWorkforceNavigation(): Promise<OsApiResult<{ modules: WorkforceNavItem[]; feature_flags: Record<string, boolean> }>> {
  const result = await osGet<UnknownRecord>('/api/workforce-os/navigation', {})
  return { ...result, data: envelopeData(result.data, { modules: [], feature_flags: {} }) }
}

export async function getWorkforceDashboard(): Promise<OsApiResult<WorkforceDashboard>> {
  const result = await osGet<UnknownRecord>('/api/workforce-os/dashboard', {})
  return {
    ...result,
    data: envelopeData(result.data, {
      staff_count: 0,
      alerts: [],
      training: { matrix: [], summary: {} },
      supervision: { records: [], reflective_prompts: [], workflow: [], actions: [] },
      probation: { reviews: [], milestones: [], support_actions: [] },
      evidence: { items: [], inspection_links: {}, regulation_links: [] },
      feature_flags: {}
    })
  }
}

export async function getWorkforceStaff(): Promise<OsApiResult<{ staff: WorkforceStaff[]; count: number }>> {
  const result = await osGet<UnknownRecord>('/api/workforce-os/staff', {})
  return { ...result, data: envelopeData(result.data, { staff: [], count: 0 }) }
}

export async function getWorkforceStaffProfile(staffId: string): Promise<OsApiResult<WorkforceProfile | null>> {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/staff/${encodeURIComponent(staffId)}/profile`, {})
  return { ...result, data: envelopeData(result.data, null) }
}

export async function getWorkforceTrainingMatrix(staffId?: string): Promise<OsApiResult<{ matrix: TrainingMatrixRow[]; summary: Record<string, number> }>> {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/training-matrix${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { matrix: [], summary: {} }) }
}

export async function getWorkforceInduction(staffId?: string) {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/induction${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { items: [], completed: 0, total: 0, completion_percent: null }) }
}

export async function getWorkforceProbation(staffId?: string) {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/probation${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { reviews: [], milestones: [], support_actions: [] }) }
}

export async function getWorkforceSupervision(staffId?: string) {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/supervision${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { records: [], reflective_prompts: [], workflow: [], actions: [] }) }
}

export async function createWorkforceSupervision(payload: unknown) {
  return osPost<UnknownRecord>('/api/workforce-os/supervision', payload, {})
}
