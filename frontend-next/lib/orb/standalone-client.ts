import {
  applyCsrfHeaders,
  authFetch,
  authFetchResponse,
  AuthApiError,
  getCsrfToken,
  STANDALONE_ORB_CSRF_REFRESH_MESSAGE
} from '@/lib/auth/api'
import {
  parseStandaloneOrbSseBlock,
  type StandaloneOrbStreamEvent as StandaloneOrbStreamEventBase
} from '@/lib/orb/standalone-sse-parser'

const STANDALONE_REQUEST_TIMEOUT_MS = 45_000

/** Standalone-only API paths (no OS / Care Hub). */
export const STANDALONE_ORB_API_PATHS = {
  conversation: '/orb/standalone/conversation',
  conversationStream: '/orb/standalone/conversation/stream',
  config: '/orb/standalone/config',
  modelRouterHealth: '/orb/standalone/model-router/health',
  documentsHealth: '/orb/standalone/documents/health',
  documentsUpload: '/orb/standalone/documents/upload',
  documentsAnalyse: '/orb/standalone/documents/analyse',
  evaluationHealth: '/orb/standalone/evaluation/health',
  agentsHealth: '/orb/standalone/agents/health',
  agentsList: '/orb/standalone/agents',
  agentsRun: '/orb/standalone/agents/run',
  agentsDeepResearch: '/orb/standalone/agents/deep-research',
  outputsHealth: '/orb/standalone/outputs/health',
  outputs: '/orb/standalone/outputs',
  outputsSummary: '/orb/standalone/outputs/summary',
  capabilities: '/orb/standalone/capabilities',
  capabilitiesSummary: '/orb/standalone/capabilities/summary',
  surfaceRoute: '/orb/standalone/surface-route',
  actionsRegistry: '/orb/standalone/actions',
  actionsRun: '/orb/standalone/actions/run'
} as const

export const STANDALONE_ORB_MODES = [
  'Ask ORB',
  'Safeguarding Thinking',
  'Ofsted Lens',
  'Record This Properly',
  'Therapeutic Reframe',
  'Manager Copilot',
  'Staff Coach',
  'Reg 44 / Reg 45 Prep'
] as const

export type StandaloneOrbMode = (typeof STANDALONE_ORB_MODES)[number]

export type StandaloneOrbConfig = {
  name: string
  surface: string
  public_route: string
  os_assistant_route: string
  os_linked: boolean
  care_record_access: boolean
  chronology_access: boolean
  dashboard_access: boolean
  direct_writes: boolean
  modes: string[]
  endpoints: {
    health: string
    conversation: string
    config: string
    model_router_health?: string
  }
}

export type StandaloneOrbModelRouterHealth = {
  available: boolean
  default_provider: string
  providers: Array<{
    name: string
    available: boolean
    models_configured: boolean
  }>
  strict: boolean
}

export async function fetchStandaloneOrbModelRouterHealth(signal?: AbortSignal) {
  const payload = await authFetch<{ success?: boolean; data?: StandaloneOrbModelRouterHealth }>(
    '/orb/standalone/model-router/health',
    { signal: withTimeout(signal) }
  )
  if (!payload?.data) throw new AuthApiError(503, 'Could not load ORB model router health.')
  return payload.data
}

export type StandaloneOrbAnswerDetail = 'voice_concise' | 'balanced' | 'detailed' | 'concise'

export type StandaloneOrbImageAttachment = {
  /** data:image/...;base64,... */
  data_url: string
  name?: string
}

export type StandaloneOrbConversationRequest = {
  message: string
  mode: StandaloneOrbMode | string
  conversation_id?: string | null
  history?: Array<{ role: string; content: string }>
  detail?: StandaloneOrbAnswerDetail | string
  images?: StandaloneOrbImageAttachment[]
  document_text?: string
  document_source_id?: string
  document_title?: string
}

export type StandaloneOrbSourceType =
  | 'product_context'
  | 'regulatory_framework'
  | 'general_knowledge'
  | 'user_provided'
  | 'safety_boundary'
  | 'recording_quality'
  | 'therapeutic_practice'
  | 'safeguarding_principles'
  | 'image_context'

export type StandaloneOrbSource = {
  id?: string
  label: string
  exact_citation?: string | null
  citation_anchor?: string | null
  type: StandaloneOrbSourceType | string
  basis?: string
  note?: string
  excerpt?: string | null
  live_retrieved?: boolean
  document_chunk?: boolean
  origin?: string
  heading_path?: string[]
  heading?: string | null
  section?: string | null
  subsection?: string | null
  page?: string | null
  paragraph_number?: string | null
  source_id?: string
  chunk_index?: number
  official_source?: boolean
  source_integrity?: string | null
  source_url?: string | null
  confidence_level?: string
  governance_status?: string
  source_version?: string
  warning?: string | null
  quote_allowed?: boolean
  retrieval_strategy?: string
  semantic_score?: number | null
  hybrid_score?: number | null
  keyword_score?: number | null
}

export type StandaloneOrbCitation = StandaloneOrbSource

export type StandaloneOrbRetrievalContext = {
  strategy?: string
  live_retrieved?: boolean
  source_count?: number
  document_result_count?: number
  top_source_titles?: string[]
  routing_hint?: string
  research_intent?: boolean
  semantic_available?: boolean
  synonym_expansion_used?: boolean
  official_source_count?: number
  warnings?: string[]
}

export type StandaloneOrbModelRouting = {
  provider?: string
  model?: string
  task_type?: string
  quality_tier?: string
  cost_tier?: string
  reason?: string
  fallback_used?: boolean
  latency_ms?: number | null
  risk_level?: string
  requires_citations?: boolean
  requires_rag?: boolean
  requires_vision?: boolean
  error?: string | null
}

