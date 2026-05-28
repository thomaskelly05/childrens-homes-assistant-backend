import { authFetch, AuthApiError } from '@/lib/auth/api'
import type { OsApiResult } from '@/lib/os-api/types'

export type OrbOperationalMode =
  | 'chronology_story_review'
  | 'archive_summary'
  | 'lifeecho_memory_support'
  | 'plan_impact_review'
  | 'document_target_extraction'
  | 'operational_summary'
  | 'manager_daily_brief'
  | 'record_quality_review'
  | 'recording_live_coach'
  | 'safeguarding_themes'
  | 'ofsted_evidence_review'
  | 'action_priority'
  | 'staff_support'
  | 'child_journey_summary'
  | 'governance_briefing'
  | 'general_operational_question'

export type OrbOperationalScope = 'home' | 'child' | 'staff' | 'provider' | 'current_user'

export type OrbOperationalRequest = {
  message: string
  mode?: OrbOperationalMode
  scope?: OrbOperationalScope
  home_id?: number | null
  child_id?: number | null
  staff_id?: number | null
  days?: number
  include_actions?: boolean
  include_record_quality?: boolean
  include_patterns?: boolean
  require_manager_review?: boolean
  save_output?: boolean
  output_type?: OrbOperationalOutputType | null
  visibility?: string
  tags?: string[]
  output_title?: string | null
  /** Recording workspace context — never includes full draft body. */
  form_id?: string | null
  form_title?: string | null
  recording_type?: string | null
  selected_excerpt?: string | null
  high_level_flags?: string[]
}

export type OrbOperationalSource = {
  label: string
  source_type: string
  basis?: string | null
  route?: string | null
  excerpt?: string | null
}

export type OrbOperationalContextSummary = {
  headline?: string
  summary_lines?: string[]
  themes?: string[]
  attention_items?: string[]
  record_quality_notes?: string[]
  safeguarding_signals?: string[]
  ofsted_evidence_notes?: string[]
  staff_support_notes?: string[]
  child_journey_notes?: string[]
  governance_notes?: string[]
  degraded?: boolean
  unavailable?: boolean
  permission_warnings?: string[]
}

export type OrbOperationalPermissionSummary = {
  role?: string | null
  allowed_home_ids?: number[]
  home_id?: number | null
  provider_id?: number | null
  care_record_access?: boolean
  scope_resolved?: string | null
}

export type OrbOperationalIntelligenceOutput = {
  id?: string
  title?: string
  summary?: string
  sources?: Array<Record<string, unknown>>
  citations?: Array<Record<string, unknown>>
  model_routing?: Record<string, unknown>
  quality?: Record<string, unknown>
  os_linked?: boolean
  care_record_access?: boolean
  standalone_only?: boolean
}

export type OrbOperationalContextCard = {
  id: string
  title: string
  type: string
  summary: string
  severity?: string
  source_label?: string | null
  route_hint?: string | null
  count?: number | null
  metadata?: Record<string, unknown>
}

export type OrbOperationalEvidenceItem = {
  id: string
  label: string
  source_type: string
  basis?: string | null
  route?: string | null
  severity?: string
}

export type OrbOperationalRecommendation = {
  id: string
  title: string
  summary: string
  priority?: string
  rationale?: string | null
  source_labels?: string[]
  suggested_action?: string | null
  review_required?: boolean
  manager_review_reason?: string | null
  route_hint?: string | null
}

export type OrbOperationalDraftAction = {
  title: string
  description: string
  priority?: string
  source?: string | null
  due_label?: string | null
  owner_label?: string | null
  review_required?: boolean
  evidence_basis?: string | null
  standalone_only?: boolean
  os_linked?: boolean
}

export type OrbOperationalBriefing = {
  title: string
  summary: string
  key_points?: string[]
  risks?: string[]
  actions?: string[]
  sources?: string[]
  citations?: Array<Record<string, unknown>>
  created_from_mode?: string | null
  context_scope?: string | null
  saved_as_output_id?: string | null
}

export type OrbOperationalReviewPrompt = {
  id: string
  title: string
  reason: string
  priority?: string
  route_hint?: string | null
}

export type OrbOperationalAuditSummary = {
  audit_reference?: string | null
  role?: string | null
  scope?: string | null
  permissioned_context?: boolean
  care_record_access?: boolean
  boundary_notice?: string | null
}

export type OrbOperationalContextStatus = {
  available?: boolean
  degraded?: boolean
  unavailable?: boolean
  care_record_access?: boolean
  homes_accessible?: number | null
  message?: string | null
  permission_warnings?: string[]
}

