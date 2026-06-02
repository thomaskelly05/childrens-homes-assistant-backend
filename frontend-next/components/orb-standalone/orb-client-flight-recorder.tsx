'use client'

import { useEffect, useState } from 'react'

import {
  clearOrbClientDebugEvents,
  copyOrbClientDebugEvents,
  emitOrbClientDebug,
  getOrbClientDebugEvents
} from '@/lib/orb/orb-client-debug'

function isDebugOn() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('debugVoice') === '1'
}

function readAttr(name: string): string | undefined {
  const el =
    document.querySelector(`[${name}]`) ??
    document.querySelector(`[data-orb-dictate-station][${name}]`) ??
    document.querySelector(`[data-orb-voice-station][${name}]`)
  return el?.getAttribute(name) ?? undefined
}

function supportedMimeTypes(): Record<string, boolean> {
  if (typeof MediaRecorder === 'undefined') {
    return {
      'audio/webm': false,
      'audio/webm;codecs=opus': false,
      'audio/mp4': false,
      'audio/mpeg': false,
      'audio/wav': false
    }
  }
  const candidates = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav'
  ]
  const out: Record<string, boolean> = {}
  for (const type of candidates) {
    try {
      out[type] = MediaRecorder.isTypeSupported(type)
    } catch {
      out[type] = false
    }
  }
  return out
}

function browserCapabilities() {
  const w = typeof window !== 'undefined' ? window : undefined
  const n = typeof navigator !== 'undefined' ? navigator : undefined
  return {
    userAgent: n?.userAgent?.slice(0, 240),
    isSecureContext: Boolean(w?.isSecureContext),
    getUserMedia: Boolean(n?.mediaDevices?.getUserMedia),
    speechRecognition: Boolean(
      w && ('SpeechRecognition' in w || 'webkitSpeechRecognition' in (w as Window & { webkitSpeechRecognition?: unknown }))
    ),
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    audioContext: Boolean(w && (w.AudioContext || (w as Window & { webkitAudioContext?: unknown }).webkitAudioContext)),
    mimeTypes: supportedMimeTypes()
  }
}

function screenState() {
  return {
    voicePanel: Boolean(document.querySelector('[data-orb-voice-station]')),
    dictatePanel: Boolean(document.querySelector('[data-orb-dictate-station]')),
    composerMic: Boolean(document.querySelector('[data-orb-composer-mic]')),
    composerMicRoute: readAttr('data-orb-composer-mic-route'),
    composerMicReason: readAttr('data-orb-composer-mic-reason'),
    voiceState: readAttr('data-orb-voice-state'),
    voiceStartStage: readAttr('data-orb-voice-start-stage'),
    voicePhase: readAttr('data-orb-voice-phase'),
    voiceCaptureState: readAttr('data-orb-voice-capture-state'),
    voiceCaptureActive: readAttr('data-orb-voice-capture-active'),
    voiceListening: readAttr('data-orb-voice-listening'),
    voiceSpeaking: readAttr('data-orb-voice-speaking'),
    voiceProvider: readAttr('data-orb-voice-provider'),
    voiceRealtimeAvailable: readAttr('data-orb-voice-realtime-available'),
    voiceSessionConnected: readAttr('data-orb-voice-session-connected'),
    voiceTransportLive: readAttr('data-orb-voice-transport-live'),
    voiceError: readAttr('data-orb-voice-error'),
    dictateState: readAttr('data-orb-dictate-state'),
    dictateCaptureMode: readAttr('data-orb-dictate-capture-mode'),
    dictateStartSource: readAttr('data-orb-dictate-start-source'),
    dictateRecordingState: readAttr('data-orb-dictate-recording-state'),
    dictateRecorderMode: readAttr('data-orb-dictate-recorder-mode'),
    dictateTranscriptLength: readAttr('data-orb-dictate-transcript-length'),
    dictateAudioSize: readAttr('data-orb-dictate-audio-size'),
    dictateCaptureSource: readAttr('data-orb-dictate-capture-source'),
    dictateChunkCount: readAttr('data-orb-dictate-chunk-count'),
    dictateSampleCount: readAttr('data-orb-dictate-sample-count'),
    dictateStatus: readAttr('data-orb-dictate-status'),
    dictateSpeechError: readAttr('data-orb-dictate-speech-error'),
    dictateRestartCount: readAttr('data-orb-dictate-restart-count')
  }
}