export type StandaloneOrbExplainabilityPayload = {
  active_brains?: string[]
  cognition_display_labels?: string[]
  depth_topic?: string
  reasoning_lenses?: string[]
  frameworks_used?: string[]
  evidence_focus?: string[]
  confidence?: string
  human_review_boundaries?: string[]
  reasoning_summary?: string
  operational_context_used?: boolean
  cognition_mode?: string
}

export type StandaloneOrbTimingMetadata = {
  elapsed_ms?: number
  request_started?: boolean
  first_token_ms?: number | null
  total_elapsed_ms?: number
  retrieval_elapsed_ms?: number
  provider_elapsed_ms?: number | null
  prompt_tier?: string
  stream_mode?: string
  prompt_char_estimate?: number
  grounding_char_count?: number
  model?: string
  provider?: string
  route?: string
  frontend_request_started_at?: number
  frontend_request_completed_at?: number
  frontend_elapsed_ms?: number
}

export type StandaloneOrbContextUsed = {
  surface?: string
  mode?: string
  os_linked?: boolean
  care_record_access?: boolean
  timing?: StandaloneOrbTimingMetadata
  cognition_display_labels?: string[]
  active_brains?: string[]
  depth_topic?: string
  reasoning_lenses?: string[]
  retrieval?: StandaloneOrbRetrievalContext
  model_routing?: StandaloneOrbModelRouting
  document_analysis?: {
    suggested?: boolean
    mode?: string
    reason?: string
    needs_document?: boolean
    completed?: boolean
  }
  agent?: StandaloneOrbAgentSuggestion
  explainability?: StandaloneOrbExplainabilityPayload
}

export type StandaloneOrbConversationResponse = {
  ok: boolean
  standalone?: boolean
  os_records_accessed?: boolean
  answer: string
  summary?: string
  conversation_id?: string | null
  confidence?: string
  cognition_display_labels?: string[]
  sources?: StandaloneOrbSource[]
  citations?: StandaloneOrbCitation[]
  context_used?: StandaloneOrbContextUsed
  guardrails?: string[]
  image_understanding_available?: boolean
  error_detail?: string
}

export type StandaloneOrbActionRunRequest = {
  action: string
  source_message?: string
  source_answer?: string
  mode?: StandaloneOrbMode | string
  context?: Record<string, unknown>
}

export type StandaloneOrbActionSection = {
  heading: string
  body: string
}

export type StandaloneOrbActionRunResult = {
  action: string
  title: string
  answer: string
  sections?: StandaloneOrbActionSection[]
  checklist?: string[]
  confidence?: string
  sources?: StandaloneOrbSource[]
  standalone: boolean
  os_records_accessed: boolean
  suggested_next_actions?: Array<{ action: string; label: string }>
  action_engine?: Record<string, unknown>
}

export async function runStandaloneOrbAction(
  request: StandaloneOrbActionRunRequest,
  signal?: AbortSignal
): Promise<StandaloneOrbActionRunResult> {
  const payload = await authFetch<{ success?: boolean; data?: StandaloneOrbActionRunResult }>(
    STANDALONE_ORB_API_PATHS.actionsRun,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: withTimeout(signal)
    }
  )
  const data = payload?.data
  if (!data?.answer) {
    throw new AuthApiError(503, 'ORB could not complete that action. Please try again.')
  }
  return {
    ...data,
    standalone: data.standalone ?? true,
    os_records_accessed: data.os_records_accessed ?? false
  }
}

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STANDALONE_REQUEST_TIMEOUT_MS)
  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      controller.abort()
    })
  }
  controller.signal.addEventListener('abort', () => clearTimeout(timeout))
  return controller.signal
}

function isDevEnvironment() {
  return process.env.NODE_ENV === 'development'
}

function isOrbCognitionDebugEnabled() {
  if (isDevEnvironment()) return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage?.getItem('orb-cognition-debug') === '1'
  } catch {
    return false
  }
}

function logStandaloneDebug(event: string, detail: Record<string, unknown>) {
  if (!isDevEnvironment()) return
  console.debug('[standalone-orb]', event, detail)
}

export function logOrbCognitionDebug(
  event: string,
  detail: Record<string, unknown>,
  options?: { force?: boolean }
) {
  if (!options?.force && !isOrbCognitionDebugEnabled()) return
  console.info(`[orb-cognition] ${event}`, detail)
}

/** Dev-only timing log for ORB request path audits. */
export function logOrbTiming(
  event: string,
  detail: Record<string, unknown>
) {
  if (!isDevEnvironment() && !isOrbCognitionDebugEnabled()) return
  console.info(`[orb-timing] ${event}`, detail)
}

function extractAnswer(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const direct = record.answer
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const nested = record.data
  if (nested && typeof nested === 'object') {
    const answer = (nested as Record<string, unknown>).answer
    if (typeof answer === 'string' && answer.trim()) return answer.trim()
  }
  return null
}

export async function fetchStandaloneOrbConfig(signal?: AbortSignal): Promise<StandaloneOrbConfig> {
  const payload = await authFetch<{ success?: boolean; data?: StandaloneOrbConfig }>('/orb/standalone/config', {
    signal: withTimeout(signal)
  })
  if (!payload?.data) throw new AuthApiError(503, 'Could not load ORB Care Companion configuration.')
  return payload.data
}

export const getStandaloneOrbConfig = fetchStandaloneOrbConfig

