'use client'

export type WorkforceContextItem = {
  id: string
  title: string
  safe_summary: string
  source: string
  route: string
  action_label?: string | null
  sensitivity?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  staff_id?: number | null
  staff_name?: string | null
  role?: string | null
  metadata?: Record<string, unknown>
}

export type ShiftContextSummary = {
  shift_id?: string | null
  shift_label: string
  home_id?: number | null
  shift_lead_name?: string | null
  shift_lead_id?: number | null
  staff_count: number
  staff_on_shift: string[]
  gaps: string[]
  warnings: string[]
  route: string
  metadata?: Record<string, unknown>
}

export type WorkforceContextDashboard = {
  generated_at: string
  scope: { type: string; home_id?: number | null; shift_id?: string | null; staff_id?: number | null }
  shift: ShiftContextSummary
  staff_on_shift: WorkforceContextItem[]
  actions: WorkforceContextItem[]
  training: WorkforceContextItem[]
  supervision: WorkforceContextItem[]
  wellbeing: WorkforceContextItem[]
  staffing_risks: WorkforceContextItem[]
  recommendations: string[]
  privacy_notice: string
  limitations: string[]
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

type ApiResult<T> = { ok: boolean; data: T; error?: string }

async function workforceFetch<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, { credentials: 'include', cache: 'no-store' })
    if (!response.ok) {
      return { ok: false, data: {} as T, error: `HTTP ${response.status}` }
    }
    const payload = await response.json()
    return { ok: true, data: (payload.data ?? payload) as T }
  } catch (error) {
    return { ok: false, data: {} as T, error: String(error) }
  }
}

export function workforceOrbHref(mode: string, query: string): string {
  const params = new URLSearchParams({ mode })
  if (query.trim()) {
    params.set('q', query.trim())
  }
  return `/assistant/orb?${params.toString()}`
}

export function getWorkforceContextHealth() {
  return workforceFetch<{ status: string; metadata_only?: boolean }>('/api/workforce/context/health')
}

export function getWorkforceDashboard() {
  return workforceFetch<WorkforceContextDashboard>('/api/workforce/context/dashboard')
}

export function getShiftContext() {
  return workforceFetch<{ shift: ShiftContextSummary; staff_on_shift: WorkforceContextItem[] }>(
    '/api/workforce/context/shift'
  )
}

export function getWorkforceActions() {
  return workforceFetch<{ items: WorkforceContextItem[] }>('/api/workforce/context/actions')
}

export function getWorkforceTrainingIndicators() {
  return workforceFetch<{ items: WorkforceContextItem[] }>('/api/workforce/context/training')
}

export function getWorkforceSupervisionIndicators() {
  return workforceFetch<{ items: WorkforceContextItem[] }>('/api/workforce/context/supervision')
}
