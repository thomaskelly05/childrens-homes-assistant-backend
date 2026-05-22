'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  MessageSquarePlus,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Settings2,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'

import { OrbGlow, type StandaloneOrbGlowState } from '@/components/orb-standalone/orb-glow'
import {
  useStandaloneOrbVoice,
  type StandaloneOrbAnswerStyle
} from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  fetchStandaloneOrbConfig,
  queryStandaloneOrbConversation,
  STANDALONE_ORB_MODES,
  standaloneOrbErrorMessage,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const PRIVACY_STRIP =
  'Standalone ORB does not access IndiCare records, Care Hub, child files or dashboards. It supports reflection, recording and guidance only.'

const MODE_SAFETY: Partial<Record<StandaloneOrbMode, string>> = {
  Safeguarding:
    'Follow your safeguarding policy and escalate immediate risk. ORB supports thinking; it does not make decisions.',
  'Record This Properly':
    'Review wording before adding it to a record. ORB cannot see the record unless you paste text here.',
  'Ofsted Lens': 'Guidance support only. ORB does not make inspection judgements.'
}

const HIGH_RISK_TERMS = [
  'immediate danger',
  'suicide',
  'self-harm',
  'self harm',
  'abuse',
  'missing',
  'assault',
  'emergency'
] as const

const MAX_HISTORY_TURNS = 20

const ANSWER_STYLE_LABELS: Record<StandaloneOrbAnswerStyle, string> = {
  voice_concise: 'Voice concise',
  balanced: 'Balanced',
  detailed: 'Detailed'
}

function trimConversationHistory(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  const pairs = messages.map((entry) => ({ role: entry.role, content: entry.content }))
  if (pairs.length <= MAX_HISTORY_TURNS) return pairs
  return pairs.slice(-MAX_HISTORY_TURNS)
}

function transcriptHasHighRiskTerms(text: string): boolean {
  const lower = text.toLowerCase()
  return HIGH_RISK_TERMS.some((term) => lower.includes(term))
}

function voiceStatusLine(options: {
  voice: ReturnType<typeof useStandaloneOrbVoice>
  pending: boolean
}): string {
  const { voice, pending } = options
  if (voice.error && voice.wakeStatus === 'unsupported') return voice.error
  if (voice.voiceSessionPaused) return 'Voice session paused. Tap Continue conversation or type.'
  if (voice.phase === 'wake_listening') return `Listening for "${voice.wakePhraseText}"…`
  if (voice.phase === 'wake_detected') return "Hey, I'm here. Go ahead…"
  if (voice.phase === 'continuous_listening') return 'Listening for your reply…'
  if (voice.listening) return "I'm listening… speak naturally. Tap ORB or mic again to stop."
  if (voice.phase === 'transcript_ready' && voice.displayTranscript) {
    return `I heard you say… review below, then Send or Try again.`
  }
  if (voice.speaking) return "Here's how I'd think about it… You can interrupt me any time."
  if (pending) return 'Thinking that through…'
  if (voice.settings.wakePhrase && voice.wakeStatus === 'listening') {
    return `Wake phrase on — say "${voice.wakePhraseText}" or tap the ORB.`
  }
  return 'Go ahead… Keyboard always works. Microphone is optional.'
}

type PromptEntry = { text: string; mode?: StandaloneOrbMode }

const SUGGESTED_PROMPT_GROUPS: Array<{ title: string; prompts: PromptEntry[] }> = [
  {
    title: 'Start here',
    prompts: [
      { text: 'What can you help me with?' },
      { text: 'Explain this like I’m on shift.' },
      { text: 'Help me think this through.' }
    ]
  },
  {
    title: 'Recording',
    prompts: [
      { text: 'Help me write a daily note.', mode: 'Record This Properly' },
      { text: 'Help me record an incident calmly.', mode: 'Record This Properly' },
      { text: 'Make this wording more child-centred.', mode: 'Record This Properly' },
      { text: 'What should I include in a missing episode record?', mode: 'Record This Properly' }
    ]
  },
  {
    title: 'Ofsted / SCCIF',
    prompts: [
      { text: 'What would Ofsted expect to see here?', mode: 'Ofsted Lens' },
      { text: 'How do I evidence child voice?', mode: 'Ofsted Lens' },
      { text: 'How do I show progress from starting points?', mode: 'Ofsted Lens' }
    ]
  },
  {
    title: 'Safeguarding',
    prompts: [
      { text: 'Does this need manager review?', mode: 'Safeguarding' },
      { text: 'Help me think through a safeguarding concern.', mode: 'Safeguarding' },
      { text: 'What should I escalate immediately?', mode: 'Safeguarding' }
    ]
  },
  {
    title: 'Reflective practice',
    prompts: [
      { text: 'Help me reflect after a difficult shift.', mode: 'Reflect' },
      { text: 'Help me understand behaviour as communication.', mode: 'Behaviour Support' },
      { text: 'How can staff respond therapeutically?', mode: 'Behaviour Support' }
    ]
  }
]

