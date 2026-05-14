'use client'

import { useEffect, useMemo, useState } from 'react'
import { Captions, Keyboard, Send, Square } from 'lucide-react'

import { orbStateLabel, OrbVisual } from './orb-visual'
import { useAuth } from '@/contexts/auth-context'
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
  const { status, user, csrfReady } = useAuth()
  const orbReady = status === 'authenticated' && Boolean(user) && csrfReady
  const effectiveRole = role ?? user?.role
  const contextKey = useMemo(() => JSON.stringify(context), [context])
  const controller = useMemo(() => new OrbRuntimeController({ context: JSON.parse(contextKey) as OrbContext, role: effectiveRole }), [contextKey, effectiveRole])
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
        if (orbReady) void controller.activate(context, effectiveRole)
      }
      if (event.key === 'Escape' && (snapshot.state === 'speaking' || snapshot.loading)) {
        event.preventDefault()
        void controller.interrupt()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [context, controller, effectiveRole, orbReady, snapshot.loading, snapshot.state])

  const active = snapshot.sessionId || snapshot.state !== 'idle' || snapshot.error
  const transcript = snapshot.transcript.filter((entry) => entry.role !== 'system')
  const latestAssistant = [...transcript].reverse().find((entry) => entry.role === 'assistant')
  const latestUser = [...transcript].reverse().find((entry) => entry.role === 'user')
  const orbStatus = snapshot.error ? 'Orb needs a moment' : orbStateLabel(snapshot.state)
  const childLock = (context.child_context_lock || {}) as { active?: boolean; child_name?: string; retrieval_scope?: string }
  const childName = typeof childLock.child_name === 'string' ? childLock.child_name : undefined

  async function sendTypedFallback() {
    const message = typedText.trim()
    if (!message || !orbReady) return
    setTypedText('')
    await controller.sendText(message, context)
  }

  const authMessage = status === 'unauthenticated'
    ? 'Your session expired. Sign in again to use Orb.'
    : 'Orb is waiting for your secure session.'

  return (
    <div className={placement === 'floating' ? 'fixed bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] right-3 z-50 md:bottom-7 md:right-7' : 'relative inline-flex'}>
      {orbReady && active ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 px-4 text-white backdrop-blur-xl">
          <section className="flex w-full max-w-xl flex-col items-center text-center">
            <OrbVisual state={snapshot.state} />
            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">IndiCare OS Orb</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.07em]">{orbStatus}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              {childLock.active && childName
                ? `Voice-first operational assistant. I am locked to ${childName}'s journey and will not search other children.`
                : 'Voice-first operational assistant. Select a child before asking for child records.'}
            </p>
            <div className="mt-5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              {childLock.active && childName ? `Active child: ${childName}` : 'No active child context'}
            </div>

            {snapshot.error ? (
              <p className="mt-5 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
                {snapshot.error}
              </p>
            ) : null}

            {snapshot.pendingDraft ? (
              <p className="mt-5 rounded-full border border-purple-300/30 bg-purple-300/10 px-4 py-2 text-sm text-purple-100">
                Draft prepared. Confirm before anything is saved.
              </p>
            ) : null}

            {captions ? (
              <div className="mt-6 max-h-40 w-full overflow-auto rounded-3xl border border-white/10 bg-white/10 p-4 text-left text-sm leading-7 text-slate-100" aria-live="polite">
                {snapshot.partialTranscript ? <p>{snapshot.partialTranscript}</p> : latestAssistant ? <p>{latestAssistant.content}</p> : latestUser ? <p>{latestUser.content}</p> : <p>Captions will appear when Orb hears or speaks.</p>}
              </div>
            ) : null}

            {fallbackOpen ? (
              <form
                className="mt-5 flex w-full gap-2"
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
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-300"
                  placeholder="Type to Orb..."
                  aria-label={childName ? `Type to Orb about ${childName}` : 'Type to Orb'}
                />
                <button type="submit" disabled={!typedText.trim() || snapshot.loading} className="rounded-full bg-cyan-300 px-4 text-slate-950 disabled:opacity-50" aria-label="Send typed message to Orb">
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </form>
            ) : null}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => {
                setCaptions((value) => {
                  const next = !value
                  controller.updatePreferences({ ...snapshot.preferences, captions_enabled: next })
                  return next
                })
              }} className="rounded-full bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Captions className="mr-2 inline h-4 w-4" aria-hidden />
                {captions ? 'Hide captions' : 'Captions'}
              </button>
              <button type="button" onClick={() => setFallbackOpen((value) => !value)} className="rounded-full bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Keyboard className="mr-2 inline h-4 w-4" aria-hidden />
                Type to Orb
              </button>
              <button type="button" onClick={() => void controller.end()} className="rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Square className="mr-2 inline h-4 w-4" aria-hidden />
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (orbReady) void controller.activate(context, effectiveRole)
        }}
        data-testid={placement === 'floating' ? 'orb-button' : 'orb-button-inline'}
        className={`group relative inline-flex items-center justify-center rounded-full border border-white/70 bg-black/85 p-1 shadow-[0_0_42px_rgba(34,211,238,0.36)] backdrop-blur transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
          placement === 'inline' ? '' : 'min-h-16 min-w-16'
        }`}
        aria-label={orbReady ? (snapshot.state === 'speaking' || snapshot.loading ? 'Interrupt Orb and start listening' : 'Tap Orb and talk') : authMessage}
        aria-pressed={snapshot.state === 'listening'}
        disabled={!orbReady}
        title={orbReady ? undefined : authMessage}
      >
        <span className="absolute inset-0 rounded-full bg-cyan-300/20 blur-xl transition group-hover:bg-cyan-200/30" aria-hidden />
        <OrbVisual state={snapshot.state === 'idle' ? 'idle' : snapshot.state} size="small" />
        <span className="sr-only">
          {snapshot.state === 'speaking' || snapshot.loading ? 'Interrupt Orb' : 'Start Orb voice conversation'}
        </span>
      </button>
      <div className="sr-only" aria-live="polite">
        Orb status: {orbStatus}. Use Control Shift Space to activate. Press Escape to interrupt while Orb is speaking.
      </div>
    </div>
  )
}

