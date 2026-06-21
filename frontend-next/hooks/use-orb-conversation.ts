'use client'

import { useCallback, useRef, useState } from 'react'

import { buildOrbBrainConversationRequest, askOrbBrain } from '@/lib/orb/orb-brain-router'
import { requestOrbVoiceRespond } from '@/lib/orb/voice/orb-voice-respond-client'
import {
  queryStandaloneOrbConversation,
  type StandaloneOrbConversationRequest,
  type StandaloneOrbConversationResponse,
  type StandaloneOrbStreamCallbacks,
  isStandaloneOrbRetryableNetworkError
} from '@/lib/orb/standalone-client'
import { streamTextIntoView } from '@/lib/orb/streaming-text'

export type OrbConversationTransportContext = {
  source?: 'chat' | 'voice'
  mode?: string
}

export type ExecuteOrbConversationTransportOptions = {
  request: StandaloneOrbConversationRequest
  context?: OrbConversationTransportContext
  signal?: AbortSignal
  stream?: StandaloneOrbStreamCallbacks
  /** POST fallback when SSE fails before tokens */
  runPostFallback: () => Promise<StandaloneOrbConversationResponse>
  refreshSession?: () => Promise<void>
  internalRetry?: boolean
  /** Lightweight voice brain payload for /orb/voice/respond */
  voiceRespond?: {
    message?: string
    transcript?: string
    mode?: string
    sessionTurns?: Array<{ role: 'adult' | 'orb'; text: string }>
    sessionMemory?: Record<string, unknown>
    /** Backward-compatible aliases */
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    session_memory?: Record<string, unknown>
  }
}

export type OrbConversationTransportResult = {
  response: StandaloneOrbConversationResponse
  usedPostFallback: boolean
  streamInterrupted: boolean
}

/**
 * Canonical ORB conversation transport — SSE stream with POST fallback.
 * Extracted from orb-care-companion (Phase 1); companion owns workspace UI state.
 */
export async function executeOrbConversationTransport(
  options: ExecuteOrbConversationTransportOptions
): Promise<OrbConversationTransportResult> {
  const {
    request,
    context,
    signal,
    stream,
    runPostFallback,
    refreshSession,
    internalRetry,
    voiceRespond
  } = options

  if (context?.source === 'voice' && voiceRespond) {
    const voiceResult = await requestOrbVoiceRespond(
      {
        message: request.message,
        transcript: voiceRespond.transcript ?? voiceRespond.message ?? request.message,
        mode: voiceRespond.mode,
        sessionTurns: voiceRespond.sessionTurns,
        sessionMemory: (voiceRespond.sessionMemory ?? voiceRespond.session_memory) as never,
        history: voiceRespond.history,
        session_memory: voiceRespond.session_memory as never
      },
      signal
    )
    const answer = voiceResult.reply
    if (stream?.onToken) {
      await streamTextIntoView({
        text: answer,
        signal,
        onChunk: (partial) => {
          stream.onToken?.('', partial)
        }
      })
    }
    return {
      response: {
        ok: true,
        standalone: true,
        os_records_accessed: false,
        answer,
        context_used: {
          prompt_tier: voiceResult.prompt_tier || 'voice_fast',
          voice_fast_path: true,
          embeddings_used: voiceResult.embeddings_used ?? false,
          retrieval_used: voiceResult.retrieval_used ?? false
        } as StandaloneOrbConversationResponse['context_used']
      },
      usedPostFallback: false,
      streamInterrupted: false
    }
  }

  let response: StandaloneOrbConversationResponse | null = null
  let streamFailedBeforeToken = false
  let streamPartial = ''
  let streamInterrupted = false

  const streamCallbacks: StandaloneOrbStreamCallbacks | undefined = stream
    ? {
        onToken: (delta, partial) => {
          streamPartial = partial
          stream.onToken?.(delta, partial)
        },
        onStatus: stream.onStatus,
        onMetadata: stream.onMetadata
      }
    : undefined

  try {
    response = await askOrbBrain({
      request,
      context,
      signal,
      stream: streamCallbacks
    })
  } catch (streamTransportError) {
    if (streamTransportError instanceof DOMException && streamTransportError.name === 'AbortError') {
      throw streamTransportError
    }
    const hadPartial = Boolean(streamPartial.trim())
    if (hadPartial) {
      streamInterrupted = true
      response = {
        ok: true,
        standalone: true,
        os_records_accessed: false,
        answer: streamPartial.trim(),
        error_detail: 'stream_interrupted'
      }
    } else {
      streamFailedBeforeToken = true
    }
  }

  if (!response && streamFailedBeforeToken) {
    try {
      response = await runPostFallback()
    } catch (firstError) {
      if (!internalRetry && isStandaloneOrbRetryableNetworkError(firstError) && refreshSession) {
        await refreshSession()
        response = await runPostFallback()
      } else {
        throw firstError
      }
    }
    const fallbackAnswer = (response.answer || '').trim()
    if (fallbackAnswer && stream?.onToken) {
      await streamTextIntoView({
        text: fallbackAnswer,
        signal,
        onChunk: (partial) => {
          streamPartial = partial
          stream.onToken?.('', partial)
        }
      })
    }
    return { response, usedPostFallback: true, streamInterrupted: false }
  }

  if (!response) {
    throw new Error('ORB did not return a response.')
  }

  return { response, usedPostFallback: false, streamInterrupted }
}

/** Hook wrapper — conversation transport + lightweight send state for future extraction. */
export function useOrbConversation() {
  const [isSending, setIsSending] = useState(false)
  const [transportError, setTransportError] = useState<string | null>(null)
  const sendInFlightRef = useRef(false)

  const sendConversation = useCallback(
    async (options: ExecuteOrbConversationTransportOptions) => {
      if (sendInFlightRef.current) return null
      sendInFlightRef.current = true
      setIsSending(true)
      setTransportError(null)
      try {
        return await executeOrbConversationTransport(options)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ORB could not respond.'
        setTransportError(message)
        throw error
      } finally {
        sendInFlightRef.current = false
        setIsSending(false)
      }
    },
    []
  )

  return {
    isSending,
    transportError,
    sendConversation,
    buildRequest: buildOrbBrainConversationRequest
  }
}
