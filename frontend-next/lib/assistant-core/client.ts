import { buildAssistantContext } from './context'
import type {
  AssistantContext,
  AssistantMode,
  AssistantQueryData,
  AssistantQueryRequest,
  AssistantQueryResponse
} from './types'

const DEFAULT_API_BASE = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'
  : 'https://api.indicare.co.uk'

export const ASSISTANT_API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_BASE
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

export async function queryAssistant(request: AssistantQueryRequest, signal?: AbortSignal): Promise<AssistantQueryData> {
  const response = await fetch(assistantUrl('/assistant/query'), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    signal,
    headers: {
      'Content-Type': 'application/json'
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
    throw new AssistantClientError(`Assistant backend unavailable (${response.status})`, 'backend_unavailable', payload, response.status)
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
