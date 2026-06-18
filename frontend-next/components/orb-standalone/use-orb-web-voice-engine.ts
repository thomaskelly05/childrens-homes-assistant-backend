'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { ORBWebVoiceEngine } from '@/lib/orb/voice/engine/orb-web-voice-engine'
import type {
  OrbVoiceTransportId,
  OrbVoiceTransportSelection,
  OrbWebVoiceEngineState
} from '@/lib/orb/voice/engine/orb-web-voice-engine-types'

export type UseOrbWebVoiceEngineOptions = {
  onSubmitTranscript?: (text: string) => void | Promise<void>
  speakFallback?: (text: string, onEnd?: () => void) => void
  onStateChange?: (state: OrbWebVoiceEngineState) => void
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onUserMessage?: (message: string) => void
  onTransportChange?: (selection: OrbVoiceTransportSelection) => void
}

export function useOrbWebVoiceEngine(options: UseOrbWebVoiceEngineOptions = {}) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const submitRef = useRef(options.onSubmitTranscript)
  submitRef.current = options.onSubmitTranscript
  const speakRef = useRef(options.speakFallback)
  speakRef.current = options.speakFallback

  const engineRef = useRef<ORBWebVoiceEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new ORBWebVoiceEngine({
      onSubmitTranscript: (text) => submitRef.current?.(text),
      speakFallback: (text, onEnd) => speakRef.current?.(text, onEnd),
      callbacks: {
        onStateChange: (next) => optionsRef.current.onStateChange?.(next),
        onPartialTranscript: (text) => optionsRef.current.onPartialTranscript?.(text),
        onFinalTranscript: (text) => optionsRef.current.onFinalTranscript?.(text),
        onUserMessage: (message) => optionsRef.current.onUserMessage?.(message),
        onTransportChange: (sel) => optionsRef.current.onTransportChange?.(sel)
      }
    })
  }

  const [state, setState] = useState<OrbWebVoiceEngineState>('idle')
  const [transport, setTransport] = useState<OrbVoiceTransportId>('unsupported')
  const [transcript, setTranscript] = useState('')
  const [partial, setPartial] = useState('')
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [selection, setSelection] = useState<OrbVoiceTransportSelection | null>(null)

  const bindCallbacks = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engine['deps'] = {
      onSubmitTranscript: (text: string) => submitRef.current?.(text),
      speakFallback: (text: string, onEnd?: () => void) => speakRef.current?.(text, onEnd),
      callbacks: {
        onStateChange: (next: OrbWebVoiceEngineState) => {
          setState(next)
          optionsRef.current.onStateChange?.(next)
        },
        onPartialTranscript: (text: string) => {
          setPartial(text)
          optionsRef.current.onPartialTranscript?.(text)
        },
        onFinalTranscript: (text: string) => {
          setTranscript(text)
          setPartial('')
          optionsRef.current.onFinalTranscript?.(text)
        },
        onUserMessage: (message: string) => {
          setUserMessage(message)
          optionsRef.current.onUserMessage?.(message)
        },
        onTransportChange: (sel: OrbVoiceTransportSelection) => {
          setSelection(sel)
          setTransport(sel.selectedTransport)
          optionsRef.current.onTransportChange?.(sel)
        }
      }
    }
  }, [])

  const start = useCallback(async () => {
    bindCallbacks()
    setUserMessage(null)
    return (await engineRef.current?.start()) ?? false
  }, [bindCallbacks])

  const stop = useCallback(async () => {
    return (await engineRef.current?.stop()) ?? ''
  }, [])

  const stopAndSubmit = useCallback(async () => {
    const text = await stop()
    if (text) await engineRef.current?.submitTranscript(text)
    return text
  }, [stop])

  const cancel = useCallback(() => {
    engineRef.current?.cancel()
  }, [])

  const reset = useCallback(async () => {
    await engineRef.current?.reset()
    setTranscript('')
    setPartial('')
    setUserMessage(null)
  }, [])

  const speakResponse = useCallback(async (text: string) => {
    await engineRef.current?.speakResponse(text)
  }, [])

  const interruptSpeaking = useCallback(() => {
    engineRef.current?.interruptSpeaking()
  }, [])

  const displayTranscript = useMemo(() => {
    const committed = transcript.trim()
    const live = partial.trim()
    if (!live) return committed
    return committed ? `${committed} ${live}` : live
  }, [partial, transcript])

  return {
    state,
    transport,
    selection,
    transcript,
    partial,
    displayTranscript,
    userMessage,
    userFacingMessage: engineRef.current?.getUserFacingMessage() ?? null,
    isListening: state === 'listening' || state === 'capturing',
    start,
    stop,
    stopAndSubmit,
    cancel,
    reset,
    speakResponse,
    interruptSpeaking
  }
}