export async function queryStandaloneOrbConversation(
  request: StandaloneOrbConversationRequest,
  signal?: AbortSignal
): Promise<StandaloneOrbConversationResponse> {
  const endpoint = STANDALONE_ORB_API_PATHS.conversation
  const requestSignal = withTimeout(signal)

  try {
    logStandaloneDebug('conversation_request_start', {
      endpoint,
      hasExternalSignal: Boolean(signal),
      hasCsrfHeader: Boolean(getCsrfToken())
    })
    const body = JSON.stringify({
      message: request.message,
      mode: request.mode,
      conversation_id: request.conversation_id,
      history: request.history ?? [],
      ...(request.detail ? { detail: request.detail } : {}),
      ...(request.images?.length ? { images: request.images } : {}),
      ...(request.document_text ? { document_text: request.document_text } : {}),
      ...(request.document_source_id ? { document_source_id: request.document_source_id } : {}),
      ...(request.document_title ? { document_title: request.document_title } : {})
    })
    const headers = new Headers({ 'Content-Type': 'application/json' })
    applyCsrfHeaders(headers, 'POST')
    if (!headers.has('X-CSRF-Token') && !getCsrfToken()) {
      throw new AuthApiError(403, {
        code: 'csrf_failed',
        message: STANDALONE_ORB_CSRF_REFRESH_MESSAGE
      })
    }
    const response = await authFetchResponse(endpoint, {
      method: 'POST',
      signal: requestSignal,
      headers,
      body,
      credentials: 'include'
    })
    const payload = (await response.json().catch(() => undefined)) as
      | (StandaloneOrbConversationResponse & { success?: boolean; data?: { answer?: string } })
      | undefined
    if (!response.ok) {
      const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
      if (record?.detail === 'csrf_failed') {
        throw new AuthApiError(403, {
          code: 'csrf_failed',
          message:
            typeof record.message === 'string' ? record.message : STANDALONE_ORB_CSRF_REFRESH_MESSAGE
        })
      }
      throw new AuthApiError(
        response.status,
        typeof record?.message === 'string'
          ? { code: String(record.code || 'request_failed'), message: record.message }
          : 'ORB could not finish that response. Please try again.'
      )
    }
    if (!payload) {
      throw new AuthApiError(503, 'ORB could not finish that response. Please try again.')
    }

    const answer = extractAnswer(payload)
    logStandaloneDebug('conversation_response', {
      endpoint,
      hasAnswer: Boolean(answer),
      keys: payload && typeof payload === 'object' ? Object.keys(payload as object) : []
    })

    if (!answer) {
      throw new AuthApiError(503, 'ORB could not finish that response. Please try again.')
    }

    const typed = payload as StandaloneOrbConversationResponse & {
      data?: StandaloneOrbConversationResponse
    }
    const nestedData =
      typed.data && typeof typed.data === 'object' ? (typed.data as StandaloneOrbConversationResponse) : undefined
    const nestedSources = nestedData?.sources
    const nestedCitations = nestedData?.citations
    const resolvedSources = typed.sources ?? nestedSources
    const resolvedCitations = typed.citations ?? nestedCitations ?? resolvedSources
    const resolvedContext = typed.context_used ?? nestedData?.context_used
    const resolvedCognitionLabels =
      typed.cognition_display_labels ??
      nestedData?.cognition_display_labels ??
      resolvedContext?.cognition_display_labels ??
      resolvedContext?.explainability?.cognition_display_labels

    logOrbCognitionDebug('raw response', {
      mode: request.mode,
      context_used: resolvedContext,
      cognition_display_labels: resolvedCognitionLabels,
      explainability: resolvedContext?.explainability,
      sources: resolvedSources?.map((source) => source.label)
    })

    return {
      ok: Boolean(typed.ok ?? nestedData?.ok ?? true),
      standalone: typed.standalone ?? nestedData?.standalone ?? true,
      os_records_accessed: typed.os_records_accessed ?? nestedData?.os_records_accessed ?? false,
      answer,
      summary: typed.summary ?? nestedData?.summary,
      conversation_id: typed.conversation_id ?? nestedData?.conversation_id ?? request.conversation_id,
      confidence: typed.confidence ?? nestedData?.confidence,
      cognition_display_labels: resolvedCognitionLabels,
      sources: resolvedSources,
      citations: resolvedCitations,
      context_used: resolvedContext,
      guardrails: typed.guardrails ?? nestedData?.guardrails,
      image_understanding_available:
        typed.image_understanding_available ?? nestedData?.image_understanding_available,
      error_detail: typed.error_detail ?? nestedData?.error_detail
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logStandaloneDebug('conversation_aborted', {
        endpoint,
        externalAbort: Boolean(signal?.aborted),
        timeoutMs: STANDALONE_REQUEST_TIMEOUT_MS
      })
      throw new AuthApiError(504, 'ORB could not finish that response. Please try again.')
    }
    if (error instanceof AuthApiError) {
      logStandaloneDebug('conversation_error', { endpoint, status: error.status, type: error.name })
      throw error
    }
    logStandaloneDebug('conversation_error', {
      endpoint,
      type: error instanceof Error ? error.name : 'unknown'
    })
    throw error
  }
}

export const sendStandaloneOrbMessage = queryStandaloneOrbConversation

export type StandaloneOrbStreamEvent =
  | { event: 'token'; delta: string }
  | { event: 'metadata'; payload: StandaloneOrbConversationResponse }
  | { event: 'done'; ok: boolean }
  | { event: 'error'; error: string; detail?: string }

export { parseStandaloneOrbSseBlock }
export type { StandaloneOrbStreamEventBase }

export type StandaloneOrbStreamCallbacks = {
  onToken: (delta: string, partial: string) => void
  onMetadata?: (response: StandaloneOrbConversationResponse) => void
  onDone?: () => void
  onError?: (error: string, detail?: string) => void
}

function buildStandaloneConversationBody(request: StandaloneOrbConversationRequest) {
  return JSON.stringify({
    message: request.message,
    mode: request.mode,
    conversation_id: request.conversation_id,
    history: request.history ?? [],
    ...(request.detail ? { detail: request.detail } : {}),
    ...(request.images?.length ? { images: request.images } : {}),
    ...(request.document_text ? { document_text: request.document_text } : {}),
    ...(request.document_source_id ? { document_source_id: request.document_source_id } : {}),
    ...(request.document_title ? { document_title: request.document_title } : {})
  })
}

