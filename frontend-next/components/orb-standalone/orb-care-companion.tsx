'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Sparkles } from 'lucide-react'

import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import type { OrbRenderState } from '@/components/orb-core/orb-sphere'
import { orbProductCopy } from '@/lib/orb/content/copy'
import {
  fetchStandaloneOrbConfig,
  queryStandaloneOrbConversation,
  STANDALONE_ORB_MODES,
  standaloneOrbErrorMessage,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

function renderStateForMode(mode: StandaloneOrbMode, pending: boolean): OrbRenderState {
  if (pending) return 'thinking'
  if (mode === 'Safeguarding') return 'safeguarding_cautious'
  if (mode === 'Reflect') return 'speaking'
  if (mode === 'Ofsted Lens') return 'listening'
  return 'idle'
}

function hueLabel(mode: StandaloneOrbMode, pending: boolean) {
  if (pending) return 'Amber — responding'
  if (mode === 'Safeguarding') return 'Red — safeguarding reflection'
  if (mode === 'Reflect') return 'Purple — reflection'
  if (mode === 'Ofsted Lens') return 'Blue — Ofsted lens'
  return 'Blue — listening'
}

export function OrbCareCompanion() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q')?.trim() || ''
  const recordingContext = searchParams.get('context') === 'recording'

  const [modes, setModes] = useState<string[]>([...STANDALONE_ORB_MODES])
  const [mode, setMode] = useState<StandaloneOrbMode>('Ask ORB')
  const [input, setInput] = useState(initialQuery)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId] = useState(() => `standalone-${Date.now().toString(36)}`)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const renderState = renderStateForMode(mode, pending)

  useEffect(() => {
    let cancelled = false
    void fetchStandaloneOrbConfig()
      .then((config) => {
        if (cancelled) return
        if (config.modes?.length) setModes(config.modes)
      })
      .catch(() => {
        if (!cancelled) setModes([...STANDALONE_ORB_MODES])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (initialQuery) inputRef.current?.focus()
  }, [initialQuery])

  const history = useMemo(
    () => messages.map((entry) => ({ role: entry.role, content: entry.content })),
    [messages]
  )

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const text = input.trim()
    if (!text || pending) return
    setInput('')
    setPending(true)
    setError(null)
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((current) => [...current, userMessage])
    try {
      const response = await queryStandaloneOrbConversation({
        message: text,
        mode,
        conversation_id: conversationId,
        history
      })
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: 'assistant', content: response.answer || 'I could not form a response just now.' }
      ])
    } catch (caught) {
      setError(standaloneOrbErrorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(168,85,247,0.28),transparent_28rem),radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.18),transparent_30rem),linear-gradient(135deg,#030611,#07101f_44%,#090617)]" />
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px]" />

      <section className="relative grid min-h-screen gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="rounded-[30px] border border-white/10 bg-slate-950/65 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div>
            <p className="text-lg font-black tracking-[0.32em]">ORB</p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Care Companion</p>
          </div>

          {recordingContext ? (
            <p className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              Recording support
            </p>
          ) : null}

          <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-sm leading-6 text-slate-300">
            Standalone ChatGPT-style assistant for residential children’s homes. No CareHub, chronology or OS records are accessed here.
          </div>

          <nav className="mt-7 grid gap-2" aria-label="ORB standalone modes">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item as StandaloneOrbMode)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  mode === item
                    ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-lg shadow-cyan-500/10'
                    : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40 hover:bg-white/[0.075]'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <p className="mt-8 text-xs leading-5 text-slate-500">
            Uses /orb/standalone/config and /orb/standalone/conversation only.
          </p>
        </aside>

        <section className="grid min-h-[70vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/65 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <header className="border-b border-white/10 px-7 py-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">ORB Care Companion</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] md:text-6xl">How can I help?</h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
              {orbProductCopy.standaloneSubprompt} Ask anything — safeguarding, Ofsted thinking, therapeutic practice and recording quality.
            </p>
          </header>

          <div className="space-y-4 overflow-auto px-7 py-6">
            {messages.length ? (
              messages.map((entry) => (
                <article
                  key={entry.id}
                  className={`max-w-3xl rounded-3xl border p-5 leading-7 ${
                    entry.role === 'user'
                      ? 'ml-auto border-cyan-300/30 bg-cyan-300/10 text-cyan-50'
                      : 'border-white/10 bg-white/[0.055] text-slate-200'
                  }`}
                >
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {entry.role === 'user' ? 'You' : 'ORB'}
                  </p>
                  {entry.content}
                </article>
              ))
            ) : (
              <article className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.055] p-5 leading-7 text-slate-200">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">ORB</p>
                I’m your standalone care companion — general questions, practice reflection and recording help without opening IndiCare OS records.
              </article>
            )}
            {error ? (
              <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">{error}</p>
            ) : null}
          </div>

          <form
            className="m-5 grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => void submit(event)}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-14 bg-transparent px-2 text-base font-semibold text-white outline-none placeholder:text-slate-500"
              placeholder="Ask ORB anything..."
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#f0abfc,#fbbf24)] px-6 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden />
              {pending ? 'Thinking…' : 'Send'}
            </button>
          </form>
        </section>

        <aside className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-950/65 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="grid h-full place-items-center text-center">
            <div className="w-full">
              <div className="mx-auto max-w-[220px]">
                <OrbRenderer
                  immersive
                  state={renderState}
                  captionsEnabled
                  caption={hueLabel(mode, pending)}
                  presenceLabel="ORB Care Companion — standalone"
                />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Hue intelligence</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">Floating ORB presence</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">{hueLabel(mode, pending)}</p>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
                No OS sidebar · No child context
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
