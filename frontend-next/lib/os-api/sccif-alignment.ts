'use client'

export type SccifJudgementArea =
  | 'overall_experiences_progress'
  | 'helped_and_protected'
  | 'leadership_management'

export type QualityStandardArea =
  | 'quality_purpose'
  | 'views_wishes_feelings'
  | 'education'
  | 'enjoyment_achievement'
  | 'health_wellbeing'
  | 'positive_relationships'
  | 'protection_children'
  | 'leadership_management'
  | 'care_planning'

export type EvidenceStrength =
  | 'strong_evidence'
  | 'partial_evidence'
  | 'prompt_only'
  | 'route_hint_only'
  | 'not_yet_wired'
  | 'not_safe_to_summarise'

export type EvidenceRisk = 'low' | 'medium' | 'high' | 'urgent'

export type SccifEvidenceItem = {
  id: string
  title: string
  safe_summary: string
  source_module: string
  route: string
  action_label?: string | null
  judgement_areas: SccifJudgementArea[]
  quality_standards: QualityStandardArea[]
  evidence_strength: EvidenceStrength
  risk: EvidenceRisk
  child_id?: number | null
  staff_id?: string | null
  home_id?: number | null
  related_id?: string | null
  related_type?: string | null
  draft_status?: string | null
  review_required?: boolean
  manager_review_required?: boolean
  safeguarding_review_required?: boolean
  privacy_sensitive?: boolean
  official_source_refs?: Array<{ id: string; title: string; url?: string | null }>
  metadata?: Record<string, unknown>
}

export type SccifEvidenceGap = {
  id: string
  title: string
  description: string
  judgement_area?: SccifJudgementArea | null
  quality_standard?: QualityStandardArea | null
  risk: EvidenceRisk
  route: string
  action_label?: string | null
  recommended_action: string
  metadata?: Record<string, unknown>
}

export type SccifJudgementSummary = {
  area: SccifJudgementArea
  title: string
  evidence_count: number
  gap_count: number
  strong_count: number
  partial_count: number
  draft_or_prompt_count: number
  manager_review_count: number
  safeguarding_count: number
  safe_summary: string
  route: string
  evidence_strength: EvidenceStrength
}

export type SccifQualityStandardSummary = {
  area: QualityStandardArea
  title: string
  regulation_hint?: string | null
  evidence_count: number
  gap_count: number
  strong_count: number
  partial_count: number
  draft_or_prompt_count: number
  safe_summary: string
  route: string
  evidence_strength: EvidenceStrength
}

export type SccifAlignmentDashboard = {
  generated_at: string
  scope: Record<string, unknown>
  summary: string
  judgement_summary: SccifJudgementSummary[]
  quality_standard_summary: SccifQualityStandardSummary[]
  evidence_items: SccifEvidenceItem[]
  evidence_gaps: SccifEvidenceGap[]
  recommendations: string[]
  limitations: string[]
  official_sources: Array<{ id: string; title: string; url?: string | null; note?: string | null }>
  privacy_notice: string
  orb_prompts: Array<{ label: string; mode: string; query: string }>
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

export type SccifAlignmentFilters = {
  child_id?: number
  staff_id?: string
  home_id?: number
  judgement_area?: SccifJudgementArea
  quality_standard?: QualityStandardArea
  evidence_strength?: EvidenceStrength
  risk?: EvidenceRisk
  limit?: number
}

function queryString(filters?: SccifAlignmentFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.child_id != null) params.set('child_id', String(filters.child_id))
  if (filters.staff_id) params.set('staff_id', filters.staff_id)
  if (filters.home_id != null) params.set('home_id', String(filters.home_id))
  if (filters.judgement_area) params.set('judgement_area', filters.judgement_area)
  if (filters.quality_standard) params.set('quality_standard', filters.quality_standard)
  if (filters.evidence_strength) params.set('evidence_strength', filters.evidence_strength)
  if (filters.risk) params.set('risk', filters.risk)
  if (filters.limit != null) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
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

export function sccifAlignmentOrbHref(mode: string, query: string): string {
  const params = new URLSearchParams({ mode, q: query })
  return `/assistant/orb?${params.toString()}`
}

export async function getSccifAlignmentHealth() {
  const response = await fetch('/api/sccif-alignment/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, { status: 'unavailable' })
}

export async function getSccifAlignmentDashboard(filters?: SccifAlignmentFilters) {
  const response = await fetch(`/api/sccif-alignment/dashboard${queryString(filters)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  const empty: SccifAlignmentDashboard = {
    generated_at: '',
    scope: {},
    summary: '',
    judgement_summary: [],
    quality_standard_summary: [],
    evidence_items: [],
    evidence_gaps: [],
    recommendations: [],
    limitations: [],
    official_sources: [],
    privacy_notice: '',
    orb_prompts: [],
    routes: {}
  }
  return parseEnvelope(response, empty)
}

export async function getSccifJudgements() {
  const response = await fetch('/api/sccif-alignment/judgements', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, { judgement_areas: [], disclaimer: '' })
}

export async function getQualityStandards() {
  const response = await fetch('/api/sccif-alignment/quality-standards', {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { quality_standards: [], disclaimer: '' })
}

export async function getSccifEvidence(filters?: SccifAlignmentFilters) {
  const response = await fetch(`/api/sccif-alignment/evidence${queryString(filters)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, [] as SccifEvidenceItem[])
}

export async function getSccifGaps(filters?: Pick<SccifAlignmentFilters, 'child_id' | 'staff_id' | 'home_id'>) {
  const response = await fetch(`/api/sccif-alignment/gaps${queryString(filters)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, [] as SccifEvidenceGap[])
}