function normaliseStreamMetadata(
  payload: StandaloneOrbConversationResponse,
  request: StandaloneOrbConversationRequest
): StandaloneOrbConversationResponse {
  const answer = extractAnswer(payload)
  if (!answer) {
    throw new AuthApiError(503, 'ORB could not finish that response. Please try again.')
  }
  const resolvedContext = payload.context_used
  const resolvedCognitionLabels =
    payload.cognition_display_labels ??
    resolvedContext?.cognition_display_labels ??
    resolvedContext?.explainability?.cognition_display_labels
  return {
    ok: Boolean(payload.ok ?? true),
    standalone: payload.standalone ?? true,
    os_records_accessed: payload.os_records_accessed ?? false,
    answer,
    summary: payload.summary,
    conversation_id: payload.conversation_id ?? request.conversation_id,
    confidence: payload.confidence,
    cognition_display_labels: resolvedCognitionLabels,
    sources: payload.sources ?? payload.citations,
    citations: payload.citations ?? payload.sources,
    context_used: resolvedContext,
    guardrails: payload.guardrails,
    image_understanding_available: payload.image_understanding_available,
    error_detail: payload.error_detail
  }
}

/**
 * True SSE streaming for standalone ORB. Returns final metadata when the stream completes.
 * Throws on transport failures before any token (caller may fall back to non-streaming POST).
 */
export async function sendStandaloneOrbMessageStream(
  request: StandaloneOrbConversationRequest,
  callbacks: StandaloneOrbStreamCallbacks,
  signal?: AbortSignal
): Promise<StandaloneOrbConversationResponse> {
  const endpoint = STANDALONE_ORB_API_PATHS.conversationStream
  const requestSignal = withTimeout(signal)
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' })
  applyCsrfHeaders(headers, 'POST')
  if (!headers.has('X-CSRF-Token') && !getCsrfToken()) {
    throw new AuthApiError(403, {
      code: 'csrf_failed',
      message: STANDALONE_ORB_CSRF_REFRESH_MESSAGE
    })
  }

  const response = await authFetchResponse(endpoint, {
    method: 'POST',
    signal: requestSignal,
    headers,
    body: buildStandaloneConversationBody(request),
    credentials: 'include'
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as Record<string, unknown> | undefined
    if (payload?.detail === 'csrf_failed') {
      throw new AuthApiError(403, {
        code: 'csrf_failed',
        message:
          typeof payload.message === 'string' ? payload.message : STANDALONE_ORB_CSRF_REFRESH_MESSAGE
      })
    }
    throw new AuthApiError(
      response.status,
      typeof payload?.message === 'string'
        ? { code: String(payload.code || 'request_failed'), message: payload.message }
        : 'ORB could not finish that response. Please try again.'
    )
  }

  const body = response.body
  if (!body) {
    throw new AuthApiError(503, 'ORB streaming response was empty.')
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let partial = ''
  let sawToken = false
  let metadata: StandaloneOrbConversationResponse | null = null
  let streamError: string | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split(/\n\n/)
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const event = parseStandaloneOrbSseBlock(block)
        if (!event) continue
        if (event.event === 'token') {
          sawToken = true
          partial += event.delta
          callbacks.onToken(event.delta, partial)
        } else if (event.event === 'metadata') {
          metadata = normaliseStreamMetadata(
            event.payload as StandaloneOrbConversationResponse,
            request
          )
          callbacks.onMetadata?.(metadata)
        } else if (event.event === 'done') {
          callbacks.onDone?.()
        } else if (event.event === 'error') {
          streamError = event.error
          callbacks.onError?.(event.error, event.detail)
        }
      }
    }
    if (buffer.trim()) {
      const trailing = parseStandaloneOrbSseBlock(buffer)
      if (trailing?.event === 'metadata') {
        metadata = normaliseStreamMetadata(trailing.payload, request)
        callbacks.onMetadata?.(metadata)
      } else if (trailing?.event === 'error') {
        streamError = trailing.error
        callbacks.onError?.(trailing.error, trailing.detail)
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (metadata) {
    return metadata
  }
  if (streamError) {
    if (sawToken && partial.trim()) {
      return {
        ok: true,
        standalone: true,
        os_records_accessed: false,
        answer: partial.trim(),
        error_detail: streamError
      }
    }
    throw new AuthApiError(503, 'ORB could not finish that response. Please try again.')
  }
  if (sawToken && partial.trim()) {
    return {
      ok: true,
      standalone: true,
      os_records_accessed: false,
      answer: partial.trim()
    }
  }
  throw new AuthApiError(503, 'ORB could not finish that response. Please try again.')
}

export type OrbKnowledgeSourceType =
  | 'product_context'
  | 'regulatory_framework'
  | 'policy'
  | 'practice_guidance'
  | 'therapeutic_practice'
  | 'recording_quality'
  | 'safeguarding_principles'
  | 'general_knowledge'
  | 'user_uploaded'

export type OrbKnowledgeConfidenceLevel = 'low' | 'medium' | 'high' | 'official'

export type OrbKnowledgeGovernanceStatus =
  | 'draft'
  | 'approved'
  | 'needs_review'
  | 'expired'
  | 'archived'

export type OrbKnowledgeDocumentFamily =
  | 'ofsted'
  | 'dfe'
  | 'legislation'
  | 'safeguarding'
  | 'provider_policy'
  | 'indicare_product'
  | 'internal_guidance'
  | 'other'

export type OrbKnowledgeSourceIntegrity =
  | 'summary_only'
  | 'full_document'
  | 'excerpt_only'
  | 'user_pasted'
  | 'unknown'

export type OrbKnowledgeSource = {
  id: string
  title: string
  description?: string | null
  source_type: OrbKnowledgeSourceType
  status: string
  origin: string
  file_name?: string | null
  source_label?: string | null
  standalone_only?: boolean
  os_linked?: boolean
  care_record_access?: boolean
  live_retrieved?: boolean
  source_version?: string | null
  document_version_label?: string | null
  official_source?: boolean
  publisher?: string | null
  document_family?: OrbKnowledgeDocumentFamily | string | null
  source_url?: string | null
  confidence_level?: OrbKnowledgeConfidenceLevel
  governance_status?: OrbKnowledgeGovernanceStatus
  source_integrity?: OrbKnowledgeSourceIntegrity | string | null
  review_due_at?: string | null
  expires_at?: string | null
  notes?: string | null
}

export type OrbKnowledgeCitationHealth = {
  source_id: string
  chunk_count: number
  chunks_with_section: number
  chunks_with_page: number
  chunks_with_heading: number
  chunks_with_anchor: number
  chunks_with_exact_excerpt: number
  summary_only: boolean
  governance_status?: string | null
  official_source: boolean
  source_integrity?: string | null
  warnings: string[]
  health_status: string
}

export type OrbKnowledgeSearchResult = {
  source_id: string
  source_title: string
  source_type: OrbKnowledgeSourceType
  citation_label: string
  exact_citation?: string | null
  citation_anchor?: string | null
  heading_path?: string[]
  heading?: string | null
  section?: string | null
  subsection?: string | null
  page?: string | null
  paragraph_number?: string | null
  excerpt?: string | null
  chunk_index: number
  text: string
  score: number
  match_reason: string
  live_retrieved?: boolean
  keyword_score?: number | null
  semantic_score?: number | null
  hybrid_score?: number | null
  official_source?: boolean
  source_integrity?: string | null
  source_url?: string | null
  source_version?: string | null
  source_confidence?: OrbKnowledgeConfidenceLevel
  governance_status?: OrbKnowledgeGovernanceStatus
  warning?: string | null
  quote_allowed?: boolean
}

export type OrbKnowledgeLibrarySummary = {
  source_count: number
  chunk_count: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  standalone_only: boolean
  os_linked: boolean
  care_record_access: boolean
}

function unwrapKnowledgeData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new AuthApiError(503, 'Unexpected knowledge API response')
  }
  const record = payload as Record<string, unknown>
  if (record.data !== undefined) return record.data as T
  return payload as T
}

