/**
 * Phase 5L — hybrid realtime beta sidecar.
 * Parallel browser speech recognition for partial/final transcript; MediaRecorder remains primary on Safari.
 */

import { startOrbVoiceV2Capture, type OrbVoiceV2CaptureSession } from './orb-voice-v2-capture.ts'
import { isOrbVoiceHybridSpeechAvailable } from './orb-voice-v2-realtime-beta.ts'
import { detectOrbWakePhrase } from './orb-voice-v2-wake-phrase.ts'

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult:
    | ((event: {
        resultIndex: number
        results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>
      }) => void)
    | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

export type OrbVoiceV2HybridSidecar = {
  stop: () => void
  getAccumulatedTranscript: () => string
}

export function startOrbVoiceV2HybridSidecar(input: {
  onPartialTranscript: (text: string) => void
  onWakePhrase?: () => void
  onFinalTranscript?: (text: string) => void
}): OrbVoiceV2HybridSidecar | null {
  if (!isOrbVoiceHybridSpeechAvailable()) return null
  const w = window as BrowserSpeechWindow
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-GB'

  let accumulated = ''
  let stopped = false

  recognition.onresult = (event: {
    resultIndex: number
    results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>
  }) => {
    if (stopped) return
    let interim = ''
    let finalChunk = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]
      const text = result[0]?.transcript ?? ''
      if (result.isFinal) finalChunk += text
      else interim += text
    }
    const combined = `${accumulated}${finalChunk}`.trim()
    const display = `${combined} ${interim}`.trim()
    if (display) input.onPartialTranscript(display)
    if (interim && detectOrbWakePhrase(interim)) input.onWakePhrase?.()
    if (finalChunk) {
      if (detectOrbWakePhrase(finalChunk)) {
        input.onWakePhrase?.()
      } else {
        accumulated = `${accumulated} ${finalChunk}`.trim()
        input.onFinalTranscript?.(accumulated)
      }
    }
  }

  recognition.onerror = () => {
    /* sidecar failure is non-fatal — MediaRecorder capture continues */
  }

  try {
    recognition.start()
  } catch {
    return null
  }

  return {
    stop: () => {
      stopped = true
      try {
        recognition.stop()
      } catch {
        /* ignore */
      }
    },
    getAccumulatedTranscript: () => accumulated.trim()
  }
}

export async function startOrbVoiceV2HybridCapture(input: {
  onListeningReady?: () => void
  onSpeechStart: () => void
  onPartialTranscript?: (text: string) => void
  onWakePhrase?: () => void
  onEndOfTurn: (blob: Blob, mimeType: string, options?: { transcriptHint?: string }) => void
  onError: (message: string) => void
}): Promise<OrbVoiceV2CaptureSession> {
  let sidecar: OrbVoiceV2HybridSidecar | null = null
  let transcriptHint = ''

  if (input.onPartialTranscript || input.onWakePhrase) {
    sidecar = startOrbVoiceV2HybridSidecar({
      onPartialTranscript: (text) => input.onPartialTranscript?.(text),
      onWakePhrase: input.onWakePhrase,
      onFinalTranscript: (text) => {
        transcriptHint = text
      }
    })
  }

  const base = await startOrbVoiceV2Capture({
    onListeningReady: input.onListeningReady,
    onSpeechStart: input.onSpeechStart,
    onEndOfTurn: (blob, mimeType) => {
      const hint = sidecar?.getAccumulatedTranscript() || transcriptHint
      sidecar?.stop()
      sidecar = null
      input.onEndOfTurn(blob, mimeType, hint ? { transcriptHint: hint } : undefined)
    },
    onError: input.onError
  })

  return {
    stop: () => {
      sidecar?.stop()
      base.stop()
    },
    dispose: () => {
      sidecar?.stop()
      base.dispose()
    }
  }
}
