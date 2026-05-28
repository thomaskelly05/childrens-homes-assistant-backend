import { authFetch, AuthApiError } from '@/lib/auth/api'
import type { OsApiResult } from './types'

export type OrbScope = 'home' | 'child' | 'workforce' | 'governance' | 'inspection' | 'provider'
export type OrbConfidence = 'low' | 'medium' | 'high'

export type OrbConversationRequest = {
  message: string
  scope: OrbScope
  young_person_id?: number | null
  staff_id?: number | null
  home_id?: number | null
  conversation_id?: string | null
}

export type OrbSource = {
  title: string
  record_type: string
  record_id: string
  route?: string | null
  date?: string | null
  citation_ref: string
  summary?: string
}

export type OrbAction = {
  label: string
  type: 'create_task' | 'open_record' | 'review' | 'draft_report'
  route?: string | null
}

export type OrbConversationResponse = {
  ok: boolean
  answer: string
  summary: string
  sources: OrbSource[]
  citations?: OrbSource[]
  actions: OrbAction[]
  confidence: OrbConfidence
  guardrails: string[]
  care_journey?: Record<string, unknown>
  regulatory_reasoning?: Record<string, unknown>
  therapeutic_reasoning?: Record<string, unknown>
  operational_cognition?: Record<string, unknown>
  trajectory_reasoning?: Record<string, unknown>
  operational_atmosphere?: Record<string, unknown>
  rm_reflection?: Record<string, unknown>
  risk_intelligence?: Record<string, unknown>
  context_used: {
    scope?: string
    intent?: string
    projection_keys?: string[]
    live_tables?: string[]
    snapshot_hit?: boolean
    degraded?: boolean
    pool_saturation_pct?: number
    metadata_strategy?: Record<string, unknown>
    child_voice_status?: string
    brain?: string
    care_retrieval?: boolean
    tools_used?: string[]
    tool_status?: string
  }
  projection_keys?: string[]
  snapshot_status?: Record<string, unknown>
  live_status?: Record<string, unknown>
  metadata_used?: Record<string, unknown>
  conversation_id?: string
}

type OperationalSource = {
  label?: string
  title?: string
  source_type?: string
  record_type?: string
  record_id?: string
  source_id?: string
  route?: string | null
  date?: string | null
  basis?: string | null
  summary?: string | null
}

type OperationalAction = {
  label?: string
  title?: string
  route?: string | null
  type?: string
  action_type?: string
}

type OperationalConversationPayload = {
  answer?: string
  summary?: string
  context_summary?: { headline?: string; degraded?: boolean; unavailable?: boolean }
  sources?: OperationalSource[]
  citations?: OperationalSource[]
  follow_up_actions?: OperationalAction[]
  draft_actions?: OperationalAction[]
  review_prompts?: OperationalAction[]
  recommendations?: OperationalAction[]
  actions?: OperationalAction[]
  warnings?: string[]
  boundaries?: { notices?: string[] }
  permissions?: { scope_resolved?: string | null }
  care_record_access?: boolean
  os_linked?: boolean
  standalone_only?: boolean
}

function unavailable(message: string): OsApiResult<OrbConversationResponse> {
  return {
    source: 'unavailable',
    warning: message,
    data: {
      ok: false,
      answer: "I couldn't reach the live OS ORB endpoint just now. No operational conclusion has been made.",
      summary: 'Live OS ORB unavailable.',
      sources: [],
      actions: [{ label: 'Open the command centre for manager review', type: 'review', route: '/command-centre' }],
      confidence: 'low',
      guardrails: ['OS ORB supports review; it does not replace registered manager or safeguarding judgement.'],
      context_used: { snapshot_hit: false, live_tables: [] }
    }
  }
}

function toOrbSource(source: OperationalSource, index: number): OrbSource {
  const recordType = source.source_type || source.record_type || 'operational_source'
  return {
    title: source.label || source.title || `Source ${index + 1}`,
    record_type: recordType,
    record_id: String(source.record_id || source.source_id || `${recordType}-${index}`),
    route: source.route || null,
    date: source.date || null,
    citation_ref: `[${index + 1}]`,
    summary: source.basis || source.summary || undefined
  }
}

function toOrbAction(action: OperationalAction, index: number): OrbAction {
  const rawType = action.type || action.action_type || 'review'
  const type: OrbAction['type'] = rawType === 'create_task' || rawType === 'open_record' || rawType === 'draft_report' ? rawType : 'review'
  return {
    label: action.label || action.title || `Action ${index + 1}`,
    type,
    route: action.route || null
  }
}

function normaliseOperationalConversation(payload: OperationalConversationPayload): OrbConversationResponse {
  const sourceItems = Array.isArray(payload.sources) ? payload.sources : Array.isArray(payload.citations) ? payload.citations : []
  const sources = sourceItems.map(toOrbSource)
  const actionItems = [
    ...(Array.isArray(payload.actions) ? payload.actions : []),
    ...(Array.isArray(payload.follow_up_actions) ? payload.follow_up_actions : []),
    ...(Array.isArray(payload.draft_actions) ? payload.draft_actions : []),
    ...(Array.isArray(payload.review_prompts) ? payload.review_prompts : []),
    ...(Array.isArray(payload.recommendations) ? payload.recommendations : [])
  ]
  const actions = actionItems.slice(0, 10).map(toOrbAction)
  const answer = payload.answer || 'OS ORB returned no answer.'
  const degraded = Boolean(payload.context_summary?.degraded || payload.context_summary?.unavailable)
  return {
    ok: Boolean(payload.answer && payload.os_linked !== false && payload.standalone_only !== true),
    answer,
    summary: payload.context_summary?.headline || payload.summary || answer.split('\n', 1)[0].slice(0, 220),
    sources,
    citations: sources,
    actions,
    confidence: degraded ? 'low' : 'medium',
    guardrails: payload.boundaries?.notices || ['OS ORB supports review; it does not replace registered manager or safeguarding judgement.'],
    context_used: {
      scope: payload.permissions?.scope_resolved || undefined,
      care_retrieval: payload.care_record_access,
      degraded,
      snapshot_hit: !payload.context_summary?.unavailable
    }
  }
}

export async function queryOrbConversation(request: OrbConversationRequest, signal?: AbortSignal): Promise<OsApiResult<OrbConversationResponse>> {
  try {
    const envelope = await authFetch<{ success?: boolean; data?: OperationalConversationPayload }>('/api/assistant/orb/conversation', {
      method: 'POST',
      signal,
      body: JSON.stringify({
        message: request.message,
        scope: request.scope === 'workforce' ? 'staff' : request.scope,
        child_id: request.young_person_id ?? null,
        staff_id: request.staff_id ?? null,
        home_id: request.home_id ?? null,
        mode: 'general_operational_question',
        days: 7,
        include_actions: true,
        include_patterns: true,
        include_record_quality: true
      })
    })
    const data = normaliseOperationalConversation(envelope.data || {})
    return {
      data,
      source: data.ok ? 'live' : 'unavailable',
      meta: data.context_used as Record<string, unknown>
    }
  } catch (error) {
    if (error instanceof AuthApiError) {
      if (error.status === 401) return unavailable('Your session has expired. Please sign in again before using OS ORB.')
      if (error.status === 403) return unavailable('You do not have permission to use OS ORB.')
      return unavailable(error.message)
    }
    return unavailable(error instanceof Error ? error.message : 'OS ORB backend unavailable.')
  }
}
