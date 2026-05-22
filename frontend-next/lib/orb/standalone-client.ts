import { authFetch, AuthApiError } from '@/lib/auth/api'

const STANDALONE_REQUEST_TIMEOUT_MS = 45_000

export const STANDALONE_ORB_MODES = [
  'Ask ORB',
  'Safeguarding',
  'Reflect',
  'Ofsted Lens',
  'Behaviour Support',
  'Record This Properly'
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
  }
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
  type: StandaloneOrbSourceType | string
  basis?: string
  note?: string
  live_retrieved?: boolean
  document_chunk?: boolean
  origin?: string
  section?: string | null
  page?: string | null
  source_id?: string
  chunk_index?: number
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
}

export type StandaloneOrbConversationResponse = {
  ok: boolean
  answer: string
  summary?: string
  conversation_id?: string | null
  confidence?: string
  sources?: StandaloneOrbSource[]
  citations?: StandaloneOrbCitation[]
  context_used?: {
    surface?: string
    mode?: string
    os_linked?: boolean
    care_record_access?: boolean
    retrieval?: StandaloneOrbRetrievalContext
  }
  guardrails?: string[]
  image_understanding_available?: boolean
  error_detail?: string
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

function logStandaloneDebug(event: string, detail: Record<string, unknown>) {
  if (!isDevEnvironment()) return
  console.debug('[standalone-orb]', event, detail)
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
  const endpoint = '/orb/standalone/conversation'
  const requestSignal = withTimeout(signal)

  try {
    const payload = await authFetch<StandaloneOrbConversationResponse & { success?: boolean; data?: { answer?: string } }>(
      endpoint,
      {
        method: 'POST',
        signal: requestSignal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: request.message,
          mode: request.mode,
          conversation_id: request.conversation_id,
          history: request.history ?? [],
          ...(request.detail ? { detail: request.detail } : {}),
          ...(request.images?.length ? { images: request.images } : {})
        })
      }
    )

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
      data?: { sources?: StandaloneOrbSource[]; citations?: StandaloneOrbCitation[] }
    }
    const nestedData =
      typed.data && typeof typed.data === 'object' ? (typed.data as Record<string, unknown>) : undefined
    const nestedSources = nestedData?.sources as StandaloneOrbSource[] | undefined
    const nestedCitations = nestedData?.citations as StandaloneOrbCitation[] | undefined
    const resolvedSources = typed.sources ?? nestedSources
    const resolvedCitations = typed.citations ?? nestedCitations ?? resolvedSources

    return {
      ok: Boolean(typed.ok ?? true),
      answer,
      summary: typed.summary,
      conversation_id: typed.conversation_id ?? request.conversation_id,
      confidence: typed.confidence,
      sources: resolvedSources,
      citations: resolvedCitations,
      context_used: typed.context_used,
      guardrails: typed.guardrails,
      image_understanding_available: typed.image_understanding_available,
      error_detail: typed.error_detail
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logStandaloneDebug('conversation_timeout', { endpoint, timeoutMs: STANDALONE_REQUEST_TIMEOUT_MS })
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
}

export type OrbKnowledgeSearchResult = {
  source_id: string
  source_title: string
  source_type: OrbKnowledgeSourceType
  citation_label: string
  section?: string | null
  page?: string | null
  chunk_index: number
  text: string
  score: number
  match_reason: string
  live_retrieved?: boolean
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

export async function fetchOrbKnowledgeSources(sourceType?: string) {
  const query = sourceType ? `?source_type=${encodeURIComponent(sourceType)}` : ''
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

export function standaloneOrbErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    if (error.status === 504) return 'ORB could not finish that response. Please try again.'
    if (error.status === 503) {
      return error.message || 'ORB is temporarily unavailable. You can still keep drafting here.'
    }
    if (error.status >= 500) return 'ORB is temporarily unavailable. You can still keep drafting here.'
    return error.message
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'ORB could not finish that response. Please try again.'
  }
  if (error instanceof Error) return error.message
  return 'ORB could not respond just now. Try again in a moment.'
}
