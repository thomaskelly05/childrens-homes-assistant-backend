'use client'

export type InspectionPackType = 'reg44' | 'reg45' | 'sccif' | 'quality_standards' | 'custom'

export type InspectionEvidenceStrength =
  | 'strong_evidence'
  | 'partial_evidence'
  | 'draft_only'
  | 'prompt_only'
  | 'route_hint_only'
  | 'not_yet_wired'
  | 'not_safe_to_summarise'

export type InspectionEvidenceRisk = 'low' | 'medium' | 'high' | 'urgent'

export type InspectionEvidenceItem = {
  id: string
  title: string
  safe_summary: string
  source_module: string
  source_type?: string
  route: string
  action_label?: string | null
  pack_types?: InspectionPackType[]
  evidence_strength: InspectionEvidenceStrength
  risk: InspectionEvidenceRisk
  draft_status?: string | null
  review_required?: boolean
  manager_review_required?: boolean
  safeguarding_review_required?: boolean
  metadata?: Record<string, unknown>
}

export type InspectionEvidenceGap = {
  id: string
  title: string
  description: string
  pack_type: InspectionPackType
  risk: InspectionEvidenceRisk
  route: string
  action_label?: string | null
  recommended_action: string
}

export type InspectionPackSection = {
  id: string
  title: string
  summary: string
  pack_type: InspectionPackType
  evidence_items: InspectionEvidenceItem[]
  gaps: InspectionEvidenceGap[]
  recommendations: string[]
  warnings: string[]
}

export type InspectionEvidencePack = {
  id: string
  title: string
  pack_type: InspectionPackType
  generated_at: string
  period_start?: string | null
  period_end?: string | null
  scope: Record<string, unknown>
  summary: string
  sections: InspectionPackSection[]
  evidence_count: number
  gap_count: number
  urgent_gap_count: number
  review_required_count: number
  draft_only_count: number
  limitations: string[]
  privacy_notice: string
  official_sources: Array<{ id: string; title: string; url?: string | null; note?: string | null }>
  orb_prompts: Array<{ label: string; mode: string; query: string }>
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

export type InspectionReadinessDashboard = {
  generated_at: string
  summary: string
  reg44_summary: string
  reg45_summary: string
  sccif_summary: string
  quality_standards_summary: string
  recent_packs: Array<Record<string, unknown>>
  key_gaps: InspectionEvidenceGap[]
  recommendations: string[]
  limitations: string[]
  privacy_notice: string
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

export type InspectionReadinessFilters = {
  pack_type?: InspectionPackType
  child_id?: number
  staff_id?: string
  home_id?: number
  period_start?: string
  period_end?: string
  limit?: number
}

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string }

async function parseEnvelope<T>(response: Response, fallback: T): Promise<{ data: T; ok: boolean; error?: string }> {
  if (!response.ok) {
    return { data: fallback, ok: false, error: `HTTP ${response.status}` }
  }
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | T
  const envelope = payload as ApiEnvelope<T>
  return {
    data: envelope && typeof envelope === 'object' && 'data' in envelope ? (envelope.data as T) : (payload as T),
    ok: true
  }
}

function queryString(filters?: InspectionReadinessFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.child_id != null) params.set('child_id', String(filters.child_id))
  if (filters.staff_id) params.set('staff_id', filters.staff_id)
  if (filters.home_id != null) params.set('home_id', String(filters.home_id))
  if (filters.period_start) params.set('period_start', filters.period_start)
  if (filters.period_end) params.set('period_end', filters.period_end)
  if (filters.limit != null) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function inspectionReadinessOrbHref(mode: string, query: string): string {
  const params = new URLSearchParams({ mode, q: query })
  return `/assistant/orb?${params.toString()}`
}

export async function getInspectionReadinessHealth() {
  const response = await fetch('/api/inspection-readiness/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, { status: 'unavailable' })
}

export async function getInspectionReadinessDashboard(filters?: InspectionReadinessFilters) {
  const response = await fetch(`/api/inspection-readiness/dashboard${queryString(filters)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  const empty: InspectionReadinessDashboard = {
    generated_at: '',
    summary: '',
    reg44_summary: '',
    reg45_summary: '',
    sccif_summary: '',
    quality_standards_summary: '',
    recent_packs: [],
    key_gaps: [],
    recommendations: [],
    limitations: [],
    privacy_notice: '',
    routes: {}
  }
  return parseEnvelope(response, empty)
}

export async function generateInspectionPack(
  packType: InspectionPackType,
  options?: { period_start?: string; period_end?: string }
) {
  const response = await fetch('/api/inspection-readiness/packs/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pack_type: packType, ...options })
  })
  const empty: InspectionEvidencePack = {
    id: '',
    title: '',
    pack_type: packType,
    generated_at: '',
    scope: {},
    summary: '',
    sections: [],
    evidence_count: 0,
    gap_count: 0,
    urgent_gap_count: 0,
    review_required_count: 0,
    draft_only_count: 0,
    limitations: [],
    privacy_notice: '',
    official_sources: [],
    orb_prompts: [],
    routes: {}
  }
  return parseEnvelope(response, empty)
}

export async function getReg44Pack(filters?: InspectionReadinessFilters) {
  const response = await fetch(`/api/inspection-readiness/packs/reg44${queryString(filters)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, {} as InspectionEvidencePack)
}

export async function getReg45Pack(filters?: InspectionReadinessFilters) {
  const response = await fetch(`/api/inspection-readiness/packs/reg45${queryString(filters)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, {} as InspectionEvidencePack)
}

export async function getSccifPack() {
  const response = await fetch('/api/inspection-readiness/packs/sccif', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, {} as InspectionEvidencePack)
}

export async function getQualityStandardsPack() {
  const response = await fetch('/api/inspection-readiness/packs/quality-standards', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, {} as InspectionEvidencePack)
}

export async function saveInspectionPack(body: {
  pack_type: InspectionPackType
  pack?: InspectionEvidencePack
  save_output?: boolean
  create_actions_from_gaps?: boolean
  title?: string
}) {
  const response = await fetch('/api/inspection-readiness/packs/save', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return parseEnvelope(response, { success: false, pack: body.pack, warnings: [], action_ids: [], next_steps: [] })
}

export async function listInspectionPacks(limit = 20) {
  const response = await fetch(`/api/inspection-readiness/packs/history?limit=${limit}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { packs: [] as Array<Record<string, unknown>> })
}

export async function getInspectionPack(packId: string) {
  const response = await fetch(`/api/inspection-readiness/packs/${encodeURIComponent(packId)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, {} as InspectionEvidencePack)
}

export function exportPackMarkdown(pack: InspectionEvidencePack): string {
  const lines = [`# ${pack.title}`, '', pack.summary, '']
  for (const section of pack.sections) {
    lines.push(`## ${section.title}`, section.summary, '')
    for (const item of section.evidence_items) {
      const draft = item.evidence_strength === 'draft_only' || item.evidence_strength === 'prompt_only' ? ' (Draft-only)' : ''
      lines.push(`- ${item.title}${draft}: ${item.safe_summary}`)
    }
    for (const gap of section.gaps) {
      lines.push(`- Potential gap: ${gap.title}`)
    }
  }
  return lines.join('\n')
}
