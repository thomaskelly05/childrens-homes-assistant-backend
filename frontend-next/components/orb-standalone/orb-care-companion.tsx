'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mic, MicOff, Send, Settings2, Volume2, VolumeX, X } from 'lucide-react'

import { OrbGlow, type StandaloneOrbGlowState } from '@/components/orb-standalone/orb-glow'
import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  fetchStandaloneOrbConfig,
  queryStandaloneOrbConversation,
  STANDALONE_ORB_MODES,
  standaloneOrbErrorMessage,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const SAFETY_NOTICE =
  'ORB supports reflection, recording and guidance. It does not replace safeguarding procedures, manager decisions, legal advice or emergency action.'

const SUGGESTED_PROMPT_GROUPS: Array<{ title: string; prompts: string[] }> = [
  {
    title: 'General',
    prompts: [
      'What can you help me with?',
      'Explain this like I’m on shift.',
      'Help me think this through.'
    ]
  },
  {
    title: 'Recording',
    prompts: [
      'Help me write a daily note.',
      'Help me record an incident calmly.',
      'Make this wording more child-centred.',
      'What should I include in a missing episode record?'
    ]
  },
  {
    title: 'Ofsted / SCCIF',
    prompts: [
      'What would Ofsted expect to see here?',
      'How do I evidence child voice?',
      'How do I show progress from starting points?'
    ]
  },
  {
    title: 'Safeguarding',
    prompts: [
      'Does this sound like it needs manager review?',
      'Help me think through safeguarding concerns.',
      'What should I escalate immediately?'
    ]
  },
  {
    title: 'Therapeutic',
    prompts: [
      'Help me understand this behaviour as communication.',
      'How can staff respond therapeutically?',
      'Help me reflect after a difficult shift.'
    ]
  }
]

function glowStateForContext(options: {
  pending: boolean
  listening: boolean
  speaking: boolean
  voiceError: string | null
  mode: StandaloneOrbMode
  recordingContext: boolean
}): StandaloneOrbGlowState {
  if (options.voiceError && !options.pending) return 'error'
  if (options.listening) return 'listening'
  if (options.pending) return 'thinking'
  if (options.speaking) return 'speaking'
  if (options.recordingContext || options.mode === 'Record This Properly') return 'recording'
  if (options.mode === 'Safeguarding') return 'safeguarding'
  return 'idle'
}

function modeFromQuery(value: string | null): StandaloneOrbMode | null {
  if (!value?.trim()) return null
  const match = STANDALONE_ORB_MODES.find((item) => item.toLowerCase() === value.trim().toLowerCase())
  return match ?? null
}

