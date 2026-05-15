'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Captions, Keyboard, Mic, MicOff, Send, Settings, ShieldCheck, Square, UserRound, Volume2, VolumeX } from 'lucide-react'

import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import type { OrbRenderState } from '@/components/orb-core/orb-sphere'
import { orbAccessibilityClassNames } from '@/lib/orb/accessibility/apply-accessibility'
import { loadOrbAccessibilityPreferences } from '@/lib/orb/accessibility/preferences'
import { useAuth } from '@/contexts/auth-context'
import { orbProductCopy } from '@/lib/orb/content/copy'
import { OrbRuntimeController, type OrbRuntimeSnapshot } from '@/lib/orb/state'
import { defaultOrbPreferences, type OrbContext, type OrbState } from '@/lib/orb/types'

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
  if (snapshot.state === 'thinking') return 'Of course - give me a second.'
  if (snapshot.state === 'speaking') return "I'll keep this brief."
  if (snapshot.state === 'reconnecting') return "Connection paused. I'm reconnecting."
  if (snapshot.state === 'permission_denied') return 'Microphone access looks disabled.'
  if (snapshot.state === 'muted' || snapshot.state === 'private') return 'Private mode is on.'
  return 'Tap the ORB and talk.'
}

export function OrbStandaloneExperience({ voiceFirst = true }: { voiceFirst?: boolean }) {
  const { status, user, csrfReady } = useAuth()
  const hydratedAccessibility = useMemo(() => loadOrbAccessibilityPreferences(), [])
  const voiceFirstRuntime = voiceFirst || hydratedAccessibility.voiceFirstNavigation
  const controller = useMemo(() => {
    const preferences = {
      captions_enabled: hydratedAccessibility.captions,
      do_not_store_transcript: false
    }
    return new OrbRuntimeController({
      context: standaloneContext,
      role: user?.role,
      selectedMode: 'general',
      preferences: { ...defaultOrbPreferences, ...preferences }
    })
  }, [hydratedAccessibility.captions, user?.role])
  const [snapshot, setSnapshot] = useState<OrbRuntimeSnapshot>(controller.getSnapshot())
  const [captions, setCaptions] = useState(Boolean(controller.getSnapshot().preferences.captions_enabled))
  const [transcriptOpen, setTranscriptOpen] = useState(hydratedAccessibility.transcript)
  const [typedOpen, setTypedOpen] = useState(!voiceFirstRuntime)
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
  const renderState = renderStateFor(snapshot.state, hydratedAccessibility.reducedMotion)
  const showCaptions = captions || hydratedAccessibility.hearingAccessibility || Boolean(snapshot.partialTranscript) || snapshot.state === 'speaking' || snapshot.state === 'listening'
  const activeSession = Boolean(snapshot.sessionId) || snapshot.loading || snapshot.state !== 'idle'

  async function sendText(text = input) {
    const message = text.trim()
    if (!message || !orbReady || snapshot.loading) return
    setInput('')
    setTranscriptOpen(true)
    await controller.sendText(message, standaloneContext)
  }

  async function toggleMute() {
    const next = !muted
    setMuted(next)
    await controller.setMuted(next)
  }

  async function togglePrivateTranscript() {
    const next = !snapshot.preferences.do_not_store_transcript
    controller.updatePreferences({ ...snapshot.preferences, do_not_store_transcript: next, privacy_mode_label: next ? 'do_not_store' : 'standard' })
  }

  return (
    <div className={`relative mx-auto flex min-h-[calc(100vh-7rem)] w-full flex-col items-center justify-center gap-6 px-2 text-center ${accessibilityClassName}`} data-orb-state={renderState}>
      <div className="orb-screen-edge-pulse" data-orb-state={renderState} aria-hidden />
      <div className="absolute right-0 top-0 z-20 flex flex-wrap justify-end gap-2">
        <Link href="/assistant/profile" className="orb-quiet-action rounded-full px-4 py-3 text-sm font-black text-white">
          <UserRound className="mr-2 inline h-4 w-4" aria-hidden />
          Profile
        </Link>
        <Link href="/assistant/settings/accessibility" className="orb-quiet-action rounded-full px-4 py-3 text-sm font-black text-white">
          <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden />
          Accessibility
        </Link>
        <Link href="/assistant/settings/voice" className="orb-quiet-action rounded-full px-4 py-3 text-sm font-black text-white">
          <Settings className="mr-2 inline h-4 w-4" aria-hidden />
          Voice
        </Link>
      </div>

      <section className="relative flex min-h-[620px] w-full max-w-4xl flex-col items-center justify-center">
        <OrbRenderer
          immersive
          state={renderState}
          captionsEnabled={showCaptions}
          caption={captionText}
          presenceLabel="Standalone ORB - no IndiCare OS records"
        />
        <button
          type="button"
          onClick={() => orbReady ? void controller.activate(standaloneContext, user?.role) : undefined}
          disabled={!orbReady}
          className="absolute inset-x-[18%] top-[18%] h-[46%] rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed"
          aria-label={orbReady ? 'Activate ORB voice' : 'ORB is waiting for your secure session'}
        >
          <span className="sr-only">Activate ORB voice</span>
        </button>
      </section>

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-4">
        <div className="orb-floating-panel max-w-3xl px-6 py-4 text-white">
          <p className="orb-kicker text-[11px] font-black uppercase tracking-[0.24em]">{orbProductCopy.standaloneBrand}</p>
          <h1 className="orb-title-glow mt-2 text-3xl font-black tracking-[-0.07em] md:text-5xl">{statusLine(snapshot)}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">{orbProductCopy.standaloneSubprompt} Standalone mode cannot retrieve children, homes, chronology or provider records.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => void controller.activate(standaloneContext, user?.role)} disabled={!orbReady} className="orb-primary-action rounded-full px-5 py-3 text-sm font-black disabled:opacity-50">
            <Mic className="mr-2 inline h-4 w-4" aria-hidden />
            {snapshot.state === 'speaking' || snapshot.loading ? 'Interrupt' : 'Listen'}
          </button>
          <button type="button" onClick={() => {
            const next = !captions
            setCaptions(next)
            controller.updatePreferences({ ...snapshot.preferences, captions_enabled: next })
          }} className="orb-quiet-action rounded-full px-5 py-3 text-sm font-black text-white">
            <Captions className="mr-2 inline h-4 w-4" aria-hidden />
            {captions ? 'Hide captions' : 'Captions'}
          </button>
          <button type="button" onClick={() => setTranscriptOpen((value) => !value)} className="orb-quiet-action rounded-full px-5 py-3 text-sm font-black text-white">
            <Volume2 className="mr-2 inline h-4 w-4" aria-hidden />
            {transcriptOpen ? 'Hide transcript' : 'Transcript'}
          </button>
          <button type="button" onClick={() => setTypedOpen((value) => !value)} className="orb-quiet-action rounded-full px-5 py-3 text-sm font-black text-white">
            <Keyboard className="mr-2 inline h-4 w-4" aria-hidden />
            Text fallback
          </button>
          <button type="button" onClick={() => void toggleMute()} className="orb-quiet-action rounded-full px-5 py-3 text-sm font-black text-white">
            {muted ? <MicOff className="mr-2 inline h-4 w-4" aria-hidden /> : <VolumeX className="mr-2 inline h-4 w-4" aria-hidden />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button type="button" onClick={() => void togglePrivateTranscript()} className="orb-quiet-action rounded-full px-5 py-3 text-sm font-black text-white">
            <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden />
            {snapshot.preferences.do_not_store_transcript ? 'Transcript private' : 'Transcript allowed'}
          </button>
          {activeSession ? (
            <button type="button" onClick={() => void controller.end()} className="orb-quiet-action rounded-full px-5 py-3 text-sm font-black text-white">
              <Square className="mr-2 inline h-4 w-4" aria-hidden />
              End
            </button>
          ) : null}
        </div>

        {typedOpen ? (
          <form className="flex w-full max-w-2xl gap-2 rounded-full border border-white/10 bg-black/20 p-2 shadow-[0_0_32px_rgba(34,211,238,0.08)]" onSubmit={(event) => { event.preventDefault(); void sendText() }}>
            <label htmlFor="standalone-orb-text" className="sr-only">Type to ORB</label>
            <input
              ref={inputRef}
              id="standalone-orb-text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type to ORB as a fallback..."
              className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
            />
            <button type="submit" disabled={!input.trim() || snapshot.loading || !orbReady} className="orb-primary-action rounded-full px-4 disabled:opacity-50" aria-label="Send to ORB">
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
        ) : null}
      </section>

      {transcriptOpen ? (
        <section className="orb-floating-panel relative z-10 mx-auto w-full max-w-3xl p-4 text-left text-white" aria-live="polite">
          <div className="orb-kicker flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em]">
            <Volume2 className="h-4 w-4" aria-hidden />
            Transcript continuity
          </div>
          <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
            {transcript.length ? transcript.map((entry) => (
              <article key={entry.id} className={`rounded-3xl px-4 py-3 text-sm leading-7 ${entry.role === 'user' ? 'ml-auto max-w-[82%] bg-cyan-100 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.16)]' : 'max-w-[88%] bg-white/10 text-slate-100 shadow-[0_0_24px_rgba(168,85,247,0.10)]'}`}>
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