function glowStateForContext(options: {
  pending: boolean
  voicePhase: string
  listening: boolean
  speaking: boolean
  voiceError: string | null
  mode: StandaloneOrbMode
  recordingContext: boolean
}): StandaloneOrbGlowState {
  if (options.voicePhase === 'interrupted') return 'interrupted'
  if (options.voicePhase === 'wake_listening') return 'wake_listening'
  if (options.voicePhase === 'wake_detected') return 'wake_detected'
  if (options.voicePhase === 'continuous_listening') return 'continuous_listening'
  if (options.voiceError && !options.pending && !options.listening && options.voicePhase === 'error') return 'error'
  if (options.listening) return 'listening'
  if (options.voicePhase === 'transcript_ready') return 'transcript_ready'
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

async function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
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
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState(() => `standalone-${Date.now().toString(36)}`)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = voice

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
    const display = voice.displayTranscript
    if (display) setInput(display)
  }, [voice.displayTranscript])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    }
  }, [])

  const showSafeguardingEscalation =
    mode === 'Safeguarding' ||
    transcriptHasHighRiskTerms(input) ||
    transcriptHasHighRiskTerms(voice.transcript) ||
    messages.some((m) => m.role === 'user' && transcriptHasHighRiskTerms(m.content))

  const latestExchange = useMemo(() => {
    if (messages.length === 0) return { earlier: [] as ChatMessage[], user: null as ChatMessage | null, assistant: null as ChatMessage | null }
    const last = messages[messages.length - 1]
    if (last.role === 'assistant') {
      const prev = messages[messages.length - 2]
      const user = prev?.role === 'user' ? prev : null
      return { earlier: messages.slice(0, user ? -2 : -1), user, assistant: last }
    }
    return { earlier: messages.slice(0, -1), user: last, assistant: null }
  }, [messages])

  const glowState = glowStateForContext({
    pending,
    voicePhase: voice.phase,
    listening: voice.listening,
    speaking: voice.speaking,
    voiceError: voice.error,
    mode,
    recordingContext
  })

  useEffect(() => {
    return voice.registerAfterSpeakListener(() => {
      if (voice.voiceSessionPaused) return
      if (!voiceSettings.continuousConversation) return
      if (!voice.recognitionAvailable) return
      voice.startContinuousListening()
    })
  }, [voice, voiceSettings.continuousConversation])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || pending) return

      if (voice.speaking) voice.cancelSpeaking()

      setInput('')
      voice.clearTranscript()
      voice.markIdle()
      setPending(true)
      setError(null)

      const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed }
      const historyForRequest = trimConversationHistory([...messages, userMessage])
      setMessages((current) => [...current, userMessage])

      const styleLabel = ANSWER_STYLE_LABELS[voiceSettings.answerStyle]
      const framedMessage =
        voiceSettings.answerStyle !== 'balanced'
          ? `${trimmed}\n\nAnswer style: ${styleLabel}.`
          : trimmed

      try {
        const response = await queryStandaloneOrbConversation({
          message: framedMessage,
          mode,
          conversation_id: conversationId,
          history: historyForRequest.slice(0, -1),
          detail: voiceSettings.answerStyle
        })

        if (response.conversation_id) setConversationId(response.conversation_id)

        const answer = response.answer || 'I could not form a response just now.'
        const assistantId = `a-${Date.now()}`
        setMessages((current) => [...current, { id: assistantId, role: 'assistant', content: answer }])

        if (voiceSettings.voiceReplies && voice.synthesisAvailable) {
          setSpeakingMessageId(assistantId)
          voice.speak(answer, () => setSpeakingMessageId(null))
        }
      } catch (caught) {
        setError(standaloneOrbErrorMessage(caught))
      } finally {
        setPending(false)
      }
    },
    [conversationId, messages, mode, pending, voice, voiceSettings.answerStyle, voiceSettings.voiceReplies]
  )

  useEffect(() => {
    if (!voiceSettings.autoSend) return
    if (voice.phase !== 'transcript_ready' || voice.listening || pending) return
    const trimmed = voice.transcript.trim()
    if (!trimmed) return

    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    autoSendTimerRef.current = setTimeout(() => {
      void sendMessage(trimmed)
    }, 600)

    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    }
  }, [voice.phase, voice.transcript, voice.listening, voiceSettings.autoSend, pending, sendMessage])

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    await sendMessage(input)
  }

  /** barge-in: tap ORB or mic while speaking stops speech and starts listening */
  function handleOrbActivate() {
    if (voice.speaking) {
      voice.interruptForListen()
      return
    }
    if (voice.listening) {
      voice.stopListening()
      return
    }
    if (!voice.recognitionAvailable) return
    voice.startListening()
  }

  function handleMicClick() {
    handleOrbActivate()
  }

  function handleModeChange(next: StandaloneOrbMode) {
    if (voice.speaking) voice.cancelSpeaking()
    setMode(next)
  }

  function startNewChat() {
    if (voice.speaking) voice.cancelSpeaking()
    if (voice.listening) voice.cancelListening()
    voice.pauseVoiceSession()
    setMessages([])
    setConversationId(`standalone-${Date.now().toString(36)}`)
    setInput('')
    setError(null)
    voice.clearTranscript()
  }

  async function exportConversation() {
    if (messages.length === 0) return
    const body = messages.map((m) => `${m.role === 'user' ? 'You' : 'ORB'}: ${m.content}`).join('\n\n')
    await copyToClipboard(body)
    setDraftNotice('Conversation copied to clipboard.')
    setTimeout(() => setDraftNotice(null), 4000)
  }

  function clearConversation() {
    startNewChat()
  }

  function applyPrompt(entry: PromptEntry) {
    setInput(entry.text)
    if (entry.mode) setMode(entry.mode)
    inputRef.current?.focus()
  }

  async function handleDraftWording(text: string) {
    await copyToClipboard(text)
    setDraftNotice('Copied as draft wording. Review before using in records.')
    setTimeout(() => setDraftNotice(null), 5000)
  }

  const modeSafety = MODE_SAFETY[mode]

  return (
    <main className="orb-cinematic-scene relative min-h-[100dvh] overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 orb-cinematic-light-field" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:80px_80px]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1680px] flex-col px-4 py-4 md:px-6 md:py-5">
        <header className="shrink-0 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/90">ORB Care Companion</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-4xl">Standalone residential care assistant</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
                No OS records · no Care Hub access
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-[10px] font-semibold text-cyan-100/90">
                Standalone ORB Care Companion
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="ORB mode">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => handleModeChange(item as StandaloneOrbMode)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  mode === item
                    ? 'border-cyan-300/45 bg-cyan-300/15 text-white shadow-lg shadow-cyan-900/20'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/25'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </header>

        {recordingContext ? (
          <div
            className="mt-4 rounded-2xl border border-teal-300/25 bg-teal-300/10 px-4 py-3 text-sm leading-6 text-teal-50"
            role="status"
          >
            <strong className="font-black">Recording support:</strong> ORB can help with wording and reflection, but it
            cannot see the record.
          </div>
        ) : null}

        {draftNotice ? (
          <p className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-50" role="status">
            {draftNotice}
          </p>
        ) : null}

        {showSafeguardingEscalation ? (
          <div
            className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-950/40 px-4 py-3 text-sm leading-6 text-rose-50"
            role="status"
          >
            Follow your safeguarding procedure immediately if there is current risk. ORB can help you think, but it
            does not replace escalation.
          </div>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-slate-500" role="note">
          ORB remembers this chat while the page is open. It does not access IndiCare records.
        </p>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_minmax(260px,320px)] lg:grid-rows-1">
          <section className="order-1 flex flex-col items-center justify-start rounded-[28px] border border-white/10 bg-slate-950/40 p-5 backdrop-blur-xl lg:order-1">
            <OrbGlow
              state={glowState}
              mode={mode}
              voiceEnabled={voiceSettings.voiceReplies && voice.synthesisAvailable}
              onOrbActivate={handleOrbActivate}
              interactive={voice.recognitionAvailable}
            />
            {voice.listening ? (
              <p className="mt-2 text-xs text-cyan-200">Tap again to stop · or cancel below</p>
            ) : null}
            {voice.interimTranscript && voice.listening ? (
              <p className="mt-3 max-w-xs text-center text-sm italic text-slate-300">&ldquo;{voice.interimTranscript}&rdquo;</p>
            ) : null}
          </section>

          <section className="order-2 flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6" role="log" aria-label="ORB conversation">
              {messages.length === 0 ? (
                <article className="max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-5 leading-7 text-slate-200">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">ORB</p>
                  I help with practice reflection, safeguarding thinking, Ofsted/SCCIF lens, behaviour support and
                  recording quality — without opening IndiCare OS child records or Care Hub.
                </article>
              ) : (
                <>
                  {latestExchange.earlier.length > 0 ? (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setHistoryOpen((open) => !open)}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-400"
                      >
                        <span>Earlier messages ({latestExchange.earlier.length})</span>
                        {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {historyOpen ? (
                        <div className="mt-3 space-y-3">
                          {latestExchange.earlier.map((entry) => (
                            <MessageBubble key={entry.id} entry={entry} compact />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {latestExchange.user ? <MessageBubble entry={latestExchange.user} /> : null}

                  {latestExchange.assistant ? (
                    <article className="max-w-3xl rounded-3xl border border-white/12 bg-white/[0.06] p-5 leading-7 shadow-lg shadow-violet-950/20">
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200/80">ORB · latest</p>
                      <p className="whitespace-pre-wrap text-slate-50">{latestExchange.assistant.content}</p>
                      <ResponseActions
                        messageId={latestExchange.assistant.id}
                        content={latestExchange.assistant.content}
                        speaking={speakingMessageId === latestExchange.assistant.id}
                        synthesisAvailable={voice.synthesisAvailable}
                        onSpeak={() => {
                          setSpeakingMessageId(latestExchange.assistant!.id)
                          voice.speak(latestExchange.assistant!.content, () => setSpeakingMessageId(null))
                        }}
                        onStop={voice.cancelSpeaking}
                        onNewQuestion={() => {
                          setInput('')
                          inputRef.current?.focus()
                        }}
                        onDraft={() => void handleDraftWording(latestExchange.assistant!.content)}
                      />
                    </article>
                  ) : null}
                </>
              )}

              {pending ? (
                <p className="mt-4 text-sm font-semibold text-violet-200" role="status">
                  Thinking…
                </p>
              ) : null}
              {error ? (
                <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50" role="alert">
                  {error}
                </p>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-white/10 bg-slate-950/70 p-4">
              {voice.phase === 'transcript_ready' && voice.displayTranscript ? (
                <div className="mb-3 rounded-2xl border border-teal-300/25 bg-teal-300/8 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-200/90">I heard…</p>
                  <p className="mt-1 text-sm italic text-slate-100">&ldquo;{voice.displayTranscript}&rdquo;</p>
                  {!voiceSettings.autoSend ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void sendMessage(voice.transcript || voice.displayTranscript)}
                        disabled={pending}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cyan-300/20 px-4 text-xs font-black text-cyan-50"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden />
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          voice.clearTranscript()
                          voice.startListening()
                        }}
                        className="inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-xs font-bold text-slate-300"
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
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
                  className="min-h-[3.25rem] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-base text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus-visible:ring-2"
                  placeholder="Type your question — voice is optional"
                  disabled={pending}
                  aria-describedby="orb-standalone-status"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={!voice.recognitionAvailable}
                    aria-label={voice.listening ? 'Stop listening' : 'Start voice input'}
                    className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40 ${
                      voice.listening
                        ? 'border-cyan-300/60 bg-cyan-300/20 text-cyan-50'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40'
                    }`}
                  >
                    {voice.listening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
                  </button>
                  {voice.listening ? (
                    <button
                      type="button"
                      onClick={voice.cancelListening}
                      className="inline-flex h-11 items-center rounded-full border border-white/15 px-4 text-xs font-bold text-slate-300"
                    >
                      Cancel listening
                    </button>
                  ) : null}
                  {voice.speaking ? (
                    <button
                      type="button"
                      onClick={voice.cancelSpeaking}
                      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/15 px-4 text-xs font-black text-amber-50"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                      Stop speaking
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={pending || !input.trim()}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa,#fbbf24)] px-5 text-sm font-black text-slate-950 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-200 md:flex-none md:min-w-[7rem]"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    {pending ? 'Thinking…' : 'Send'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoicePanelOpen((open) => !open)}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-bold text-slate-200"
                    aria-expanded={voicePanelOpen}
                    aria-controls="orb-voice-settings"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden />
                    Voice
                  </button>
                </div>
                <p id="orb-standalone-status" className="text-xs leading-5 text-slate-400" role="status">
                  {voiceStatusLine({ voice, pending })}
                </p>
              </form>
            </div>
          </section>

          <aside className="order-3 flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                New chat
              </button>
              <button
                type="button"
                onClick={clearConversation}
                disabled={messages.length === 0}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Clear
              </button>
              <button
                type="button"
                onClick={() => void exportConversation()}
                disabled={messages.length === 0}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-40"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy chat
              </button>
            </div>

            {voice.recognitionAvailable ? (
              <div className="flex flex-wrap gap-2">
                {voice.voiceSessionPaused ? (
                  <button
                    type="button"
                    onClick={voice.resumeVoiceSession}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100"
                  >
                    Continue conversation
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={voice.pauseVoiceSession}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200"
                  >
                    Pause conversation
                  </button>
                )}
                <button
                  type="button"
                  onClick={voice.endVoiceSession}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200"
                >
                  End voice session
                </button>
              </div>
            ) : null}

            {voicePanelOpen ? (
              <VoiceSettingsPanel
                voice={voice}
                voiceSettings={voiceSettings}
                updateVoiceSettings={updateVoiceSettings}
                onClose={() => setVoicePanelOpen(false)}
              />
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Suggested prompts</p>
              <div className="mt-3 space-y-4">
                {SUGGESTED_PROMPT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{group.title}</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {group.prompts.map((prompt) => (
                        <button
                          key={prompt.text}
                          type="button"
                          onClick={() => applyPrompt(prompt)}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/8"
                        >
                          {prompt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 space-y-2 rounded-[24px] border border-white/10 bg-slate-950/50 p-4 text-xs leading-6 text-slate-400">
              <p>{PRIVACY_STRIP}</p>
              {modeSafety ? <p className="text-slate-300">{modeSafety}</p> : null}
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                GET /orb/standalone/config · POST /orb/standalone/conversation
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function MessageBubble({ entry, compact }: { entry: ChatMessage; compact?: boolean }) {
  return (
    <article
      className={`max-w-3xl rounded-3xl border p-4 leading-7 ${
        compact ? 'text-sm' : ''
      } ${
        entry.role === 'user'
          ? 'ml-auto border-cyan-300/25 bg-cyan-300/8 text-cyan-50'
          : 'border-white/10 bg-white/[0.04] text-slate-100'
      }`}
    >
      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {entry.role === 'user' ? 'You' : 'ORB'}
      </p>
      <p className="whitespace-pre-wrap">{entry.content}</p>
    </article>
  )
}

function ResponseActions({
  content,
  speaking,
  synthesisAvailable,
  onSpeak,
  onStop,
  onNewQuestion,
  onDraft
}: {
  messageId: string
  content: string
  speaking: boolean
  synthesisAvailable: boolean
  onSpeak: () => void
  onStop: () => void
  onNewQuestion: () => void
  onDraft: () => void
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <ActionChip
        icon={<Copy className="h-3 w-3" />}
        label="Copy"
        onClick={() => void copyToClipboard(content)}
      />
      {synthesisAvailable ? (
        speaking ? (
          <ActionChip icon={<Square className="h-3 w-3" />} label="Stop" onClick={onStop} />
        ) : (
          <ActionChip icon={<Volume2 className="h-3 w-3" />} label="Speak again" onClick={onSpeak} />
        )
      ) : null}
      <ActionChip icon={<RotateCcw className="h-3 w-3" />} label="New question" onClick={onNewQuestion} />
      <ActionChip icon={<FileText className="h-3 w-3" />} label="Use as draft wording" onClick={onDraft} />
    </div>
  )
}

function ActionChip({
  icon,
  label,
  onClick
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
    >
      {icon}
      {label}
    </button>
  )
}

function VoiceSettingsPanel({
  voice,
  voiceSettings,
  updateVoiceSettings,
  onClose
}: {
  voice: ReturnType<typeof useStandaloneOrbVoice>
  voiceSettings: ReturnType<typeof useStandaloneOrbVoice>['settings']
  updateVoiceSettings: ReturnType<typeof useStandaloneOrbVoice>['updateSettings']
  onClose: () => void
}) {
  return (
    <div
      id="orb-voice-settings"
      className="rounded-[24px] border border-white/10 bg-slate-950/65 p-4 text-sm text-slate-300"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Voice settings</p>
        <button type="button" onClick={onClose} aria-label="Close voice settings">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <SettingToggle
        label="Voice replies"
        checked={voiceSettings.voiceReplies}
        disabled={!voice.synthesisAvailable}
        onChange={(on) => {
          if (!on) voice.cancelSpeaking()
          updateVoiceSettings({ voiceReplies: on })
        }}
        iconOn={<Volume2 className="h-4 w-4" />}
        iconOff={<VolumeX className="h-4 w-4" />}
      />
      <SettingToggle
        label="Auto-send voice transcript"
        checked={voiceSettings.autoSend}
        disabled={!voice.recognitionAvailable}
        onChange={(on) => updateVoiceSettings({ autoSend: on })}
      />
      <SettingToggle
        label="British female voice preference"
        checked={voiceSettings.britishFemalePreference}
        disabled={!voice.synthesisAvailable}
        onChange={(on) => updateVoiceSettings({ britishFemalePreference: on })}
      />
      <SettingToggle
        label="Show transcript before sending"
        checked={voiceSettings.showTranscriptBeforeSend}
        disabled={!voice.recognitionAvailable}
        onChange={(on) => updateVoiceSettings({ showTranscriptBeforeSend: on })}
      />
      <SettingToggle
        label={`Wake phrase (“${voice.wakePhraseText}”)`}
        checked={voiceSettings.wakePhrase}
        disabled={!voice.continuousRecognitionSupported}
        onChange={(on) => {
          if (!on) voice.stopWakeListening()
          updateVoiceSettings({ wakePhrase: on })
        }}
      />
      {!voice.continuousRecognitionSupported ? (
        <p className="mt-1 text-xs text-amber-200/90">
          Wake word is unavailable in this browser. Tap the ORB or microphone instead.
        </p>
      ) : null}
      <SettingToggle
        label="Continuous conversation"
        checked={voiceSettings.continuousConversation}
        disabled={!voice.recognitionAvailable}
        onChange={(on) => updateVoiceSettings({ continuousConversation: on })}
      />

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-400">Answer style</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(['voice_concise', 'balanced', 'detailed'] as StandaloneOrbAnswerStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => updateVoiceSettings({ answerStyle: style })}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${
                voiceSettings.answerStyle === style
                  ? 'border-cyan-300/45 bg-cyan-300/15 text-cyan-50'
                  : 'border-white/12 text-slate-400'
              }`}
            >
              {ANSWER_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">Preferred voice: British female when available</p>
      <p className="mt-1 text-xs leading-5 text-slate-300">
        Actual voice: {voice.preferredVoiceName || 'browser default'}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Voice availability depends on your device and browser.</p>
      {!voice.recognitionAvailable ? (
        <p className="mt-2 text-xs text-amber-200/90">Speech recognition unavailable — use text input.</p>
      ) : null}
      {!voice.synthesisAvailable ? (
        <p className="mt-1 text-xs text-amber-200/90">Speech synthesis unavailable — voice replies disabled.</p>
      ) : null}
    </div>
  )
}

function SettingToggle({
  label,
  checked,
  disabled,
  onChange,
  iconOn,
  iconOff
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
  iconOn?: ReactNode
  iconOff?: ReactNode
}) {
  return (
    <label className="mt-3 flex items-center justify-between gap-3">
      <span className="text-xs font-semibold">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] disabled:opacity-40"
      >
        {checked ? iconOn : iconOff}
        {checked ? 'On' : 'Off'}
      </button>
    </label>
  )
}
