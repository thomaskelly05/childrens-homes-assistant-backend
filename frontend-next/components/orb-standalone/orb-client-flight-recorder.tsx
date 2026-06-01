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
    voiceStartStage: readAttr('data-orb-voice-start-stage'),
    voiceCaptureActive: readAttr('data-orb-voice-capture-active'),
    voiceListening: readAttr('data-orb-voice-listening'),
    voiceProvider: readAttr('data-orb-voice-provider'),
    dictateRecordingState: readAttr('data-orb-dictate-recording-state'),
    dictateRecorderMode: readAttr('data-orb-dictate-recorder-mode'),
    dictateAudioSize: readAttr('data-orb-dictate-audio-size'),
    dictateStatus: readAttr('data-orb-dictate-status')
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
      document.removeEventListener('click', handler, true)
      window.clearInterval(interval)
    }
  }, [])

  if (!enabled) return null

  return (
    <div className="fixed bottom-3 right-3 z-[9999] max-w-[220px] rounded-2xl border border-sky-300 bg-white p-3 text-xs text-slate-800 shadow-2xl dark:border-sky-700 dark:bg-slate-950 dark:text-white">
      <strong>ORB flight recorder</strong>
      <div>{count} events</div>
      <div className="mt-1 text-[11px] opacity-70">Console: ORB_DEBUG_EVENTS()</div>
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
    </div>
  )
}
