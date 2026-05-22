'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Menu,
  MessageSquarePlus,
  Mic,
  MicOff,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Send,
  Settings2,
  Shield,
  Square,
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
  'Standalone ORB does not access IndiCare records, Care Hub, child files or dashboards.'

const MODE_SAFETY: Partial<Record<StandaloneOrbMode, string>> = {
  Safeguarding:
    'Follow safeguarding procedures and escalate immediate risk. ORB supports thinking; it does not make decisions.',
  'Record This Properly':
    'ORB can help with wording, but review before adding to records.',
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

const EMPTY_STATE_STARTERS: PromptEntry[] = [
  { text: 'Help me write a daily note', mode: 'Record This Properly' },
  { text: 'Explain Ofsted expectations', mode: 'Ofsted Lens' },
  { text: 'Think through a safeguarding concern', mode: 'Safeguarding' },
  { text: 'Reflect after a difficult shift', mode: 'Reflect' },
  { text: 'Make wording more child-centred', mode: 'Record This Properly' },
  { text: 'General question' }
]

const SIDEBAR_SESSION_PLACEHOLDERS = [
  'This session',
  'Recording support',
  'Safeguarding reflection',
  'Ofsted lens'
] as const

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
  if (voice.error && voice.wakeStatus === 'unsupported') {
    return 'Voice is unavailable in this browser. You can still type.'
  }
  if (voice.voiceSessionPaused) return 'Voice session paused. Tap Continue conversation or type.'
  if (voice.phase === 'wake_listening') return `Say "${voice.wakePhraseText}"…`
  if (voice.phase === 'wake_detected') return "Hey, I'm here. Go ahead…"
  if (voice.phase === 'continuous_listening') return "I'm listening…"
  if (voice.listening) return "I'm listening…"
  if (voice.phase === 'transcript_ready' && voice.displayTranscript) {
    return 'I heard you say… review below, then Send or Try again.'
  }
  if (voice.speaking) return 'You can interrupt me any time.'
  if (pending) return 'Thinking that through…'
  if (voice.phase === 'interrupted') return "Stopped — I'm listening."
  if (voice.settings.wakePhrase && voice.wakeStatus === 'listening') {
    return `Wake phrase on — say "${voice.wakePhraseText}" or tap the ORB.`
  }
  return 'Ask me anything, or say Hey ORB.'
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

function conversationTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'New conversation'
  const snippet = firstUser.content.trim().slice(0, 42)
  return snippet.length < firstUser.content.trim().length ? `${snippet}…` : snippet
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
  const [orbDockExpanded, setOrbDockExpanded] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileOrbOpen, setMobileOrbOpen] = useState(false)
  const [startersExpanded, setStartersExpanded] = useState(true)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState(() => `standalone-${Date.now().toString(36)}`)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = voice

  const showEmptyState = messages.length === 0 && !pending

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

  const glowState = glowStateForContext({
    pending,
    voicePhase: voice.phase,
    listening: voice.listening,
    speaking: voice.speaking,
    voiceError: voice.error,
    mode,
    recordingContext
  })

  const chatTitle = useMemo(() => conversationTitle(messages), [messages])

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

  function applyPrompt(entry: PromptEntry) {
    setInput(entry.text)
    if (entry.mode) setMode(entry.mode)
    inputRef.current?.focus()
    setSidebarOpen(false)
  }

  async function handleDraftWording(text: string) {
    await copyToClipboard(text)
    setDraftNotice('Copied as draft wording. Review before using in records.')
    setTimeout(() => setDraftNotice(null), 5000)
  }

  const modeSafety = MODE_SAFETY[mode]

  const composer = (
    <div className="orb-chat-composer shrink-0 border-t border-white/10 bg-[#0a0e16]/95 p-3 backdrop-blur-xl md:p-4">
      {voice.phase === 'transcript_ready' && voice.displayTranscript ? (
        <div className="mb-3 rounded-2xl border border-teal-300/25 bg-teal-300/8 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-200/90">I heard you say…</p>
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
      <form className="mx-auto max-w-3xl" onSubmit={(event) => void submit(event)}>
        <label htmlFor="orb-standalone-input" className="sr-only">
          Message ORB
        </label>
        <div className="flex items-end gap-2 rounded-[28px] border border-white/12 bg-slate-950/90 p-2 shadow-lg shadow-black/20 focus-within:border-cyan-300/35 focus-within:ring-2 focus-within:ring-cyan-300/25">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={!voice.recognitionAvailable}
            aria-label={voice.listening ? 'Stop listening' : 'Start voice input'}
            className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border transition focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40 ${
              voice.listening
                ? 'border-cyan-300/60 bg-cyan-300/20 text-cyan-50'
                : 'border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40'
            }`}
          >
            {voice.listening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
          </button>
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
            rows={1}
            className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-1 py-2.5 text-base text-white outline-none placeholder:text-slate-500"
            placeholder="Message ORB Care Companion…"
            disabled={pending}
            aria-describedby="orb-standalone-status"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send message"
            className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa)] text-slate-950 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p id="orb-standalone-status" className="text-xs leading-5 text-slate-400" role="status">
            {voiceStatusLine({ voice, pending })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400">
              {mode}
            </span>
            <button
              type="button"
              onClick={() => updateVoiceSettings({ voiceReplies: !voiceSettings.voiceReplies })}
              disabled={!voice.synthesisAvailable}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-400 disabled:opacity-40"
            >
              Voice replies: {voiceSettings.voiceReplies ? 'On' : 'Off'}
            </button>
          </div>
        </div>
        {voice.listening || voice.speaking ? (
          <div className="mt-2 flex flex-wrap gap-2 px-1">
            {voice.listening ? (
              <button
                type="button"
                onClick={voice.cancelListening}
                className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-xs font-bold text-slate-300"
              >
                Cancel listening
              </button>
            ) : null}
            {voice.speaking ? (
              <button
                type="button"
                onClick={voice.cancelSpeaking}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 text-xs font-black text-amber-50"
              >
                <Square className="h-3 w-3 fill-current" aria-hidden />
                Stop speaking
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
      <p className="mx-auto mt-3 max-w-3xl px-1 text-[11px] leading-5 text-slate-500" role="note">
        {PRIVACY_STRIP} ORB remembers this chat while the page is open.
      </p>
      {modeSafety ? (
        <p className="mx-auto mt-2 max-w-3xl px-1 text-[11px] leading-5 text-slate-400">{modeSafety}</p>
      ) : null}
    </div>
  )

  const orbDockPanel = (
    <div
      className={`orb-voice-dock flex flex-col ${orbDockExpanded ? 'orb-voice-dock--expanded' : 'orb-voice-dock--collapsed'}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Voice ORB</p>
        <button
          type="button"
          onClick={() => setOrbDockExpanded((open) => !open)}
          className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
          aria-label={orbDockExpanded ? 'Collapse ORB dock' : 'Expand ORB dock'}
        >
          {orbDockExpanded ? <ChevronRight className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>
      {orbDockExpanded ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-3 py-4">
            <OrbGlow
              state={glowState}
              mode={mode}
              voiceEnabled={voiceSettings.voiceReplies && voice.synthesisAvailable}
              onOrbActivate={handleOrbActivate}
              interactive={voice.recognitionAvailable}
              size="dock"
              compactLabels
            />
            {voice.interimTranscript && voice.listening ? (
              <p className="mt-2 max-w-[12rem] text-center text-xs italic text-slate-400">
                &ldquo;{voice.interimTranscript}&rdquo;
              </p>
            ) : null}
          </div>
          <div className="space-y-2 border-t border-white/10 p-3">
            <SettingToggle
              label="Wake phrase (Hey ORB)"
              checked={voiceSettings.wakePhrase}
              disabled={!voice.continuousRecognitionSupported}
              onChange={(on) => {
                if (!on) voice.stopWakeListening()
                updateVoiceSettings({ wakePhrase: on })
              }}
            />
            <SettingToggle
              label="Continuous conversation"
              checked={voiceSettings.continuousConversation}
              disabled={!voice.recognitionAvailable}
              onChange={(on) => updateVoiceSettings({ continuousConversation: on })}
            />
            <SettingToggle
              label="Voice replies"
              checked={voiceSettings.voiceReplies}
              disabled={!voice.synthesisAvailable}
              onChange={(on) => {
                if (!on) voice.cancelSpeaking()
                updateVoiceSettings({ voiceReplies: on })
              }}
              iconOn={<Volume2 className="h-3.5 w-3.5" />}
              iconOff={<VolumeX className="h-3.5 w-3.5" />}
            />
            <button
              type="button"
              onClick={() => setVoicePanelOpen((open) => !open)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-300"
              aria-expanded={voicePanelOpen}
              aria-controls="orb-voice-settings"
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
              Voice settings
            </button>
            {voice.recognitionAvailable ? (
              <div className="flex gap-2">
                {voice.voiceSessionPaused ? (
                  <button
                    type="button"
                    onClick={voice.resumeVoiceSession}
                    className="flex-1 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-2 py-2 text-[10px] font-bold text-cyan-100"
                  >
                    Continue conversation
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={voice.pauseVoiceSession}
                    className="flex-1 rounded-xl border border-white/10 px-2 py-2 text-[10px] font-bold text-slate-300"
                  >
                    Pause conversation
                  </button>
                )}
                <button
                  type="button"
                  onClick={voice.endVoiceSession}
                  className="flex-1 rounded-xl border border-white/10 px-2 py-2 text-[10px] font-bold text-slate-300"
                >
                  End voice session
                </button>
              </div>
            ) : null}
          </div>
          {voicePanelOpen ? (
            <div className="border-t border-white/10 p-3">
              <VoiceSettingsPanel
                voice={voice}
                voiceSettings={voiceSettings}
                updateVoiceSettings={updateVoiceSettings}
                onClose={() => setVoicePanelOpen(false)}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center py-4">
          <button type="button" onClick={handleOrbActivate} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <OrbGlow
              state={glowState}
              voiceEnabled={voiceSettings.voiceReplies && voice.synthesisAvailable}
              onOrbActivate={handleOrbActivate}
              interactive={voice.recognitionAvailable}
              size="compact"
              compactLabels
            />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <main className="orb-chat-layout relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0 orb-cinematic-light-field opacity-60" aria-hidden />

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-white/10 bg-[#070b12] transition-transform lg:static lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200/90">ORB Care Companion</p>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-400 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <button
              type="button"
              onClick={() => {
                startNewChat()
                setSidebarOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-300/30"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
              New chat
            </button>

            <div className="mt-4">
              <p className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Current chat</p>
              <p className="mt-1 truncate rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-200">{chatTitle}</p>
            </div>

            <div className="mt-5">
              <p className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Recent chats</p>
              <ul className="mt-2 space-y-0.5">
                {SIDEBAR_SESSION_PLACEHOLDERS.map((label, index) => (
                  <li key={label}>
                    <button
                      type="button"
                      disabled={index > 0}
                      className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <p className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Mode</p>
              <div className="mt-2 space-y-1">
                {modes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleModeChange(item as StandaloneOrbMode)}
                    className={`w-full rounded-lg px-2 py-2 text-left text-sm font-semibold transition ${
                      mode === item
                        ? 'bg-cyan-300/12 text-cyan-50'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setStartersExpanded((open) => !open)}
                className="flex w-full items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"
              >
                Starters
                {startersExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {startersExpanded ? (
                <div className="mt-2 space-y-1">
                  {SUGGESTED_PROMPT_GROUPS.flatMap((group) => group.prompts.slice(0, 2)).map((prompt) => (
                    <button
                      key={prompt.text}
                      type="button"
                      onClick={() => applyPrompt(prompt)}
                      className="w-full rounded-lg px-2 py-2 text-left text-xs font-semibold leading-5 text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    >
                      {prompt.text}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2.5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              <p className="text-[11px] font-bold leading-5 text-emerald-100/90">Standalone — no OS records</p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="orb-chat-header flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#070b12]/90 px-3 py-3 backdrop-blur-md md:px-5">
            <button
              type="button"
              className="rounded-lg border border-white/10 p-2 text-slate-300 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black tracking-tight text-white md:text-lg">ORB Care Companion</h1>
              <p className="truncate text-xs text-slate-400">Standalone residential care assistant</p>
            </div>
            <span className="hidden shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100 sm:inline">
              No OS records accessed
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => void exportConversation()}
                disabled={messages.length === 0}
                className="hidden rounded-lg border border-white/10 p-2 text-slate-400 disabled:opacity-40 sm:inline-flex"
                aria-label="Copy chat"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={startNewChat}
                className="hidden rounded-lg border border-white/10 p-2 text-slate-400 sm:inline-flex"
                aria-label="New chat"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 p-2 text-slate-300 xl:hidden"
                onClick={() => setMobileOrbOpen((open) => !open)}
                aria-label="Toggle voice ORB"
              >
                {mobileOrbOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
              </button>
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2 md:px-5" role="tablist" aria-label="ORB mode">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => handleModeChange(item as StandaloneOrbMode)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  mode === item
                    ? 'border-cyan-300/45 bg-cyan-300/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/25'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {recordingContext ? (
            <div
              className="mx-3 mt-3 rounded-2xl border border-teal-300/25 bg-teal-300/10 px-4 py-3 text-sm leading-6 text-teal-50 md:mx-5"
              role="status"
            >
              <strong className="font-black">Recording support:</strong> ORB can help with wording and reflection, but it
              cannot see the record.
            </div>
          ) : null}

          {draftNotice ? (
            <p className="mx-3 mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-50 md:mx-5" role="status">
              {draftNotice}
            </p>
          ) : null}

          {showSafeguardingEscalation ? (
            <div
              className="mx-3 mt-3 rounded-2xl border border-rose-300/30 bg-rose-950/40 px-4 py-3 text-sm leading-6 text-rose-50 md:mx-5"
              role="status"
            >
              Follow your safeguarding procedure immediately if there is current risk. ORB can help you think, but it
              does not replace escalation.
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1">
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6" role="log" aria-label="ORB conversation">
                <div className="mx-auto max-w-3xl">
                  {showEmptyState ? (
                    <div className="flex flex-col items-center py-8 text-center md:py-16">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">ORB Care Companion</p>
                      <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">How can I help today?</h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                        Specialist residential children&apos;s homes intelligence — reflection, safeguarding thinking,
                        Ofsted lens and recording quality. No IndiCare OS records or Care Hub.
                      </p>
                      <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                        {EMPTY_STATE_STARTERS.map((starter) => (
                          <button
                            key={starter.text}
                            type="button"
                            onClick={() => applyPrompt(starter)}
                            className="orb-starter-card rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-sm font-semibold leading-6 text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/8"
                          >
                            {starter.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((entry, index) => (
                        <div key={entry.id}>
                          {entry.role === 'assistant' ? (
                            <article className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 leading-7 md:px-5">
                              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/80">ORB</p>
                              <p className="whitespace-pre-wrap text-slate-50">{entry.content}</p>
                              {index === messages.length - 1 ? (
                                <ResponseActions
                                  messageId={entry.id}
                                  content={entry.content}
                                  speaking={speakingMessageId === entry.id}
                                  synthesisAvailable={voice.synthesisAvailable}
                                  onSpeak={() => {
                                    setSpeakingMessageId(entry.id)
                                    voice.speak(entry.content, () => setSpeakingMessageId(null))
                                  }}
                                  onStop={voice.cancelSpeaking}
                                  onNewQuestion={() => {
                                    setInput('')
                                    inputRef.current?.focus()
                                  }}
                                  onDraft={() => void handleDraftWording(entry.content)}
                                />
                              ) : null}
                            </article>
                          ) : (
                            <MessageBubble entry={entry} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {pending ? (
                    <p className="mt-6 text-sm font-semibold text-violet-200" role="status">
                      Thinking that through…
                    </p>
                  ) : null}
                  {error ? (
                    <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {!showEmptyState && (
                <div className="hidden shrink-0 border-t border-white/5 px-3 py-2 md:block md:px-6">
                  <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
                    {EMPTY_STATE_STARTERS.slice(0, 4).map((starter) => (
                      <button
                        key={starter.text}
                        type="button"
                        onClick={() => applyPrompt(starter)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-cyan-300/25 hover:text-slate-200"
                      >
                        {starter.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="hidden xl:block">{composer}</div>
            </section>

            <aside className="orb-voice-dock-column hidden w-[220px] shrink-0 border-l border-white/10 xl:flex">{orbDockPanel}</aside>
          </div>

          <div className="xl:hidden">{composer}</div>
        </div>
      </div>

      {mobileOrbOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-[24px] border border-white/10 bg-[#0a0e16] shadow-2xl xl:hidden">
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={() => setMobileOrbOpen(false)}
              className="rounded-full border border-white/10 px-4 py-1 text-xs font-bold text-slate-400"
            >
              Close voice ORB
            </button>
          </div>
          {orbDockPanel}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMobileOrbOpen(true)}
          className="orb-mobile-orb-fab fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/40 bg-slate-950/90 shadow-lg shadow-cyan-900/30 backdrop-blur xl:hidden"
          aria-label="Open voice ORB"
        >
          <OrbGlow
            state={glowState}
            onOrbActivate={() => {
              setMobileOrbOpen(true)
              handleOrbActivate()
            }}
            interactive={voice.recognitionAvailable}
            size="compact"
            compactLabels
          />
        </button>
      )}
    </main>
  )
}

function MessageBubble({ entry }: { entry: ChatMessage }) {
  return (
    <article className="ml-auto max-w-[85%] rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 leading-7 text-cyan-50 md:max-w-[75%]">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/70">You</p>
      <p className="whitespace-pre-wrap text-sm md:text-base">{entry.content}</p>
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
      <ActionChip icon={<Copy className="h-3 w-3" />} label="Copy" onClick={() => void copyToClipboard(content)} />
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
    <div id="orb-voice-settings" className="text-sm text-slate-300">
      <div className="mb-3 flex items-center justify-between gap-2">
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
      <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-slate-500">
        GET /orb/standalone/config · POST /orb/standalone/conversation
      </p>
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
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] disabled:opacity-40"
      >
        {checked ? iconOn : iconOff}
        {checked ? 'On' : 'Off'}
      </button>
    </label>
  )
}
