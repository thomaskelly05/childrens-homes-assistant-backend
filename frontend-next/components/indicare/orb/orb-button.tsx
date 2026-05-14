'use client'

import { useEffect, useMemo, useState } from 'react'
import { Captions, Keyboard, MicOff, Send, Square, Volume2, VolumeX } from 'lucide-react'

import { orbStateLabel, OrbVisual } from './orb-visual'
import { OrbRuntimeController, type OrbRuntimeSnapshot } from '@/lib/orb/state'
import type { OrbContext } from '@/lib/orb/types'

export function OrbButton({
  context,
  role,
  placement = 'floating'
}: {
  context: OrbContext
  role?: string | null
  placement?: 'floating' | 'inline'
}) {
  const controller = useMemo(() => new OrbRuntimeController({ context, role }), [context, role])
  const [snapshot, setSnapshot] = useState<OrbRuntimeSnapshot>(controller.getSnapshot())
  const [captions, setCaptions] = useState(Boolean(controller.getSnapshot().preferences.captions_enabled))
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [typedText, setTypedText] = useState('')

  useEffect(() => controller.subscribe(setSnapshot), [controller])
  useEffect(() => controller.attachBrowserLifecycle(), [controller])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
        event.preventDefault()
        void controller.activate(context, role)
      }
      if (event.key === 'Escape' && (snapshot.state === 'speaking' || snapshot.loading)) {
        event.preventDefault()
        void controller.interrupt()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [context, controller, role, snapshot.loading, snapshot.state])

  const active = snapshot.sessionId || snapshot.state !== 'idle' || snapshot.error
  const transcript = snapshot.transcript.filter((entry) => entry.role !== 'system')
  const latestAssistant = [...transcript].reverse().find((entry) => entry.role === 'assistant')
  const latestUser = [...transcript].reverse().find((entry) => entry.role === 'user')
  const status = snapshot.error ? 'Orb voice is using fallback' : orbStateLabel(snapshot.state)

  async function sendTypedFallback() {
    const message = typedText.trim()
    if (!message) return
    setTypedText('')
    await controller.sendText(message, context)
  }

  return (
    <div className={placement === 'floating' ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-50 md:bottom-7 md:right-7' : 'relative inline-flex'}>
      {active ? (
        <div className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-[28px] border border-white/70 bg-slate-950/85 p-4 text-white shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <OrbVisual state={snapshot.state} size="small" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Orb</p>
              <p className="truncate text-sm font-bold">{status}</p>
              <p className="truncate text-xs text-slate-300">
                {snapshot.realtimeAvailable ? 'Realtime voice active' : 'Voice fallback ready'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void controller.setMuted(snapshot.state !== 'muted')}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              aria-label={snapshot.state === 'muted' ? 'Unmute Orb' : 'Mute Orb'}
            >
              {snapshot.state === 'muted' ? <MicOff className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => void controller.end()}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              aria-label="End Orb session"
            >
              <Square className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {captions ? (
            <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm leading-6 text-slate-100" aria-live="polite">
              {snapshot.partialTranscript ? <p>{snapshot.partialTranscript}</p> : latestAssistant ? <p>{latestAssistant.content}</p> : latestUser ? <p>{latestUser.content}</p> : <p>Captions will appear here when Orb hears or speaks.</p>}
            </div>
          ) : null}

          {snapshot.pendingDraft ? (
            <div className="mt-3 rounded-2xl border border-purple-300/40 bg-purple-400/10 p-3 text-xs leading-5 text-purple-50">
              Draft prepared. Review and confirm before anything is saved.
            </div>
          ) : null}

          {snapshot.error ? (
            <div className="mt-3 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-3 text-xs leading-5 text-amber-50">
              {snapshot.error}
            </div>
          ) : null}

          {fallbackOpen ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void sendTypedFallback()
              }}
            >
              <label htmlFor="orb-accessible-text" className="sr-only">Type to Orb</label>
              <input
                id="orb-accessible-text"
                value={typedText}
                onChange={(event) => setTypedText(event.target.value)}
                className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-300"
                placeholder="Type instead..."
              />
              <button type="submit" disabled={!typedText.trim() || snapshot.loading} className="rounded-full bg-cyan-300 px-3 text-slate-950 disabled:opacity-50" aria-label="Send typed message to Orb">
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <button type="button" onClick={() => {
              setCaptions((value) => {
                const next = !value
                controller.updatePreferences({ ...snapshot.preferences, captions_enabled: next })
                return next
              })
            }} className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300">
              <Captions className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              {captions ? 'Hide captions' : 'Captions'}
            </button>
            <button type="button" onClick={() => setFallbackOpen((value) => !value)} className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300">
              <Keyboard className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Type fallback
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void controller.activate(context, role)}
        data-testid={placement === 'floating' ? 'orb-button' : 'orb-button-inline'}
        className={`group relative inline-flex items-center justify-center rounded-full border border-white/70 bg-white/95 p-2 shadow-2xl shadow-blue-950/20 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-cyan-900/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
          placement === 'inline' ? '' : 'min-h-16 min-w-16'
        }`}
        aria-label={snapshot.state === 'speaking' || snapshot.loading ? 'Interrupt Orb and start listening' : 'Tap Orb and talk'}
        aria-pressed={snapshot.state === 'listening'}
      >
        <span className="absolute inset-0 rounded-full bg-cyan-300/20 opacity-0 blur-xl transition group-hover:opacity-100" aria-hidden />
        <OrbVisual state={snapshot.state === 'idle' ? 'idle' : snapshot.state} size="small" />
        <span className="sr-only">
          {snapshot.state === 'speaking' || snapshot.loading ? 'Interrupt Orb' : 'Start Orb voice conversation'}
        </span>
      </button>
      <div className="sr-only" aria-live="polite">
        Orb status: {status}. Use Control Shift Space to activate. Press Escape to interrupt while Orb is speaking.
      </div>
      <Volume2 className="hidden" aria-hidden />
    </div>
  )
}

