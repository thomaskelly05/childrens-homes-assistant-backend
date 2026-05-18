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
  intelligence?: WorkforceIntelligence | null
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
  intelligence?: WorkforceProfileIntelligence | null
}

export type WorkforceChronology = {
  events: UnknownRecord[]
  summary: { total: number; by_type: Record<string, number>; by_staff: Record<string, number>; latest_event_at?: string | null }
  inspection_threads?: string[]
}

export type WorkforceRecordingQuality = {
  records: UnknownRecord[]
  staff_scores: UnknownRecord[]
  home_trends: UnknownRecord
  concerns: UnknownRecord[]
  scoring_model: UnknownRecord
}

export type WorkforceRisk = {
  staff_risks: UnknownRecord[]
  home_health: UnknownRecord
  alerts: UnknownRecord[]
}

export type WorkforceRelationships = {
  indicators: UnknownRecord[]
  home_view: UnknownRecord
  child_views: Record<string, UnknownRecord[]>
  staff_views: Record<string, UnknownRecord[]>
}

export type WorkforceCommandCentre = {
  role_scope: string
  alerts: UnknownRecord[]
  practice_concerns: UnknownRecord[]
  wellbeing_alerts: UnknownRecord[]
  staffing_instability: UnknownRecord
  recognition: UnknownRecord[]
  inspection_readiness: UnknownRecord
}

export type WorkforceOrbContext = {
  workforce_summary: UnknownRecord
  evidence_sources: UnknownRecord[]
  assistant_prompts: string[]
}

export type WorkforceIntelligence = {
  chronology: WorkforceChronology
  recording_quality: WorkforceRecordingQuality
  risk: WorkforceRisk
  relationships: WorkforceRelationships
  command_centre: WorkforceCommandCentre
  orb_context: WorkforceOrbContext
}

export type WorkforceProfileIntelligence = Omit<WorkforceIntelligence, 'command_centre'>

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
      intelligence: null,
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

export async function getWorkforceIntelligence(): Promise<OsApiResult<WorkforceIntelligence>> {
  const result = await osGet<UnknownRecord>('/api/workforce-os/intelligence', {})
  return { ...result, data: envelopeData(result.data, emptyIntelligence()) }
}

export async function getWorkforceChronology(staffId?: string): Promise<OsApiResult<WorkforceChronology>> {
  const path = staffId ? `/api/workforce-os/staff/${encodeURIComponent(staffId)}/chronology` : '/api/workforce-os/chronology'
  const result = await osGet<UnknownRecord>(path, {})
  return { ...result, data: envelopeData(result.data, { events: [], summary: { total: 0, by_type: {}, by_staff: {} }, inspection_threads: [] }) }
}

export async function getWorkforceRecordingQuality(staffId?: string): Promise<OsApiResult<WorkforceRecordingQuality>> {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/recording-quality${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { records: [], staff_scores: [], home_trends: {}, concerns: [], scoring_model: {} }) }
}

export async function getWorkforceRisk(staffId?: string): Promise<OsApiResult<WorkforceRisk>> {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/risk${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { staff_risks: [], home_health: {}, alerts: [] }) }
}

export async function getWorkforceRelationships(staffId?: string): Promise<OsApiResult<WorkforceRelationships>> {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/relationships${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { indicators: [], home_view: {}, child_views: {}, staff_views: {} }) }
}

export async function getWorkforceCommandCentre(): Promise<OsApiResult<WorkforceCommandCentre>> {
  const result = await osGet<UnknownRecord>('/api/workforce-os/command-centre', {})
  return { ...result, data: envelopeData(result.data, { role_scope: 'self', alerts: [], practice_concerns: [], wellbeing_alerts: [], staffing_instability: {}, recognition: [], inspection_readiness: {} }) }
}

export async function getWorkforceOrbContext(staffId?: string): Promise<OsApiResult<WorkforceOrbContext>> {
  const result = await osGet<UnknownRecord>(`/api/workforce-os/orb-context${queryString({ staff_id: staffId })}`, {})
  return { ...result, data: envelopeData(result.data, { workforce_summary: {}, evidence_sources: [], assistant_prompts: [] }) }
}

function emptyIntelligence(): WorkforceIntelligence {
  return {
    chronology: { events: [], summary: { total: 0, by_type: {}, by_staff: {} }, inspection_threads: [] },
    recording_quality: { records: [], staff_scores: [], home_trends: {}, concerns: [], scoring_model: {} },
    risk: { staff_risks: [], home_health: {}, alerts: [] },
    relationships: { indicators: [], home_view: {}, child_views: {}, staff_views: {} },
    command_centre: { role_scope: 'self', alerts: [], practice_concerns: [], wellbeing_alerts: [], staffing_instability: {}, recognition: [], inspection_readiness: {} },
    orb_context: { workforce_summary: {}, evidence_sources: [], assistant_prompts: [] }
  }
}

export async function createWorkforceSupervision(payload: unknown) {
  return osPost<UnknownRecord>('/api/workforce-os/supervision', payload, {})
}
