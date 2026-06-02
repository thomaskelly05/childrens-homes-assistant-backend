const ENV_MARKERS = ['OPENAI_API_KEY', 'ORB_REALTIME_ENABLED', 'ORB_VOICE_REALTIME_PROVIDER'] as const

const TECHNICAL_PATTERNS = [
  /configure realtime voice/i,
  /live orb voice is not available yet/i,
  /realtime_transcription/i,
  /server realtime/i
] as const

export const ORB_VOICE_UNAVAILABLE_HEADLINE = 'Live voice is unavailable right now'

export const ORB_VOICE_UNAVAILABLE_BODY =
  'You can still use Dictate or type to ORB.'

export const ORB_VOICE_DICTATE_READY_BODY =
  'Dictate is ready. Live conversation is unavailable right now.'

export const ORB_VOICE_DEBUG_CONFIG_HINT =
  'Realtime voice not configured: OPENAI_API_KEY / ORB_REALTIME_ENABLED / ORB_VOICE_REALTIME_PROVIDER.'

function containsEnvMarker(text: string): boolean {
  return ENV_MARKERS.some((marker) => text.includes(marker))
}

function looksTechnical(text: string): boolean {
  if (containsEnvMarker(text)) return true
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text))
}

export function sanitizeOrbVoiceUserMessage(
  message: string | null | undefined,
  options?: { debug?: boolean; dictateRealtimeReady?: boolean }
): string | null {
  const trimmed = message?.trim()
  if (!trimmed) return null
  if (options?.debug) return trimmed
  if (looksTechnical(trimmed)) {
    if (options?.dictateRealtimeReady) return ORB_VOICE_DICTATE_READY_BODY
    return ORB_VOICE_UNAVAILABLE_BODY
  }
  return trimmed
}

export function orbVoiceUnavailablePresentation(options?: {
  debug?: boolean
  dictateRealtimeReady?: boolean
}): { headline: string; detail: string } {
  if (options?.debug) {
    return {
      headline: ORB_VOICE_UNAVAILABLE_HEADLINE,
      detail: ORB_VOICE_DEBUG_CONFIG_HINT
    }
  }
  return {
    headline: ORB_VOICE_UNAVAILABLE_HEADLINE,
    detail: options?.dictateRealtimeReady ? ORB_VOICE_DICTATE_READY_BODY : ORB_VOICE_UNAVAILABLE_BODY
  }
}
