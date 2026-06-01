'use client'

import { useEffect, useState } from 'react'

import { clearOrbClientDebugEvents, emitOrbClientDebug, getOrbClientDebugEvents } from '@/lib/orb/orb-client-debug'

function isDebugOn() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('debugVoice') === '1'
}

function screenState() {
  const text = document.body?.innerText || ''
  return {
    voicePanel: text.includes('ORB Voice'),
    dictatePanel: text.includes('ORB Dictate'),
    composerMic: Boolean(document.querySelector('[data-orb-composer-mic]')),
    voiceStage: document.querySelector('[data-orb-voice-start-stage]')?.getAttribute('data-orb-voice-start-stage'),
    listening: /Listening|Listening…/.test(text),
    recording: /Recording|Recording audio|Processing recorded audio|Stopping recording|Audio captured/i.test(text),
    stopped: /Ready|Recording stopped|Audio captured|Paste transcript instead/i.test(text) && !/Recording audio/i.test(text),
    processing: /Processing recorded audio|Stopping recording|Preparing transcription|Audio captured/i.test(text),
    errorText: /failed|unavailable|denied|blocked|could not start/i.test(text),
    statusText: Array.from(document.querySelectorAll('[role="status"], [data-orb-dictate-timer], [data-orb-voice-status-label], [data-orb-voice-mic-status]'))
      .map((el) => el.textContent?.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 8)
  }
}

function emitSnapshot(label: string, delayMs?: number) {
  emitOrbClientDebug({
    area: 'composer',
    event: delayMs ? `after_click_${delayMs}ms` : 'click',
    detail: { label, state: screenState() }
  })
}

export function OrbClientFlightRecorder() {
  const [enabled, setEnabled] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isDebugOn()) return
    setEnabled(true)
    emitOrbClientDebug({ area: 'browser', event: 'recorder_enabled', detail: screenState() })

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
      emitOrbClientDebug({ area: 'composer', event: 'click', detail: { label, disabled: Boolean(button.disabled), state: screenState() } })
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
    <div className="fixed bottom-3 right-3 z-[9999] rounded-2xl border border-sky-300 bg-white p-3 text-xs text-slate-800 shadow-2xl dark:border-sky-700 dark:bg-slate-950 dark:text-white">
      <strong>ORB flight recorder</strong>
      <div>{count} events</div>
      <div className="mt-1 text-[11px] opacity-70">Console: ORB_DEBUG_EVENTS()</div>
      <button type="button" className="mt-2 rounded-full border px-2 py-1" onClick={() => { clearOrbClientDebugEvents(); setCount(0) }}>Clear</button>
    </div>
  )
}
