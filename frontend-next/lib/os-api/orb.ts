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

export async function queryOrbConversation(request: OrbConversationRequest, signal?: AbortSignal): Promise<OsApiResult<OrbConversationResponse>> {
  try {
    const payload = await authFetch<OrbConversationResponse>('/api/assistant/orb/conversation', {
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
    return {
      data: {
        ...payload,
        sources: Array.isArray(payload.sources) ? payload.sources : [],
        actions: Array.isArray(payload.actions) ? payload.actions : [],
        guardrails: Array.isArray(payload.guardrails) ? payload.guardrails : []
      },
      source: payload.ok ? 'live' : 'unavailable',
      meta: payload.context_used as Record<string, unknown>
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
