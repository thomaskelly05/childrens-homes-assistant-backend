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
  actions: OrbAction[]
  confidence: OrbConfidence
  guardrails: string[]
  context_used: {
    scope?: string
    intent?: string
    projection_keys?: string[]
    live_tables?: string[]
    snapshot_hit?: boolean
  }
  conversation_id?: string
}

function unavailable(message: string): OsApiResult<OrbConversationResponse> {
  return {
    source: 'unavailable',
    warning: message,
    data: {
      ok: false,
      answer: "I couldn't reach the live ORB endpoint just now. No operational conclusion has been made.",
      summary: 'Live ORB unavailable.',
      sources: [],
      actions: [{ label: 'Open the command centre for manager review', type: 'review', route: '/command-centre' }],
      confidence: 'low',
      guardrails: ['ORB supports review; it does not replace registered manager or safeguarding judgement.'],
      context_used: { snapshot_hit: false, live_tables: [] }
    }
  }
}

export async function queryOrbConversation(request: OrbConversationRequest, signal?: AbortSignal): Promise<OsApiResult<OrbConversationResponse>> {
  try {
    const payload = await authFetch<OrbConversationResponse>('/api/orb/conversation', {
      method: 'POST',
      signal,
      body: JSON.stringify(request)
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
      if (error.status === 401) return unavailable('Your session has expired. Please sign in again before using ORB.')
      if (error.status === 403) return unavailable('You do not have permission to use ORB.')
      return unavailable(error.message)
    }
    return unavailable(error instanceof Error ? error.message : 'ORB backend unavailable.')
  }
}
