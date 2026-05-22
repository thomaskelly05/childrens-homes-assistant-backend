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

export type StandaloneOrbConversationRequest = {
  message: string
  mode: StandaloneOrbMode | string
  conversation_id?: string | null
  history?: Array<{ role: string; content: string }>
}

export type StandaloneOrbConversationResponse = {
  ok: boolean
  answer: string
  summary?: string
  conversation_id?: string | null
  confidence?: string
  context_used?: {
    surface?: string
    mode?: string
    os_linked?: boolean
    care_record_access?: boolean
  }
  guardrails?: string[]
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
  const payload = await authFetch<StandaloneOrbConversationResponse>('/orb/standalone/conversation', {
    method: 'POST',
    signal: withTimeout(signal),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: request.message,
      mode: request.mode,
      conversation_id: request.conversation_id,
      history: request.history ?? []
    })
  })
  if (!payload?.answer) throw new AuthApiError(503, 'ORB could not complete that request.')
  return payload
}

export const sendStandaloneOrbMessage = queryStandaloneOrbConversation

export function standaloneOrbErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) return error.message
  if (error instanceof Error) return error.message
  return 'ORB could not respond just now. Try again in a moment.'
}
