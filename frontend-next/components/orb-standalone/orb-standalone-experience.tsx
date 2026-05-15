'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Captions, Keyboard, Mic, MicOff, Pause, Send, ShieldCheck, Square, Volume2, VolumeX } from 'lucide-react'

import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import type { OrbRenderState } from '@/components/orb-core/orb-sphere'
import { orbAccessibilityClassNames } from '@/lib/orb/accessibility/apply-accessibility'
import { loadOrbAccessibilityPreferences } from '@/lib/orb/accessibility/preferences'
import { useAuth } from '@/contexts/auth-context'
import { orbProductCopy } from '@/lib/orb/content/copy'
import { standaloneOrbPrompts } from '@/lib/orb/content/prompts'
import { OrbRuntimeController, type OrbRuntimeSnapshot } from '@/lib/orb/state'
import { defaultOrbPreferences, type OrbContext, type OrbSelectedMode, type OrbState } from '@/lib/orb/types'

const standaloneContext: OrbContext = {
  route: '/assistant',
  workspace: 'standalone_orb',
  page_title: 'Standalone ORB',
  selected_young_person_id: null,
  selected_young_person_key: null,
  selected_record_id: null,
  selected_record_type: null,
  home_id: null,
  current_child: {},
  child_context_lock: {
    active: false,
    retrieval_scope: 'standalone_no_os_records',
    allow_global_search: false
  },
  assistant_context: {
    product_mode: 'standalone',
    current_workspace_type: 'standalone_orb',
    retrieval_policy: 'static_and_user_supplied_only'
  }
}

function renderStateFor(state: OrbState, reducedMotion: boolean): OrbRenderState {
  if (reducedMotion) return 'reduced_motion'
  if (state === 'listening' || state === 'passive_listening' || state === 'recording' || state === 'dictation') return 'listening'
  if (state === 'thinking' || state === 'connecting') return 'thinking'
  if (state === 'speaking') return 'speaking'
  if (state === 'interrupted') return 'interrupted'
  if (state === 'reconnecting') return 'reconnecting'
  if (state === 'offline' || state === 'unavailable' || state === 'expired' || state === 'error') return 'offline'
  if (state === 'permission_denied') return 'permission_denied'
  if (state === 'private' || state === 'muted') return 'private_mode'
  if (state === 'safeguarding_sensitive' || state === 'inspection') return 'safeguarding_cautious'
  return 'idle'
}

function statusLine(snapshot: OrbRuntimeSnapshot) {
  if (snapshot.error) return snapshot.error
  if (snapshot.state === 'listening') return 'I am listening.'
  if (snapshot.state === 'thinking') return 'One moment. I am pulling that together.'
  if (snapshot.state === 'speaking') return 'I am with you.'
  if (snapshot.state === 'reconnecting') return 'Realtime connection is reconnecting. Typed ORB remains available.'
  if (snapshot.state === 'permission_denied') return 'Microphone access appears disabled. I can continue in text.'
  return orbProductCopy.standalonePrompt
}

