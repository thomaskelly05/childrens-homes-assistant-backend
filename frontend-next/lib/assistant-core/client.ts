import { buildAssistantContext } from './context'
import { getCsrfToken } from '@/lib/auth/api'
import type {
  AssistantContext,
  AssistantMode,
  AssistantQueryData,
  AssistantQueryRequest,
  AssistantQueryResponse
} from './types'

export const ASSISTANT_API_BASE = (
  process.env.NEXT_PUBLIC_ASSISTANT_API_BASE ||
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
  return `${ASSISTANT_API_BASE}${path}`
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
  const csrfToken = getCsrfToken()
  const response = await fetch(assistantUrl('/assistant/query'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
    },
    body: JSON.stringify(request)
  })

  let payload: AssistantQueryResponse | null = null
  try {
    payload = await response.json() as AssistantQueryResponse
  } catch {
    payload = null
  }

  if (!response.ok || !payload) {
    const fallbackMessage = response.status === 401
      ? 'Your session has expired. Please sign in again before using the assistant.'
      : response.status === 403
        ? 'You do not have permission to use the assistant.'
        : `Assistant backend unavailable (${response.status})`
    throw new AssistantClientError(fallbackMessage, 'backend_unavailable', payload, response.status)
  }

  if (!payload.success) {
    throw new AssistantClientError(payload.error.message, payload.error.code, payload.error.details, response.status)
  }

  return payload.data
}

export function buildStandaloneAssistantContext(options: {
  conversationId?: string | null
  projectId?: string | null
  activeSection?: string | null
  homeId?: string | number | null
} = {}): AssistantContext {
  return buildAssistantContext({
    mode: 'standalone',
    route: '/assistant',
    pageTitle: 'IndiCare Assistant',
    workspaceType: options.activeSection || 'standalone_assistant',
    conversationId: options.conversationId,
    projectId: options.projectId,
    homeId: options.homeId
  })
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