export async function fetchOrbKnowledgeSummary() {
  const payload = await authFetch('/orb/standalone/knowledge/summary')
  return unwrapKnowledgeData<OrbKnowledgeLibrarySummary>(payload)
}

export async function fetchOrbKnowledgeSources(sourceType?: string, governanceStatus?: string) {
  const params = new URLSearchParams()
  if (sourceType) params.set('source_type', sourceType)
  if (governanceStatus) params.set('governance_status', governanceStatus)
  const query = params.toString() ? `?${params.toString()}` : ''
  const payload = await authFetch(`/orb/standalone/knowledge/sources${query}`)
  return unwrapKnowledgeData<OrbKnowledgeSource[]>(payload)
}

export async function ingestOrbKnowledgeText(body: {
  title: string
  text: string
  source_type?: OrbKnowledgeSourceType
  source_label?: string
  description?: string
}) {
  const payload = await authFetch('/orb/standalone/knowledge/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrapKnowledgeData<{ source: OrbKnowledgeSource; chunk_count: number }>(payload)
}

export async function searchOrbKnowledge(query: string, limit = 8) {
  const payload = await authFetch('/orb/standalone/knowledge/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit })
  })
  return unwrapKnowledgeData<{ query: string; results: OrbKnowledgeSearchResult[]; total: number }>(payload)
}

export async function fetchOrbOfficialSources() {
  const payload = await authFetch('/orb/standalone/knowledge/official-sources')
  return unwrapKnowledgeData<OrbKnowledgeSource[]>(payload)
}

export async function fetchOrbSourcesNeedingReview() {
  const payload = await authFetch('/orb/standalone/knowledge/sources/needing-review')
  return unwrapKnowledgeData<OrbKnowledgeSource[]>(payload)
}

export async function fetchOrbSourceCitationHealth(sourceId: string) {
  const payload = await authFetch(`/orb/standalone/knowledge/sources/${encodeURIComponent(sourceId)}/citation-health`)
  return unwrapKnowledgeData<OrbKnowledgeCitationHealth>(payload)
}

export async function approveOrbKnowledgeSource(sourceId: string) {
  const payload = await authFetch(
    `/orb/standalone/knowledge/sources/${encodeURIComponent(sourceId)}/approve`,
    { method: 'POST' }
  )
  return unwrapKnowledgeData<OrbKnowledgeSource>(payload)
}

export async function markOrbKnowledgeNeedsReview(sourceId: string, reason?: string) {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  const payload = await authFetch(
    `/orb/standalone/knowledge/sources/${encodeURIComponent(sourceId)}/needs-review${params}`,
    { method: 'POST' }
  )
  return unwrapKnowledgeData<OrbKnowledgeSource>(payload)
}

export async function archiveOrbKnowledgeSource(sourceId: string) {
  const payload = await authFetch(
    `/orb/standalone/knowledge/sources/${encodeURIComponent(sourceId)}/archive`,
    { method: 'POST' }
  )
  return unwrapKnowledgeData<OrbKnowledgeSource>(payload)
}

export async function rebuildOrbKnowledgeCitations(sourceId: string) {
  const payload = await authFetch(
    `/orb/standalone/knowledge/sources/${encodeURIComponent(sourceId)}/rebuild-citations`,
    { method: 'POST' }
  )
  return unwrapKnowledgeData<{ rebuilt: number; citation_health: OrbKnowledgeCitationHealth }>(payload)
}