export type OrbOperationalOutputType =
  | 'manager_briefing'
  | 'safeguarding_theme_review'
  | 'record_quality_review'
  | 'ofsted_evidence_briefing'
  | 'action_priority_plan'
  | 'staff_support_briefing'
  | 'child_journey_summary'
  | 'governance_briefing'
  | 'handover_intelligence'
  | 'inspection_preparation'
  | 'operational_note'

export type OrbOperationalOutputSummary = {
  id: string
  title: string
  type: OrbOperationalOutputType
  status: string
  review_status: string
  visibility: string
  home_id?: number | null
  child_id?: number | null
  scope_label?: string | null
  summary?: string | null
  tags?: string[]
  linked_action_count?: number
  created_by_name?: string | null
  created_at: string
  updated_at: string
}

export type OrbOperationalOutputRecord = OrbOperationalOutputSummary & {
  staff_id?: number | null
  content_markdown?: string | null
  content_json?: Record<string, unknown>
  intelligence_output?: Record<string, unknown>
  context_cards?: Array<Record<string, unknown>>
  evidence_items?: Array<Record<string, unknown>>
  recommendations?: Array<Record<string, unknown>>
  draft_actions?: Array<Record<string, unknown>>
  review_prompts?: Array<Record<string, unknown>>
  sources?: Array<Record<string, unknown>>
  citations?: Array<Record<string, unknown>>
  evaluation?: Record<string, unknown>
  model_routing?: Record<string, unknown>
  audit_reference?: string | null
  linked_action_ids?: string[]
  linked_review_ids?: string[]
  metadata?: Record<string, unknown>
}

export const OPERATIONAL_ARTEFACT_NOTICE =
  'Saved operational outputs are OS-linked artefacts. They are not standalone ORB saved outputs.'

export type OrbOperationalPrivacyGuardSummary = {
  decision: string
  allowed: boolean
  redaction_applied?: boolean
  minimisation_applied?: boolean
  manager_review_required?: boolean
  safeguarding_review_required?: boolean
  model_send_allowed?: boolean
  blocked_fields?: string[]
  warnings?: string[]
  privacy_notice?: string
  audit_event_id?: string | null
}

export type OrbOperationalResponse = {
  answer: string
  intelligence_output?: OrbOperationalIntelligenceOutput | null
  context_summary: OrbOperationalContextSummary
  sources: OrbOperationalSource[]
  citations?: Array<Record<string, unknown>>
  evaluation?: Record<string, unknown> | null
  model_routing?: Record<string, unknown> | null
  permissions: OrbOperationalPermissionSummary
  boundaries?: {
    permissioned_context_only?: boolean
    manager_review_required?: boolean
    notices?: string[]
  }
  warnings?: string[]
  audit_reference?: string | null
  os_linked: boolean
  care_record_access: boolean
  standalone_only: boolean
  permissioned_context: boolean
  context_cards?: OrbOperationalContextCard[]
  evidence_items?: OrbOperationalEvidenceItem[]
  recommendations?: OrbOperationalRecommendation[]
  draft_actions?: OrbOperationalDraftAction[]
  review_prompts?: OrbOperationalReviewPrompt[]
  audit_summary?: OrbOperationalAuditSummary | null
  context_status?: OrbOperationalContextStatus | null
  follow_up_actions?: Array<{ label: string; route?: string | null; action_type?: string }>
  briefing?: OrbOperationalBriefing | null
  save_available?: boolean
  suggested_output_type?: OrbOperationalOutputType | null
  suggested_title?: string | null
  suggested_tags?: string[]
  privacy_guard?: OrbOperationalPrivacyGuardSummary | null
  operational_output?: {
    available?: boolean
    saved?: boolean
    output_id?: string | null
    type?: string | null
    review_status?: string | null
    visibility?: string | null
  } | null
  action_creation_available?: boolean
}

export type OrbOperationalHealth = {
  status: string
  surface: string
  os_linked: boolean
  care_record_access: boolean
  standalone_only: boolean
  permissioned_context: boolean
  modes: string[]
  scopes: string[]
}

function unavailable(message: string): OsApiResult<OrbOperationalResponse> {
  return {
    source: 'unavailable',
    warning: message,
    data: {
      answer:
        "Operational ORB could not be reached. No operational conclusion has been made. Please use Care Hub or Intelligence Spine for live review.",
      context_summary: {
        unavailable: true,
        headline: 'Operational ORB unavailable',
        permission_warnings: [message]
      },
      sources: [],
      permissions: { care_record_access: false },
      os_linked: true,
      care_record_access: false,
      standalone_only: false,
      permissioned_context: true
    }
  }
}