function emitSnapshot(label: string, delayMs: number) {
  emitOrbClientDebug({
    area: 'composer',
    event: `after_click_${delayMs}ms`,
    detail: { label, delayMs, state: screenState(), capabilities: browserCapabilities() }
  })
}

export function OrbClientFlightRecorder() {
  const [enabled, setEnabled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [count, setCount] = useState(0)
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!isDebugOn()) return
    setEnabled(true)
    emitOrbClientDebug({
      area: 'browser',
      event: 'recorder_enabled',
      detail: { state: screenState(), capabilities: browserCapabilities() }
    })

    const collapseTimer = window.setTimeout(() => setCollapsed(true), 3000)

    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest('button,[role="button"]') as HTMLButtonElement | null
      if (!button) return
      const label = [button.getAttribute('aria-label'), button.getAttribute('title'), button.innerText, button.textContent]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180)
      emitOrbClientDebug({
        area: 'composer',
        event: 'click',
        detail: { label, disabled: Boolean(button.disabled), state: screenState(), capabilities: browserCapabilities() }
      })
      window.setTimeout(() => emitSnapshot(label, 500), 500)
      window.setTimeout(() => emitSnapshot(label, 1000), 1000)
      window.setTimeout(() => emitSnapshot(label, 3000), 3000)
      window.setTimeout(() => emitSnapshot(label, 8000), 8000)
    }

    document.addEventListener('click', handler, true)
    const interval = window.setInterval(() => setCount(getOrbClientDebugEvents().length), 1000)
    return () => {
      window.clearTimeout(collapseTimer)
      document.removeEventListener('click', handler, true)
      window.clearInterval(interval)
    }
  }, [])

  if (!enabled || hidden) return null

  return (
    <div
      className="orb-flight-recorder fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] max-w-[min(220px,calc(100vw-1.5rem))] rounded-2xl border border-sky-300/80 bg-white/95 p-2 text-xs text-slate-800 shadow-lg backdrop-blur-md dark:border-sky-700/80 dark:bg-slate-950/95 dark:text-white max-lg:bottom-auto max-lg:left-auto"
      data-orb-flight-recorder
      data-orb-flight-recorder-collapsed={collapsed ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="text-[11px]">ORB flight recorder</strong>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="rounded-full border px-1.5 py-0.5 text-[10px]"
            onClick={() => setCollapsed((value) => !value)}
            data-orb-flight-recorder-toggle
          >
            {collapsed ? 'Show' : 'Minimise'}
          </button>
          <button
            type="button"
            className="rounded-full border px-1.5 py-0.5 text-[10px]"
            onClick={() => setHidden(true)}
            data-orb-flight-recorder-hide
          >
            Hide
          </button>
        </div>
      </div>
      {!collapsed ? (
        <>
          <div className="mt-1">{count} events</div>
          <div className="mt-1 text-[10px] opacity-70">Console: ORB_DEBUG_EVENTS()</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded-full border px-2 py-1"
              onClick={() => {
                clearOrbClientDebugEvents()
                setCount(0)
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="rounded-full border px-2 py-1"
              onClick={() => {
                void copyOrbClientDebugEvents().then((result) => {
                  if (result === true) {
                    setCopyNotice('Copied')
                  } else {
                    setCopyNotice('Copy failed — run ORB_DEBUG_COPY() in console')
                    // eslint-disable-next-line no-console
                    console.info('[ORB_DEBUG_COPY]', result)
                  }
                  window.setTimeout(() => setCopyNotice(null), 4000)
                })
              }}
            >
              Copy debug report
            </button>
          </div>
          {copyNotice ? <p className="mt-1 text-[10px] text-sky-700 dark:text-sky-200">{copyNotice}</p> : null}
        </>
      ) : (
        <p className="mt-0.5 text-[10px] opacity-70">{count} events · debugVoice=1</p>
      )}
    </div>
  )
}