export async function importOrbOfficialSource(body: {
  title: string
  text: string
  family_key?: string
  document_family?: OrbKnowledgeDocumentFamily | string
  source_type?: OrbKnowledgeSourceType
  publisher?: string
  source_url?: string
  document_version_label?: string
  source_version?: string
  review_due_at?: string
  source_integrity?: OrbKnowledgeSourceIntegrity
  approve_now?: boolean
}) {
  const payload = await authFetch('/orb/standalone/knowledge/import-official', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrapKnowledgeData<{
    source: OrbKnowledgeSource
    chunk_count: number
    citation_health: OrbKnowledgeCitationHealth
  }>(payload)
}

export type OrbDocumentAnalysisMode =
  | 'explain'
  | 'summarise'
  | 'action_plan'
  | 'ofsted_lens'
  | 'safeguarding_lens'
  | 'recording_lens'
  | 'therapeutic_lens'
  | 'policy_comparison'
  | 'manager_briefing'
  | 'staff_briefing'
  | 'full_review'

export const ORB_DOCUMENT_ANALYSIS_MODES: { value: OrbDocumentAnalysisMode; label: string }[] = [
  { value: 'explain', label: 'Explain' },
  { value: 'summarise', label: 'Summarise' },
  { value: 'action_plan', label: 'Action plan' },
  { value: 'ofsted_lens', label: 'Ofsted lens' },
  { value: 'safeguarding_lens', label: 'Safeguarding lens' },
  { value: 'recording_lens', label: 'Recording lens' },
  { value: 'therapeutic_lens', label: 'Therapeutic lens' },
  { value: 'policy_comparison', label: 'Policy comparison' },
  { value: 'manager_briefing', label: 'Manager briefing' },
  { value: 'staff_briefing', label: 'Staff briefing' },
  { value: 'full_review', label: 'Full review' }
]

export type OrbDocumentAction = {
  action: string
  why_it_matters?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  suggested_owner_label?: string | null
  timescale?: string | null
  source_basis?: string | null
  review_needed?: boolean
}

export type OrbDocumentUnderstanding = {
  title: string
  plain_english_summary: string
  document_type?: string | null
  key_themes?: string[]
  important_points?: Array<{ point: string; detail?: string | null }>
  practice_implications?: Array<{ implication: string; for_role?: string | null }>
  risks_or_concerns?: Array<{ risk: string; severity?: string | null }>
  gaps_or_missing_information?: Array<{ gap: string; why_it_matters?: string | null }>
  suggested_questions?: Array<{ question: string }>
  action_plan?: { summary?: string | null; actions?: OrbDocumentAction[]; review_note?: string | null }
  citations?: StandaloneOrbSource[]
  sources?: StandaloneOrbSource[]
  safety_notice?: string | null
  limitations?: string[]
  evaluation?: Record<string, unknown>
  source_id?: string | null
  analysis_mode?: OrbDocumentAnalysisMode
  standalone_only?: boolean
  os_linked?: boolean
  care_record_access?: boolean
}

export async function uploadOrbStandaloneDocument(body: {
  title: string
  text?: string
  content_base64?: string
  file_name?: string
  content_type?: string
  source_type?: string
}) {
  const payload = await authFetch('/orb/standalone/documents/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrapKnowledgeData<{
    source_id: string
    title: string
    chunk_count: number
    source_type?: string
    status: string
  }>(payload)
}

export async function analyseOrbStandaloneDocument(body: {
  mode: OrbDocumentAnalysisMode
  source_id?: string
  title?: string
  text?: string
  question?: string
}) {
  const payload = await authFetch('/orb/standalone/documents/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, include_evaluation: true })
  })
  return unwrapKnowledgeData<{ understanding: OrbDocumentUnderstanding }>(payload)
}

export type OrbAgentType =
  | 'deep_research'
  | 'ofsted_research'
  | 'recording_quality'
  | 'safeguarding_reflection'
  | 'policy_comparison'
  | 'manager_briefing'
  | 'therapeutic_practice'
  | 'general_research'
  | 'document_analysis'

export type OrbAgentDepth = 'quick' | 'standard' | 'deep'

export type OrbAgentOutputFormat =
  | 'answer'
  | 'briefing'
  | 'checklist'
  | 'comparison'
  | 'action_plan'
  | 'supervision_guide'
  | 'evidence_map'

export type OrbAgentDefinition = {
  id: string
  name: string
  type: OrbAgentType
  description: string
  risk_level: string
  requires_citations: boolean
  standalone_only: boolean
  os_linked: boolean
  care_record_access: boolean
  output_formats: OrbAgentOutputFormat[]
  safety_notice?: string | null
}

export type OrbAgentFinding = {
  title: string
  summary: string
  evidence?: string | null
  confidence?: string
  suggested_actions?: string[]
}

export type OrbAgentRunResponse = {
  success: boolean
  agent_type: OrbAgentType
  status: string
  output: { title: string; format: string; body: string }
  findings?: OrbAgentFinding[]
  sources?: StandaloneOrbSource[]
  citations?: StandaloneOrbCitation[]
  steps?: Array<{ id: string; label: string; status: string }>
  context_used?: Record<string, unknown>
  model_routing?: StandaloneOrbModelRouting
  warnings?: string[]
  safety_notice?: string | null
}

export type StandaloneOrbAgentSuggestion = {
  suggested: boolean
  agent_type: OrbAgentType
  reason?: string
  auto_run?: boolean
  preferred_output?: OrbAgentOutputFormat
  depth?: OrbAgentDepth
}

function unwrapAgentData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new AuthApiError(503, 'Unexpected agent API response')
  }
  const record = payload as Record<string, unknown>
  if (record.data !== undefined) return record.data as T
  return payload as T
}

export async function fetchStandaloneOrbAgents(signal?: AbortSignal) {
  const payload = await authFetch('/orb/standalone/agents', { signal: withTimeout(signal) })
  return unwrapAgentData<OrbAgentDefinition[]>(payload)
}