async function postOperational<T>(path: string, body: unknown, signal?: AbortSignal): Promise<OsApiResult<T>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data: T }>(path, {
      method: 'POST',
      signal,
      body: JSON.stringify(body)
    })
    const data = (envelope as { data?: T }).data ?? (envelope as unknown as T)
    return { data, source: 'live' }
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 401) {
        return unavailable('Your session has expired. Please sign in again.') as OsApiResult<T>
      }
      if (error.status === 403) {
        return unavailable('You do not have permission to use operational ORB.') as OsApiResult<T>
      }
      return unavailable(error.message) as OsApiResult<T>
    }
    return unavailable(error instanceof Error ? error.message : 'Operational ORB unavailable.') as OsApiResult<T>
  }
}

export async function sendOperationalOrbMessage(
  request: OrbOperationalRequest,
  signal?: AbortSignal
): Promise<OsApiResult<OrbOperationalResponse>> {
  return postOperational<OrbOperationalResponse>('/api/assistant/orb/operational', request, signal)
}

export async function sendOperationalOrbConversation(
  request: OrbOperationalRequest,
  signal?: AbortSignal
): Promise<OsApiResult<OrbOperationalResponse>> {
  return postOperational<OrbOperationalResponse>('/api/assistant/orb/conversation', request, signal)
}

export async function getOperationalOrbHealth(signal?: AbortSignal): Promise<OsApiResult<OrbOperationalHealth>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data: OrbOperationalHealth }>(
      '/api/assistant/orb/health',
      { signal }
    )
    const data =
      (envelope as { data?: OrbOperationalHealth }).data ??
      (envelope as unknown as OrbOperationalHealth)
    return { data, source: 'live' }
  } catch (error) {
    return {
      source: 'unavailable',
      warning: error instanceof Error ? error.message : 'Health check failed',
      data: {
        status: 'unavailable',
        surface: 'operational_os_orb',
        os_linked: true,
        care_record_access: false,
        standalone_only: false,
        permissioned_context: true,
        modes: [],
        scopes: []
      }
    }
  }
}

export async function getOperationalContextSummary(
  request: OrbOperationalRequest,
  signal?: AbortSignal
): Promise<OsApiResult<{ context_summary: OrbOperationalContextSummary; sources: OrbOperationalSource[] }>> {
  return postOperational('/api/assistant/orb/context-summary', request, signal)
}

export async function draftOperationalActions(
  request: OrbOperationalRequest & { answer?: string | null },
  signal?: AbortSignal
): Promise<OsApiResult<{ draft_actions: OrbOperationalDraftAction[] }>> {
  return postOperational('/api/assistant/orb/actions/draft', request, signal)
}

export async function createOperationalActions(
  drafts: OrbOperationalDraftAction[],
  scope?: {
    home_id?: number | null
    child_id?: number | null
    staff_id?: number | null
    output_id?: string | null
  },
  signal?: AbortSignal
): Promise<OsApiResult<{ created_ids: string[]; errors?: string[]; notice?: string; linked_output_id?: string }>> {
  return postOperational(
    '/api/assistant/orb/actions/create',
    { drafts, require_manager_review: true, ...scope },
    signal
  )
}

export async function createOperationalBriefing(
  request: OrbOperationalRequest & { answer?: string | null },
  signal?: AbortSignal
): Promise<OsApiResult<OrbOperationalResponse>> {
  return postOperational('/api/assistant/orb/briefing', request, signal)
}

export async function saveOperationalBriefing(
  request: OrbOperationalRequest & {
    answer?: string | null
    save?: boolean
    title?: string | null
    output_type?: OrbOperationalOutputType | null
  },
  signal?: AbortSignal
): Promise<OsApiResult<OrbOperationalResponse>> {
  return postOperational('/api/assistant/orb/briefing', { ...request, save: true }, signal)
}

async function fetchOperational<T>(path: string, init?: RequestInit): Promise<T> {
  const envelope = await authFetch<{ success?: boolean; data: T }>(path, init)
  return (envelope as { data?: T }).data ?? (envelope as unknown as T)
}

