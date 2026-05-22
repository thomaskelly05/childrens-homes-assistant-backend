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
  type: StandaloneOrbSourceType
  basis?: string
  note?: string
  live_retrieved?: boolean
}

export type StandaloneOrbCitation = StandaloneOrbSource

export type StandaloneOrbRetrievalContext = {
  strategy?: string
  live_retrieved?: boolean
  source_count?: number
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
