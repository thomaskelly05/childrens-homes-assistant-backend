'use client'

type ApiResult<T> = { ok: boolean; data: T; error?: string }

export type StaffProfileOsItem = {
  id: string
  title: string
  safe_summary: string
  section_type: string
  sensitivity?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  route: string
  action_label?: string | null
  related_id?: string | null
  related_type?: string | null
  due_at?: string | null
  status?: string | null
  metadata?: Record<string, unknown>
}

export type StaffProfileOsSection = {
  id: string
  title: string
  section_type: string
  summary: string
  items: StaffProfileOsItem[]
  warnings?: string[]
  route: string
  action_label?: string | null
  metadata?: Record<string, unknown>
}

export type StaffProfileOsOverview = {
  staff_id: number
  staff_name: string
  role?: string | null
  home_id?: number | null
  home_name?: string | null
  employment_status?: string | null
  shift_label?: string | null
  shift_role?: string | null
  profile_route: string
  avatar_url?: string | null
  badges: string[]
  warnings: string[]
  metadata?: Record<string, unknown>
}

export type StaffProfileOsDashboard = {
  generated_at: string
  staff_id: number
  overview: StaffProfileOsOverview
  sections: StaffProfileOsSection[]
  action_count: number
  training_due_count: number
  supervision_due_count: number
  probation_review_count: number
  wellbeing_flags_count: number
  handover_items_count: number
  recommendations: string[]
  privacy_notice: string
  limitations: string[]
  orb_prompts: Array<{ label: string; mode: string; query: string }>
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

async function staffProfileOsFetch<T>(path: string): Promise<ApiResult<T>> {
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

export function staffProfileOrbHref(mode: string, query: string): string {
  const params = new URLSearchParams({ mode })
  if (query.trim()) {
    params.set('q', query.trim())
  }
  return `/assistant/orb?${params.toString()}`
}

export function getStaffProfileOsHealth() {
  return staffProfileOsFetch<{ status: string; metadata_only?: boolean; service?: string }>(
    '/api/staff-profile-os/health'
  )
}

export function getStaffProfileOsDashboard(staffId: string) {
  return staffProfileOsFetch<StaffProfileOsDashboard>(
    `/api/staff-profile-os/${encodeURIComponent(staffId)}`
  )
}

export function getStaffProfileOsOverview(staffId: string) {
  return staffProfileOsFetch<StaffProfileOsOverview>(
    `/api/staff-profile-os/${encodeURIComponent(staffId)}/overview`
  )
}

export function getStaffProfileOsActions(staffId: string) {
  return staffProfileOsFetch<StaffProfileOsSection>(
    `/api/staff-profile-os/${encodeURIComponent(staffId)}/actions`
  )
}

export function getStaffProfileOsTraining(staffId: string) {
  return staffProfileOsFetch<StaffProfileOsSection>(
    `/api/staff-profile-os/${encodeURIComponent(staffId)}/training`
  )
}

export function getStaffProfileOsSupervision(staffId: string) {
  return staffProfileOsFetch<StaffProfileOsSection>(
    `/api/staff-profile-os/${encodeURIComponent(staffId)}/supervision`
  )
}

export function getStaffProfileOsWellbeing(staffId: string) {
  return staffProfileOsFetch<StaffProfileOsSection>(
    `/api/staff-profile-os/${encodeURIComponent(staffId)}/wellbeing`
  )
}
