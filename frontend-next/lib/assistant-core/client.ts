import { buildAssistantContext } from './context'
import { authFetch, AuthApiError } from '@/lib/auth/api'
import type {
  AssistantContext,
  AssistantMode,
  AssistantQueryData,
  AssistantQueryRequest,
  AssistantQueryResponse
} from './types'

export const ASSISTANT_API_BASE = (
  ''
).replace(/\/+$/, '')

export class AssistantClientError extends Error {
  code: string
  details?: unknown
  status?: number

  constructor(message: string, code = 'assistant_client_error', details?: unknown, status?: number) {
    super(message)
    this.name = 'AssistantClientError'
    this.code = code
    this.details = details
    this.status = status
  }
}

function assistantUrl(path: string) {
  return path
}

export function assistantErrorMessage(error: unknown) {
  if (error instanceof AssistantClientError) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again before using the assistant.'
    }
    if (error.status === 403) {
      return 'You do not have permission to use the assistant.'
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Assistant backend unavailable.'
}

export async function queryAssistant(request: AssistantQueryRequest, signal?: AbortSignal): Promise<AssistantQueryData> {
  try {
    const payload = await authFetch<AssistantQueryResponse>(assistantUrl('/assistant/query'), {
      method: 'POST',
      signal,
      body: JSON.stringify(request)
    })

    if (!payload.success) {
      throw new AssistantClientError(payload.error.message, payload.error.code, payload.error.details)
    }

    return payload.data
  } catch (error) {
    if (error instanceof AssistantClientError) throw error
    if (error instanceof AuthApiError) {
      const message = error.status === 401
        ? 'Your session has expired. Please sign in again before using the assistant.'
        : error.status === 403
          ? 'You do not have permission to use the assistant.'
          : error.message
      throw new AssistantClientError(message, error.code || 'backend_unavailable', undefined, error.status)
    }
    throw error
  }
}

export function buildStandaloneAssistantContext(options: {
  conversationId?: string | null
  projectId?: string | null
  activeSection?: string | null
} = {}): AssistantContext {
  return {
    ...buildAssistantContext({
      mode: 'standalone',
      route: '/assistant',
      pageTitle: 'IndiCare Assistant',
      workspaceType: options.activeSection || 'standalone_assistant',
      conversationId: options.conversationId,
      projectId: options.projectId
    }),
    assistant_product_mode: 'standalone_assistant',
    home_id: null,
    allowed_home_ids: [],
    home_scope: {},
    selected_young_person_id: null,
    selected_record_id: null,
    selected_record_type: null,
    selected_record_summary: null,
    visible_chronology_ids: [],
    visible_action_ids: [],
    visible_evidence_ids: []
  }
}

export function emptyAssistantResponse(message: string, mode: AssistantMode): AssistantQueryData {
  return {
    answer: `${message}\n\nThe live assistant endpoint did not return evidence. No record-specific conclusion has been made.`,
    citations: [],
    related_records: [],
    suggested_actions: [],
    evidence_gaps: [{ area: 'assistant', gap: 'No evidence was returned by the assistant endpoint.', severity: 'review' }],
    regulatory_links: [],
    follow_up_questions: [],
    confidence: 'low',
    review_required: true,
    retrieval: { source_count: 0, errors: [`${mode} fallback`] }
  }
}