export async function listOperationalOutputs(params: {
  search?: string
  output_type?: string
  status?: string
  review_status?: string
  awaiting_review_only?: boolean
  limit?: number
}): Promise<{ items: OrbOperationalOutputSummary[]; total: number }> {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.output_type) query.set('output_type', params.output_type)
  if (params.status) query.set('status', params.status)
  if (params.review_status) query.set('review_status', params.review_status)
  if (params.awaiting_review_only) query.set('awaiting_review_only', 'true')
  if (params.limit) query.set('limit', String(params.limit))
  const data = await fetchOperational<{ items: OrbOperationalOutputSummary[]; total: number }>(
    `/api/assistant/orb/outputs?${query.toString()}`
  )
  return data
}

export async function getOperationalOutput(outputId: string): Promise<OrbOperationalOutputRecord | null> {
  try {
    return await fetchOperational<OrbOperationalOutputRecord>(`/api/assistant/orb/outputs/${outputId}`)
  } catch {
    return null
  }
}

export async function exportOperationalOutput(
  outputId: string,
  format: 'markdown' | 'plain_text' | 'json' | 'html' = 'markdown'
): Promise<{ content: string; filename: string } | null> {
  try {
    return await fetchOperational<{ content: string; filename: string }>(
      `/api/assistant/orb/outputs/${outputId}/export`,
      { method: 'POST', body: JSON.stringify({ format }) }
    )
  } catch {
    return null
  }
}

export async function markOperationalOutputForReview(outputId: string): Promise<OrbOperationalOutputRecord | null> {
  try {
    return await fetchOperational<OrbOperationalOutputRecord>(
      `/api/assistant/orb/outputs/${outputId}/review`,
      { method: 'POST', body: JSON.stringify({ visibility: 'manager_review' }) }
    )
  } catch {
    return null
  }
}

export async function archiveOperationalOutput(outputId: string): Promise<void> {
  await fetchOperational(`/api/assistant/orb/outputs/${outputId}/archive`, { method: 'POST', body: '{}' })
}

export async function deleteOperationalOutput(outputId: string): Promise<void> {
  await authFetch(`/api/assistant/orb/outputs/${outputId}`, { method: 'DELETE' })
}

export async function getOperationalContextCards(
  params: { scope?: OrbOperationalScope; mode?: OrbOperationalMode; home_id?: number | null },
  signal?: AbortSignal
): Promise<OsApiResult<{ context_cards: OrbOperationalContextCard[]; context_status?: OrbOperationalContextStatus }>> {
  const query = new URLSearchParams()
  if (params.scope) query.set('scope', params.scope)
  if (params.mode) query.set('mode', params.mode)
  if (params.home_id != null) query.set('home_id', String(params.home_id))
  try {
    const envelope = await authFetch<{ success?: boolean; data: { context_cards: OrbOperationalContextCard[] } }>(
      `/api/assistant/orb/context-cards?${query.toString()}`,
      { signal }
    )
    const data = (envelope as { data?: { context_cards: OrbOperationalContextCard[] } }).data ?? (envelope as unknown as { context_cards: OrbOperationalContextCard[] })
    return { data: data as { context_cards: OrbOperationalContextCard[] }, source: 'live' }
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'Context cards unavailable') as OsApiResult<{ context_cards: OrbOperationalContextCard[] }>
  }
}

export async function getOperationalCapabilities(signal?: AbortSignal): Promise<OsApiResult<Record<string, unknown>>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data: Record<string, unknown> }>(
      '/api/assistant/orb/capabilities',
      { signal }
    )
    const data = (envelope as { data?: Record<string, unknown> }).data ?? {}
    return { data, source: 'live' }
  } catch (error) {
    return { source: 'unavailable', data: {}, warning: 'Capabilities unavailable' }
  }
}

/** Build scoped ORB href for recording workspace — no draft body in URL. */
export function operationalOrbRecordingHref(params: {
  mode?: OrbOperationalMode
  formId?: string
  formTitle?: string
  recordingType?: string
  childId?: number
  homeId?: number
  flags?: string[]
  prompt?: string
  selectedExcerpt?: string
}): string {
  const query = new URLSearchParams()
  query.set('mode', params.mode || 'recording_live_coach')
  query.set('context', 'recording')
  if (params.formId) query.set('form_id', params.formId)
  if (params.recordingType) query.set('recording_type', params.recordingType)
  if (params.childId != null) query.set('child_id', String(params.childId))
  if (params.homeId != null) query.set('home_id', String(params.homeId))
  if (params.flags?.length) query.set('flags', params.flags.slice(0, 6).join(','))
  if (params.prompt) query.set('q', params.prompt)
  if (params.selectedExcerpt) query.set('excerpt', params.selectedExcerpt.slice(0, 500))
  return `/assistant/orb?${query.toString()}`
}