export function OrbCareCompanion() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q')?.trim() || ''
  const recordingContext = searchParams.get('context') === 'recording'
  const queryMode = modeFromQuery(searchParams.get('mode'))

  const [modes, setModes] = useState<string[]>([...STANDALONE_ORB_MODES])
  const [mode, setMode] = useState<StandaloneOrbMode>(queryMode || (recordingContext ? 'Record This Properly' : 'Ask ORB'))
  const [input, setInput] = useState(initialQuery)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceReplies, setVoiceReplies] = useState(true)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [conversationId, setConversationId] = useState(() => `standalone-${Date.now().toString(36)}`)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const voice = useStandaloneOrbVoice()

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

  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript)
  }, [voice.transcript])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  const history = useMemo(
    () => messages.map((entry) => ({ role: entry.role, content: entry.content })),
    [messages]
  )

  const glowState = glowStateForContext({
    pending,
    listening: voice.listening,
    speaking: voice.speaking,
    voiceError: voice.error,
    mode,
    recordingContext
  })

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || pending) return

      setInput('')
      voice.clearTranscript()
      setPending(true)
      setError(null)

      const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed }
      setMessages((current) => [...current, userMessage])

      try {
        const response = await queryStandaloneOrbConversation({
          message: trimmed,
          mode,
          conversation_id: conversationId,
          history
        })

        if (response.conversation_id) setConversationId(response.conversation_id)

        const answer = response.answer || 'I could not form a response just now.'
        setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', content: answer }])

        if (voiceReplies && voice.voiceAvailable) {
          voice.speak(answer)
        }
      } catch (caught) {
        setError(standaloneOrbErrorMessage(caught))
      } finally {
        setPending(false)
      }
    },
    [conversationId, history, mode, pending, voice, voiceReplies]
  )

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    await sendMessage(input)
  }

  function handleMicClick() {
    if (voice.listening) {
      voice.stopListening()
      return
    }
    voice.startListening()
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#03050c] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(56,189,248,0.22),transparent_42%),radial-gradient(circle_at_12%_88%,rgba(129,140,248,0.16),transparent_36%),linear-gradient(160deg,#02040a,#07101f_48%,#0b0618)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:72px_72px]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1600px] flex-col px-4 py-5 md:px-8 md:py-6">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">ORB Care Companion</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] md:text-5xl">Standalone ORB Care Companion</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Immersive ChatGPT-style support for residential children’s homes — voice and text, with no OS records or
              dashboards accessed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100">
              No OS records
            </span>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
              /orb/standalone/* only
            </span>
          </div>
        </header>

        <div className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/55 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-4 lg:hidden">
              <OrbGlow state={glowState} mode={mode} voiceEnabled={voiceReplies} />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" role="log" aria-label="ORB conversation">
              {messages.length === 0 ? (
                <article className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-5 leading-7 text-slate-200">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">ORB</p>
                  I can help with practice reflection, safeguarding thinking, Ofsted/SCCIF lens, behaviour support and
                  recording quality — without opening IndiCare OS child records or Care Hub.
                </article>
              ) : (
                messages.map((entry) => (
                  <article
                    key={entry.id}
                    className={`max-w-3xl rounded-3xl border p-5 leading-7 ${
                      entry.role === 'user'
                        ? 'ml-auto border-cyan-300/30 bg-cyan-300/10 text-cyan-50'
                        : 'border-white/10 bg-white/[0.05] text-slate-100'
                    }`}
                  >
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      {entry.role === 'user' ? 'You' : 'ORB'}
                    </p>
                    <p className="whitespace-pre-wrap">{entry.content}</p>
                  </article>
                ))
              )}
              {pending ? (
                <p className="text-sm font-semibold text-violet-200" role="status">
                  Thinking…
                </p>
              ) : null}
              {error ? (
                <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50" role="alert">
                  {error}
                </p>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 p-4">
              <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
                <label htmlFor="orb-standalone-input" className="sr-only">
                  Message ORB
                </label>
                <textarea
                  id="orb-standalone-input"
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void submit()
                    }
                  }}
                  rows={2}
                  className="min-h-[3.5rem] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base font-medium text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus-visible:ring-2"
                  placeholder="Type your question — voice is optional"
                  disabled={pending}
                  aria-describedby="orb-standalone-status"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMicClick}
                    aria-label={voice.listening ? 'Stop listening' : 'Start voice input'}
                    className={`inline-flex h-12 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      voice.listening
                        ? 'border-cyan-300/60 bg-cyan-300/20 text-cyan-50'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40'
                    }`}
                  >
                    {voice.listening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
                  </button>
                  <button
                    type="submit"
                    disabled={pending || !input.trim()}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa,#fbbf24)] px-6 text-sm font-black text-slate-950 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-200 md:flex-none"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    {pending ? 'Thinking…' : 'Send'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoicePanelOpen((open) => !open)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-bold text-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-300"
                    aria-expanded={voicePanelOpen}
                    aria-controls="orb-voice-settings"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden />
                    Voice
                  </button>
                </div>
                <p id="orb-standalone-status" className="text-xs text-slate-400" role="status">
                  {voice.listening
                    ? 'Listening — speak naturally, then send or edit the transcript.'
                    : voice.speaking
                      ? 'Speaking response…'
                      : pending
                        ? 'ORB is thinking.'
                        : 'Keyboard and typing always work. Microphone is optional.'}
                </p>
              </form>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-4">
            <div className="hidden rounded-[32px] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl lg:block">
              <OrbGlow state={glowState} mode={mode} voiceEnabled={voiceReplies} />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-4 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mode</p>
              <div className="mt-3 grid gap-2" role="tablist" aria-label="ORB standalone modes">
                {modes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={mode === item}
                    onClick={() => setMode(item as StandaloneOrbMode)}
                    className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                      mode === item
                        ? 'border-cyan-300/50 bg-cyan-300/15 text-white'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {voicePanelOpen ? (
              <div
                id="orb-voice-settings"
                className="rounded-[28px] border border-white/10 bg-slate-950/65 p-4 text-sm text-slate-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Voice settings</p>
                  <button type="button" onClick={() => setVoicePanelOpen(false)} aria-label="Close voice settings">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <label className="mt-3 flex items-center justify-between gap-3">
                  <span>Voice replies</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceReplies) voice.cancelSpeaking()
                      setVoiceReplies((on) => !on)
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]"
                  >
                    {voiceReplies ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
                    {voiceReplies ? 'On' : 'Off'}
                  </button>
                </label>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Preferred voice: British female when available
                  {voice.preferredVoiceName ? ` (${voice.preferredVoiceName})` : ''}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Voice status: {voice.voiceAvailable ? 'available' : 'unavailable'}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Voice availability depends on your device and browser.
                </p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/55 p-4 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Suggested prompts</p>
              <div className="mt-3 space-y-4">
                {SUGGESTED_PROMPT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{group.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setInput(prompt)
                            inputRef.current?.focus()
                          }}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-xs font-semibold text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 focus-visible:ring-2 focus-visible:ring-cyan-300"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4 text-xs leading-6 text-slate-400">
              {SAFETY_NOTICE}
            </p>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Separate from IndiCare OS · Uses GET /orb/standalone/config and POST /orb/standalone/conversation
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