export async function runStandaloneOrbAgent(body: {
  agent_type?: string
  prompt: string
  mode?: string
  project_context?: string
  profile_context?: string
  document_text?: string
  document_source_id?: string
  source_id?: string
  document_title?: string
  preferred_output?: OrbAgentOutputFormat
  depth?: OrbAgentDepth
  require_citations?: boolean
  max_sources?: number
}) {
  const payload = await authFetch('/orb/standalone/agents/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: withTimeout()
  })
  return unwrapAgentData<OrbAgentRunResponse>(payload)
}

export async function runStandaloneOrbDeepResearch(body: {
  query: string
  mode?: string
  depth?: OrbAgentDepth
  preferred_output?: OrbAgentOutputFormat
  document_text?: string
  document_source_id?: string
  source_id?: string
  document_title?: string
  require_citations?: boolean
  max_sources?: number
}) {
  const payload = await authFetch('/orb/standalone/agents/deep-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: withTimeout()
  })
  return unwrapAgentData<OrbAgentRunResponse & { live_web_note?: string; source_gaps?: string[] }>(payload)
}

export type OrbSavedOutputType =
  | 'action_plan'
  | 'document_review'
  | 'manager_briefing'
  | 'staff_briefing'
  | 'deep_research'
  | 'policy_comparison'
  | 'ofsted_evidence_map'
  | 'recording_rewrite'
  | 'safeguarding_reflection'
  | 'therapeutic_practice'
  | 'general_research'
  | 'checklist'
  | 'supervision_guide'
  | 'intelligence_note'

export type OrbSavedOutputStatus = 'draft' | 'saved' | 'archived' | 'pinned'

export type OrbSavedOutputSummary = {
  id: string
  title: string
  type: OrbSavedOutputType
  status: OrbSavedOutputStatus
  project_id?: string | null
  project_name?: string | null
  tags?: string[]
  summary?: string | null
  source_count?: number
  quality_score?: number | null
  created_at: string
  updated_at: string
  standalone_only?: boolean
  os_linked?: boolean
  care_record_access?: boolean
}

export type OrbSavedOutputRecord = OrbSavedOutputSummary & {
  content_markdown?: string | null
  content_json?: Record<string, unknown>
  intelligence_output?: Record<string, unknown>
  sources?: StandaloneOrbSource[]
  citations?: StandaloneOrbCitation[]
  quality?: Record<string, unknown>
  model_routing?: StandaloneOrbModelRouting
  retrieval_context?: StandaloneOrbRetrievalContext
  created_from?: string
  created_from_id?: string | null
  metadata?: Record<string, unknown>
  archived_at?: string | null
}

export type OrbIntelligenceSaveHints = {
  save_available: boolean
  suggested_output_type: OrbSavedOutputType
  suggested_title: string
  suggested_tags?: string[]
}

export type OrbIntelligenceSaveContext = {
  available: boolean
  saved: boolean
  output_id?: string | null
  project_id?: string | null
  type?: OrbSavedOutputType | null
}

function unwrapOutputsData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new AuthApiError(503, 'Unexpected saved outputs API response')
  }
  const record = payload as Record<string, unknown>
  if (record.data !== undefined) return record.data as T
  return payload as T
}

export async function fetchOrbSavedOutputsSummary(signal?: AbortSignal) {
  const payload = await authFetch(STANDALONE_ORB_API_PATHS.outputsSummary, { signal: withTimeout(signal) })
  return unwrapOutputsData<{ total: number; by_type: Record<string, number>; storage_mode?: string }>(payload)
}

export async function listOrbSavedOutputs(params?: {
  project_id?: string
  output_type?: string
  status?: string
  tag?: string
  search?: string
  include_archived?: boolean
  limit?: number
  offset?: number
}) {
  const qs = new URLSearchParams()
  if (params?.project_id) qs.set('project_id', params.project_id)
  if (params?.output_type) qs.set('output_type', params.output_type)
  if (params?.status) qs.set('status', params.status)
  if (params?.tag) qs.set('tag', params.tag)
  if (params?.search) qs.set('search', params.search)
  if (params?.include_archived) qs.set('include_archived', 'true')
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}${query}`)
  return unwrapOutputsData<{ items: OrbSavedOutputSummary[]; total: number }>(payload)
}

export async function createOrbSavedOutput(body: {
  title: string
  type: OrbSavedOutputType
  project_id?: string
  project_name?: string
  profile_ids?: string[]
  tags?: string[]
  summary?: string
  content_markdown?: string
  intelligence_output?: Record<string, unknown>
  sources?: StandaloneOrbSource[]
  citations?: StandaloneOrbCitation[]
  quality?: Record<string, unknown>
  created_from?: string
  created_from_id?: string
}) {
  const payload = await authFetch(STANDALONE_ORB_API_PATHS.outputs, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrapOutputsData<OrbSavedOutputRecord>(payload)
}

export async function getOrbSavedOutput(outputId: string) {
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}/${outputId}`)
  return unwrapOutputsData<OrbSavedOutputRecord>(payload)
}

export async function updateOrbSavedOutput(
  outputId: string,
  body: Partial<{
    title: string
    type: OrbSavedOutputType
    status: OrbSavedOutputStatus
    project_id: string
    project_name: string
    tags: string[]
    summary: string
  }>
) {
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}/${outputId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return unwrapOutputsData<OrbSavedOutputRecord>(payload)
}

export async function archiveOrbSavedOutput(outputId: string) {
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}/${outputId}/archive`, {
    method: 'POST'
  })
  return unwrapOutputsData<OrbSavedOutputRecord>(payload)
}

export async function deleteOrbSavedOutput(outputId: string) {
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}/${outputId}`, { method: 'DELETE' })
  return unwrapOutputsData<{ deleted: boolean; output_id: string }>(payload)
}

