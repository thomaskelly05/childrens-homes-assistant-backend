'use client'

import { useEffect, useMemo, useState } from 'react'
import { Captions, Keyboard, Send, Square } from 'lucide-react'

import { orbStateLabel, OrbVisual } from './orb-visual'
import { useAuth } from '@/contexts/auth-context'
import { OrbRuntimeController, type OrbRuntimeSnapshot } from '@/lib/orb/state'
import type { OrbContext } from '@/lib/orb/types'

export function OrbButton({ context, role, placement = 'floating' }: { context: OrbContext; role?: string | null; placement?: 'floating' | 'inline' }) {
  const { status, user, csrfReady } = useAuth()
  const orbReady = status === 'authenticated' && Boolean(user) && csrfReady
  const effectiveRole = role ?? user?.role
  const contextKey = useMemo(() => JSON.stringify(context), [context])
  const controller = useMemo(() => new OrbRuntimeController({ context: JSON.parse(contextKey) as OrbContext, role: effectiveRole }), [contextKey, effectiveRole])
  const [snapshot, setSnapshot] = useState<OrbRuntimeSnapshot>(controller.getSnapshot())
  const [captions, setCaptions] = useState(Boolean(controller.getSnapshot().preferences.captions_enabled))
  const [fallbackOpen, setFallbackOpen] = useState(true)
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
  const orbStatus = snapshot.error ? 'ORB needs a moment' : orbStateLabel(snapshot.state)
  const ambientState = snapshot.state === 'safeguarding_sensitive' || snapshot.state === 'inspection'
    ? 'safeguarding_cautious'
    : snapshot.state === 'recording' || snapshot.state === 'dictation' || snapshot.state === 'passive_listening'
      ? 'listening'
      : snapshot.state === 'muted'
        ? 'private_mode'
        : snapshot.state
  const childLock = (context.child_context_lock || {}) as { active?: boolean; child_name?: string; retrieval_scope?: string }
  const childName = typeof childLock.child_name === 'string' ? childLock.child_name : undefined

  async function sendTypedFallback() {
    const message = typedText.trim()
    if (!message || !orbReady) return
    setTypedText('')
    await controller.sendText(message, context)
  }

  const authMessage = status === 'unauthenticated' ? 'Your session expired. Sign in again to use ORB.' : 'ORB is waiting for your secure session.'

  return (
    <div
      data-orb-floating-dock={placement === 'floating' ? 'true' : undefined}
      className={placement === 'floating' ? 'orb-floating-dock pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-50 md:bottom-7 md:right-7' : 'relative inline-flex'}
    >
      {orbReady && active ? (
        <div
          className="orb-overlay-shell orb-standalone-atmosphere fixed inset-0 z-[70] flex items-center justify-center px-4 text-white"
          data-orb-state={ambientState}
        >
          <div className="orb-screen-edge-pulse" data-orb-state={ambientState} aria-hidden />
          <section className="orb-overlay-interactive flex w-full max-w-3xl flex-col items-center text-center" data-orb-state={ambientState}>
            <OrbVisual state={snapshot.state} />
            <p className="orb-kicker mt-8 text-[11px] font-black uppercase tracking-[0.28em]">IndiCare OS ORB</p>
            <h2 className="orb-title-glow mt-3 text-4xl font-black tracking-[-0.07em] md:text-6xl">{orbStatus}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              {childLock.active && childName
                ? `Full-screen support, locked to ${childName}'s journey. ORB should answer from permissioned evidence and say when something is missing.`
                : 'Full-screen support. Choose a young person before asking for child records.'}
            </p>
            <div className="orb-presence-pill mt-5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em]">
              {childLock.active && childName ? `Active child: ${childName}` : 'No active child context'}
            </div>

            {snapshot.error ? <p className="mt-5 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.14)]">{snapshot.error}</p> : null}
            {snapshot.pendingDraft ? <p className="mt-5 rounded-full border border-purple-300/30 bg-purple-300/10 px-4 py-2 text-sm text-purple-100">Draft prepared. Confirm before anything is saved.</p> : null}

            <div className="orb-caption-surface mt-6 max-h-56 w-full overflow-auto p-4 text-left text-sm leading-7 text-slate-100" aria-live="polite">
              {snapshot.partialTranscript ? <p>{snapshot.partialTranscript}</p> : latestAssistant ? <p>{latestAssistant.content}</p> : latestUser ? <p>{latestUser.content}</p> : <p>Ask ORB what changed, what is missing, what needs review, or how to write therapeutically.</p>}
            </div>

            {fallbackOpen ? (
              <form className="mt-5 flex w-full gap-2" onSubmit={(event) => { event.preventDefault(); void sendTypedFallback() }}>
                <label htmlFor="orb-accessible-text" className="sr-only">Type to ORB</label>
                <input
                  id="orb-accessible-text"
                  value={typedText}
                  onChange={(event) => setTypedText(event.target.value)}
                  className="orb-input min-w-0 flex-1 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-300"
                  placeholder="Ask ORB..."
                  aria-label={childName ? `Type to ORB about ${childName}` : 'Type to ORB'}
                />
                <button type="submit" disabled={!typedText.trim() || snapshot.loading} className="orb-primary-action rounded-full px-4 disabled:opacity-50" aria-label="Send typed message to ORB">
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
              }} className="orb-quiet-action rounded-full px-4 py-3 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Captions className="mr-2 inline h-4 w-4" aria-hidden />
                {captions ? 'Hide captions' : 'Captions'}
              </button>
              <button type="button" onClick={() => setFallbackOpen((value) => !value)} className="orb-quiet-action rounded-full px-4 py-3 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Keyboard className="mr-2 inline h-4 w-4" aria-hidden />
                Type to ORB
              </button>
              <button type="button" onClick={() => void controller.end()} className="orb-primary-action rounded-full px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-cyan-300">
                <Square className="mr-2 inline h-4 w-4" aria-hidden />
                Close ORB
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => { if (orbReady) void controller.activate(context, effectiveRole) }}
        data-testid={placement === 'floating' ? 'orb-button' : 'orb-button-inline'}
        className={`orb-embedded-dock pointer-events-auto group relative inline-flex items-center justify-center rounded-full p-1 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${placement === 'inline' ? '' : 'min-h-11 min-w-11 md:min-h-16 md:min-w-16'}`}
        data-orb-state={ambientState}
        aria-label={orbReady ? 'Open ORB full screen' : authMessage}
        aria-pressed={snapshot.state === 'listening'}
        disabled={!orbReady}
        title={orbReady ? 'Open ORB' : authMessage}
      >
        <span className="absolute inset-0 rounded-full bg-cyan-300/20 blur-xl transition group-hover:bg-cyan-200/30" aria-hidden />
        <OrbVisual state={snapshot.state === 'idle' ? 'idle' : snapshot.state} size="small" />
        <span className="sr-only">Open ORB full screen</span>
      </button>
      <div className="sr-only" aria-live="polite">ORB status: {orbStatus}. Use Control Shift Space to activate. Press Escape to interrupt while ORB is speaking.</div>
    </div>
  )
}
