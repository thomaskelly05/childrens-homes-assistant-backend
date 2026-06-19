'use client'

import { useCallback, useRef, useState } from 'react'

import { buildOrbBrainConversationRequest, askOrbBrain } from '@/lib/orb/orb-brain-router'
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
    internalRetry
  } = options

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