export async function exportOrbSavedOutput(outputId: string, format: 'markdown' | 'plain_text' | 'json' = 'markdown') {
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}/${outputId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format })
  })
  return unwrapOutputsData<{
    output_id: string
    format: string
    content: string
    filename: string
    standalone_notice: string
  }>(payload)
}

export async function reuseOrbSavedOutput(outputId: string, instruction?: string) {
  const payload = await authFetch(`${STANDALONE_ORB_API_PATHS.outputs}/${outputId}/reuse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction })
  })
  return unwrapOutputsData<{
    output_id: string
    suggested_prompt: string
    output_summary: string
    source_count: number
    safety_notice: string
  }>(payload)
}

export const STANDALONE_ARTEFACT_NOTICE =
  'Saved outputs are standalone ORB artefacts. They are not added to IndiCare OS records.'

export type StandaloneOrbCapability = {
  id: string
  title: string
  description: string
  category: string
  status: 'built' | 'partial' | 'planned' | 'blocked'
  surface: string
  routes?: string[]
  safety_notes?: string[]
}

export type StandaloneOrbSurfaceRoute = {
  recommended_surface: string
  reason: string
  allowed_in_standalone: boolean
  requires_os_context: boolean
  safety_notice?: string | null
  suggested_route?: string | null
  standalone_boundary_message?: string | null
}

export async function fetchStandaloneOrbCapabilities(signal?: AbortSignal) {
  const payload = await authFetch<{ success?: boolean; data?: { capabilities: StandaloneOrbCapability[] } }>(
    STANDALONE_ORB_API_PATHS.capabilities,
    { signal: withTimeout(signal) }
  )
  return payload?.data?.capabilities ?? []
}

export async function fetchStandaloneOrbCapabilitiesSummary(signal?: AbortSignal) {
  const payload = await authFetch<{ success?: boolean; data?: Record<string, unknown> }>(
    STANDALONE_ORB_API_PATHS.capabilitiesSummary,
    { signal: withTimeout(signal) }
  )
  return payload?.data ?? {}
}

export async function fetchStandaloneOrbSurfaceRoute(
  intent: string,
  options?: { mode?: string; hasDocumentUpload?: boolean },
  signal?: AbortSignal
) {
  const payload = await authFetch<{ success?: boolean; data?: StandaloneOrbSurfaceRoute }>(
    STANDALONE_ORB_API_PATHS.surfaceRoute,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent,
        mode: options?.mode,
        has_document_upload: options?.hasDocumentUpload ?? false
      }),
      signal: withTimeout(signal)
    }
  )
  if (!payload?.data) throw new AuthApiError(503, 'Could not route intent.')
  return payload.data
}

export const STANDALONE_ORB_SEND_RETRY_MESSAGE = 'ORB could not send that message. Please retry.'
export const STANDALONE_ORB_SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'
export const STANDALONE_ORB_NETWORK_ERROR_MESSAGE =
  'ORB could not connect. Check your connection and try again.'
export const STANDALONE_ORB_EMPTY_ANSWER_MESSAGE =
  "I'm here, but I could not generate a full response. Please try again."

export type StandaloneOrbSendErrorInfo = {
  status: number
  message: string
  detail?: string
  csrfFailed: boolean
}

export function isStandaloneOrbCsrfError(error: unknown) {
  if (!(error instanceof AuthApiError) || error.status !== 403) return false
  const code = (error.code || '').toLowerCase()
  return code === 'csrf_failed' || code === 'csrf_invalid' || /csrf/i.test(error.message)
}

export function isStandaloneOrbRetryableNetworkError(error: unknown): boolean {
  const parsed = parseStandaloneOrbSendError(error)
  if (parsed.csrfFailed) return false
  return parsed.status === 0 || parsed.status === 504
}

export function parseStandaloneOrbSendError(error: unknown): StandaloneOrbSendErrorInfo {
  if (error instanceof AuthApiError) {
    const csrfFailed = isStandaloneOrbCsrfError(error)
    if (csrfFailed) {
      return {
        status: error.status,
        detail: error.code || 'csrf_failed',
        message: error.message || STANDALONE_ORB_CSRF_REFRESH_MESSAGE,
        csrfFailed: true
      }
    }
    if (error.status === 401) {
      return {
        status: 401,
        detail: error.code,
        message: STANDALONE_ORB_SESSION_EXPIRED_MESSAGE,
        csrfFailed: false
      }
    }
    if (error.status === 0) {
      return {
        status: 0,
        detail: error.code,
        message: STANDALONE_ORB_NETWORK_ERROR_MESSAGE,
        csrfFailed: false
      }
    }
    if (error.status === 504 || error.status >= 500) {
      return {
        status: error.status,
        detail: error.code,
        message: STANDALONE_ORB_SEND_RETRY_MESSAGE,
        csrfFailed: false
      }
    }
    return {
      status: error.status,
      detail: error.code,
      message: error.message || STANDALONE_ORB_SEND_RETRY_MESSAGE,
      csrfFailed: false
    }
  }
  if (error instanceof TypeError) {
    return {
      status: 0,
      message: STANDALONE_ORB_NETWORK_ERROR_MESSAGE,
      csrfFailed: false
    }
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      status: 504,
      message: STANDALONE_ORB_SEND_RETRY_MESSAGE,
      csrfFailed: false
    }
  }
  if (error instanceof Error) {
    return {
      status: 0,
      message: error.message || STANDALONE_ORB_SEND_RETRY_MESSAGE,
      csrfFailed: false
    }
  }
  return {
    status: 0,
    message: STANDALONE_ORB_SEND_RETRY_MESSAGE,
    csrfFailed: false
  }
}

export function standaloneOrbErrorMessage(error: unknown) {
  return parseStandaloneOrbSendError(error).message
}