export function OrbStandaloneExperience({ voiceFirst = false }: { voiceFirst?: boolean }) {
  const { status, user, csrfReady } = useAuth()
  const hydratedAccessibility = useMemo(() => loadOrbAccessibilityPreferences(), [])
  const controller = useMemo(() => {
    const preferences = {
      captions_enabled: hydratedAccessibility.captions || voiceFirst,
      do_not_store_transcript: false
    }
    return new OrbRuntimeController({
      context: standaloneContext,
      role: user?.role,
      selectedMode: 'general',
      preferences: { ...defaultOrbPreferences, ...preferences }
    })
  }, [hydratedAccessibility.captions, user?.role, voiceFirst])
  const [snapshot, setSnapshot] = useState<OrbRuntimeSnapshot>(controller.getSnapshot())
  const [captions, setCaptions] = useState(Boolean(controller.getSnapshot().preferences.captions_enabled))
  const [transcriptOpen, setTranscriptOpen] = useState(hydratedAccessibility.transcript)
  const [typedOpen, setTypedOpen] = useState(!voiceFirst)
  const [input, setInput] = useState('')
  const [muted, setMuted] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const orbReady = status === 'authenticated' && Boolean(user) && csrfReady

  useEffect(() => controller.subscribe(setSnapshot), [controller])
  useEffect(() => controller.attachBrowserLifecycle(), [controller])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
        event.preventDefault()
        if (orbReady) void controller.activate(standaloneContext, user?.role)
      }
      if (event.key === 'Escape' && (snapshot.loading || snapshot.state === 'speaking')) {
        event.preventDefault()
        void controller.interrupt()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [controller, orbReady, snapshot.loading, snapshot.state, user?.role])

  const transcript = snapshot.transcript.filter((entry) => entry.role !== 'system')
  const latestAssistant = [...transcript].reverse().find((entry) => entry.role === 'assistant')
  const latestUser = [...transcript].reverse().find((entry) => entry.role === 'user')
  const captionText = snapshot.partialTranscript || latestAssistant?.content || latestUser?.content || statusLine(snapshot)
  const accessibilityClassName = orbAccessibilityClassNames(hydratedAccessibility)

  async function sendText(text = input) {
    const message = text.trim()
    if (!message || !orbReady || snapshot.loading) return
    setInput('')
    setTranscriptOpen(true)
    await controller.sendText(message, standaloneContext)
  }

  function updateMode(mode: OrbSelectedMode) {
    controller.updateMode(mode, standaloneContext, user?.role)
  }

  async function toggleMute() {
    const next = !muted
    setMuted(next)
    await controller.setMuted(next)
  }

  return (
    <div className={`relative mx-auto grid min-h-[calc(100vh-7rem)] w-full items-center gap-6 ${accessibilityClassName}`}>
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
        <div className="relative flex min-h-[620px] flex-col items-center justify-center text-center">
          <OrbRenderer
            immersive
            state={renderStateFor(snapshot.state, hydratedAccessibility.reducedMotion)}
            captionsEnabled={captions || hydratedAccessibility.hearingAccessibility}
            caption={captionText}
            presenceLabel="Standalone ORB - no IndiCare OS records"
          />
          <button
            type="button"
            onClick={() => orbReady ? void controller.activate(standaloneContext, user?.role) : undefined}
            disabled={!orbReady}
            className="absolute inset-0 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed"
            aria-label={orbReady ? 'Activate ORB voice' : 'ORB is waiting for your secure session'}
          >
            <span className="sr-only">Activate ORB</span>
          </button>
        </div>

        <aside className="rounded-[36px] border border-white/10 bg-white/[0.06] p-5 text-white shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Ambient controls</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.07em]">{statusLine(snapshot)}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">{orbProductCopy.standaloneSubprompt} Standalone mode cannot retrieve children, homes, chronology or provider records.</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['general', 'auto'] as OrbSelectedMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => updateMode(mode)} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${snapshot.selectedMode === mode ? 'bg-cyan-200 text-slate-950' : 'bg-white/10 text-slate-100'}`}>
                {mode === 'auto' ? 'Adaptive' : 'General'}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void controller.activate(standaloneContext, user?.role)} disabled={!orbReady} className="rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
              <Mic className="mr-2 inline h-4 w-4" aria-hidden />
              Listen
            </button>
            <button type="button" onClick={() => void controller.interrupt()} disabled={!snapshot.loading && snapshot.state !== 'speaking'} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white disabled:opacity-40">
              <Pause className="mr-2 inline h-4 w-4" aria-hidden />
              Pause
            </button>
            <button type="button" onClick={() => {
              const next = !captions
              setCaptions(next)
              controller.updatePreferences({ ...snapshot.preferences, captions_enabled: next })
            }} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">
              <Captions className="mr-2 inline h-4 w-4" aria-hidden />
              {captions ? 'Hide captions' : 'Captions'}
            </button>
            <button type="button" onClick={() => setTypedOpen((value) => !value)} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">
              <Keyboard className="mr-2 inline h-4 w-4" aria-hidden />
              Type
            </button>
            <button type="button" onClick={() => void toggleMute()} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">
              {muted ? <MicOff className="mr-2 inline h-4 w-4" aria-hidden /> : <VolumeX className="mr-2 inline h-4 w-4" aria-hidden />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={() => {
              const next = !snapshot.preferences.do_not_store_transcript
              controller.updatePreferences({ ...snapshot.preferences, do_not_store_transcript: next, privacy_mode_label: next ? 'do_not_store' : 'standard' })
            }} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">
              <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden />
              {snapshot.preferences.do_not_store_transcript ? 'Transcript off' : 'Transcript on'}
            </button>
          </div>

          {typedOpen ? (
            <form className="mt-5 flex gap-2 rounded-full border border-white/10 bg-black/20 p-2" onSubmit={(event) => { event.preventDefault(); void sendText() }}>
              <label htmlFor="standalone-orb-text" className="sr-only">Type to ORB</label>
              <input
                ref={inputRef}
                id="standalone-orb-text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type to ORB..."
                className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
              />
              <button type="submit" disabled={!input.trim() || snapshot.loading || !orbReady} className="rounded-full bg-cyan-200 px-4 text-slate-950 disabled:opacity-50" aria-label="Send to ORB">
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          ) : null}

          <div className="mt-5 grid gap-2">
            {standaloneOrbPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void sendText(prompt)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-bold leading-6 text-slate-100 hover:bg-white/10">
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs text-slate-400">
            <button type="button" onClick={() => setTranscriptOpen((value) => !value)} className="font-black text-cyan-100">
              {transcriptOpen ? 'Hide transcript' : 'Show transcript'}
            </button>
            <button type="button" onClick={() => void controller.end()} className="inline-flex items-center font-black text-slate-300">
              <Square className="mr-1 h-3.5 w-3.5" aria-hidden />
              End session
            </button>
          </div>
        </aside>
      </section>

      {transcriptOpen ? (
        <section className="mx-auto w-full max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.06] p-4 text-white backdrop-blur-xl" aria-live="polite">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
            <Volume2 className="h-4 w-4" aria-hidden />
            Transcript continuity
          </div>
          <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
            {transcript.length ? transcript.map((entry) => (
              <article key={entry.id} className={`rounded-3xl px-4 py-3 text-sm leading-7 ${entry.role === 'user' ? 'ml-auto max-w-[82%] bg-cyan-200 text-slate-950' : 'max-w-[88%] bg-white/10 text-slate-100'}`}>
                {entry.content}
              </article>
            )) : <p className="text-sm leading-7 text-slate-400">Transcript appears after a typed or voice turn. Captions remain available even when transcript storage is off.</p>}
            {snapshot.partialTranscript ? <p className="rounded-3xl bg-white/10 px-4 py-3 text-sm leading-7 text-cyan-50">{snapshot.partialTranscript}</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
