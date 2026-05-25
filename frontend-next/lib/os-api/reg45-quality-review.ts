'use client'

export type Reg45ReviewStatus =
  | 'draft'
  | 'evidence_gathering'
  | 'ready_for_manager_review'
  | 'manager_reviewed'
  | 'ri_review_required'
  | 'ri_reviewed'
  | 'finalised'
  | 'archived'

export type Reg45EvidenceStrength =
  | 'strong_evidence'
  | 'partial_evidence'
  | 'draft_only'
  | 'prompt_only'
  | 'route_hint_only'
  | 'not_yet_wired'
  | 'not_safe_to_summarise'

export type Reg45EvidenceRisk = 'low' | 'medium' | 'high' | 'urgent'

export type Reg45ReviewEvidenceItem = {
  id: string
  title: string
  safe_summary: string
  source_module: string
  route: string
  action_label?: string | null
  section_types?: string[]
  evidence_strength: Reg45EvidenceStrength
  risk: Reg45EvidenceRisk
  manager_review_required?: boolean
  safeguarding_review_required?: boolean
  metadata?: Record<string, unknown>
}

export type Reg45ReviewGap = {
  id: string
  title: string
  description: string
  section_type: string
  risk: Reg45EvidenceRisk
  route: string
  action_label?: string | null
  recommended_action: string
}

export type Reg45ImprovementActionDraft = {
  id: string
  title: string
  description: string
  source_gap_id?: string | null
  priority: string
  route: string
}

export type Reg45ReviewSection = {
  id: string
  title: string
  section_type: string
  summary: string
  evidence_items: Reg45ReviewEvidenceItem[]
  gaps: Reg45ReviewGap[]
  improvement_actions: Reg45ImprovementActionDraft[]
  warnings: string[]
}

export type Reg45QualityReview = {
  id: string
  title: string
  status: Reg45ReviewStatus
  generated_at: string
  period_start?: string | null
  period_end?: string | null
  summary: string
  sections: Reg45ReviewSection[]
  evidence_count: number
  gap_count: number
  draft_only_count: number
  improvement_action_count: number
  review_required_count: number
  safeguarding_review_count: number
  limitations: string[]
  privacy_notice: string
  orb_prompts: Array<{ label: string; mode: string; query: string }>
  routes: Record<string, string>
  metadata?: Record<string, unknown>
}

export type Reg45ReviewDashboard = {
  generated_at: string
  summary: string
  draft_review_count: number
  ready_for_manager_count: number
  ri_review_required_count: number
  recent_reviews: Array<Record<string, unknown>>
  key_gaps: Reg45ReviewGap[]
  recommendations: string[]
  privacy_notice: string
  routes: Record<string, string>
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

export function reg45ReviewOrbHref(mode: string, query: string): string {
  const params = new URLSearchParams({ mode, q: query })
  return `/assistant/orb?${params.toString()}`
}

export async function getReg45Health() {
  const response = await fetch('/api/reg45/health', { credentials: 'include', cache: 'no-store' })
  return parseEnvelope(response, { status: 'unavailable' })
}

export async function getReg45Dashboard() {
  const response = await fetch('/api/reg45/dashboard', { credentials: 'include', cache: 'no-store' })
  const empty: Reg45ReviewDashboard = {
    generated_at: '',
    summary: '',
    draft_review_count: 0,
    ready_for_manager_count: 0,
    ri_review_required_count: 0,
    recent_reviews: [],
    key_gaps: [],
    recommendations: [],
    privacy_notice: '',
    routes: {}
  }
  return parseEnvelope(response, empty)
}

export async function generateReg45Review(options?: {
  title?: string
  period_start?: string
  period_end?: string
  from_inspection_pack_id?: string
  save_draft?: boolean
  create_improvement_actions?: boolean
}) {
  const response = await fetch('/api/reg45/reviews/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      save_draft: true,
      create_improvement_actions: false,
      ...options
    })
  })
  const empty: Reg45QualityReview = {
    id: '',
    title: '',
    status: 'draft',
    generated_at: '',
    summary: '',
    sections: [],
    evidence_count: 0,
    gap_count: 0,
    draft_only_count: 0,
    improvement_action_count: 0,
    review_required_count: 0,
    safeguarding_review_count: 0,
    limitations: [],
    privacy_notice: '',
    orb_prompts: [],
    routes: {}
  }
  return parseEnvelope(response, empty)
}

export async function listReg45Reviews(limit = 20) {
  const response = await fetch(`/api/reg45/reviews?limit=${limit}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { reviews: [] as Array<Record<string, unknown>> })
}

export async function getReg45Review(reviewId: string) {
  const response = await fetch(`/api/reg45/reviews/${encodeURIComponent(reviewId)}`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, {} as Reg45QualityReview)
}

export async function updateReg45Review(
  reviewId: string,
  body: { status?: Reg45ReviewStatus; reviewer_notes?: string; metadata?: Record<string, unknown> }
) {
  const response = await fetch(`/api/reg45/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return parseEnvelope(response, {} as Reg45QualityReview)
}

export async function applyReg45ReviewAction(
  reviewId: string,
  action: string,
  note?: string
) {
  const response = await fetch(`/api/reg45/reviews/${encodeURIComponent(reviewId)}/action`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note })
  })
  return parseEnvelope(response, { success: false, warnings: [] })
}

export async function exportReg45Review(reviewId: string) {
  const response = await fetch(`/api/reg45/reviews/${encodeURIComponent(reviewId)}/export`, {
    credentials: 'include',
    cache: 'no-store'
  })
  return parseEnvelope(response, { markdown: '', disclaimer: '' })
}

export async function createReg45ActionsFromGaps(reviewId: string) {
  const response = await fetch(`/api/reg45/reviews/${encodeURIComponent(reviewId)}/create-actions`, {
    method: 'POST',
    credentials: 'include'
  })
  return parseEnvelope(response, { action_ids: [] as string[], warning: null as string | null })
}

export function exportReviewMarkdownClient(review: Reg45QualityReview): string {
  const lines = [`# ${review.title}`, '', review.summary, '']
  for (const section of review.sections) {
    lines.push(`## ${section.title}`, section.summary, '')
    for (const item of section.evidence_items) {
      lines.push(`- ${item.title}: ${item.safe_summary}`)
    }
    for (const gap of section.gaps) {
      lines.push(`- Potential gap: ${gap.title}`)
    }
  }
  lines.push('', 'Draft review — requires manager/provider review.')
  return lines.join('\n')
}
