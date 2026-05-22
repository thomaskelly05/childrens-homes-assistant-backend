'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Copy,
  FileText,
  Menu,
  MessageSquarePlus,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Settings2,
  Square,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'

import { OrbGlow, type StandaloneOrbGlowState } from '@/components/orb-standalone/orb-glow'
import {
  OrbStandaloneComposer,
  type PendingImageAttachment
} from '@/components/orb-standalone/orb-standalone-composer'
import { OrbStandaloneSidebar } from '@/components/orb-standalone/orb-standalone-sidebar'
import { useStandaloneOrbVoice, type StandaloneOrbAnswerStyle } from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  buildProfileContextBlock,
  createStandaloneChat,
  readStandaloneWorkspace,
  titleFromFirstMessage,
  writeStandaloneWorkspace,
  type StandaloneChat,
  type StandaloneChatMessage,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'
import {
  fetchStandaloneOrbConfig,
  queryStandaloneOrbConversation,
  STANDALONE_ORB_MODES,
  standaloneOrbErrorMessage,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'

const MODE_SAFETY: Partial<Record<StandaloneOrbMode, string>> = {
  Safeguarding:
    'Follow safeguarding procedures and escalate immediate risk. ORB supports thinking; it does not make decisions.',
  'Record This Properly': 'ORB can help with wording, but review before adding to records.',
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
const MAX_IMAGE_ATTACHMENTS = 4

const ANSWER_STYLE_LABELS: Record<StandaloneOrbAnswerStyle, string> = {
  voice_concise: 'Voice concise',
  balanced: 'Balanced',
  detailed: 'Detailed'
}

type PromptEntry = { text: string; mode?: StandaloneOrbMode }

const EMPTY_STATE_STARTERS: PromptEntry[] = [
  { text: 'Help me write a daily note', mode: 'Record This Properly' },
  { text: 'Explain Ofsted expectations', mode: 'Ofsted Lens' },
  { text: 'Think through a safeguarding concern', mode: 'Safeguarding' },
  { text: 'Reflect after a difficult shift', mode: 'Reflect' },
  { text: 'Make wording more child-centred', mode: 'Record This Properly' },
  { text: 'General question' }
]

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
      { text: 'Make this wording more child-centred.', mode: 'Record This Properly' }
    ]
  },
  {
    title: 'Ofsted / SCCIF',
    prompts: [
      { text: 'What would Ofsted expect to see here?', mode: 'Ofsted Lens' },
      { text: 'How do I evidence child voice?', mode: 'Ofsted Lens' }
    ]
  },
  {
    title: 'Safeguarding',
    prompts: [
      { text: 'Does this need manager review?', mode: 'Safeguarding' },
      { text: 'Help me think through a safeguarding concern.', mode: 'Safeguarding' }
    ]
  },
  {
    title: 'Reflective practice',
    prompts: [
      { text: 'Help me reflect after a difficult shift.', mode: 'Reflect' },
      { text: 'Help me understand behaviour as communication.', mode: 'Behaviour Support' }
    ]
  }
]

function trimConversationHistory(messages: StandaloneChatMessage[]): Array<{ role: string; content: string }> {
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

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function patchActiveChat(workspace: StandaloneWorkspace, chatId: string, patch: Partial<StandaloneChat>): StandaloneWorkspace {
  return {
    ...workspace,
    chats: workspace.chats.map((chat) =>
      chat.id === chatId ? { ...chat, ...patch, updatedAt: Date.now() } : chat
    )
  }
}

export function OrbCareCompanion() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q')?.trim() || ''
  const recordingContext = searchParams.get('context') === 'recording'
  const queryMode = modeFromQuery(searchParams.get('mode'))

  const [workspace, setWorkspace] = useState<StandaloneWorkspace>(() => readStandaloneWorkspace())
  const [modes, setModes] = useState<string[]>([...STANDALONE_ORB_MODES])
  const [input, setInput] = useState(initialQuery)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<PendingImageAttachment[]>([])
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [orbDockExpanded, setOrbDockExpanded] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileOrbOpen, setMobileOrbOpen] = useState(false)
  const [startersExpanded, setStartersExpanded] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = voice

  const activeChat = useMemo(() => {
    if (!workspace.activeChatId) return null
    return workspace.chats.find((c) => c.id === workspace.activeChatId) ?? null
  }, [workspace.activeChatId, workspace.chats])

  const messages = activeChat?.messages ?? []
  const mode = (activeChat?.mode as StandaloneOrbMode) || queryMode || (recordingContext ? 'Record This Properly' : 'Ask ORB')
  const conversationId = activeChat?.conversationId ?? `standalone-${Date.now().toString(36)}`

  const attachedProfiles = useMemo(
    () => workspace.profiles.filter((p) => activeChat?.profileIds.includes(p.id)),
    [workspace.profiles, activeChat?.profileIds]
  )

  const showEmptyState = messages.length === 0 && !pending

  useEffect(() => {
    if (hydratedRef.current) writeStandaloneWorkspace(workspace)
  }, [workspace])

  useEffect(() => {
    hydratedRef.current = true
    if (!workspace.activeChatId && !initialQuery) return
    if (workspace.activeChatId) return
    const chat = createStandaloneChat(workspace.activeProjectId, queryMode || (recordingContext ? 'Record This Properly' : 'Ask ORB'))
    setWorkspace((current) => ({ ...current, activeChatId: chat.id, chats: [chat, ...current.chats] }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- bootstrap once

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

  useEffect(() => {
    return voice.registerAfterSpeakListener(() => {
      if (voice.voiceSessionPaused) return
      if (!voiceSettings.continuousConversation) return
      if (!voice.recognitionAvailable) return
      voice.startContinuousListening()
    })
  }, [voice, voiceSettings.continuousConversation])

  const persistChat = useCallback((chatId: string, patch: Partial<StandaloneChat>) => {
    setWorkspace((current) => patchActiveChat(current, chatId, patch))
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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      const hasImages = attachments.length > 0
      if ((!trimmed && !hasImages) || pending) return

      if (voice.speaking) voice.cancelSpeaking()

      const imagePayload = attachments.map((a) => ({ data_url: a.dataUrl, name: a.name }))
      const profileBlock = buildProfileContextBlock(attachedProfiles)
      const messageBody = [
        profileBlock,
        trimmed || (hasImages ? 'Please look at the image(s) I shared and help me with this.' : '')
      ]
        .filter(Boolean)
        .join('\n\n')

      setInput('')
      setAttachments([])
      voice.clearTranscript()
      voice.markIdle()
      setPending(true)
      setError(null)

      let chatSnapshot: StandaloneChat | null = null
      let historyForRequest: Array<{ role: string; content: string }> = []
      let sessionConversationId = conversationId

      setWorkspace((current) => {
        let chat = current.activeChatId ? current.chats.find((c) => c.id === current.activeChatId) ?? null : null
        if (!chat) {
          chat = createStandaloneChat(current.activeProjectId, mode)
          current = {
            ...current,
            activeChatId: chat.id,
            chats: [chat, ...current.chats]
          }
        }
        const userMessage: StandaloneChatMessage = {
          id: `u-${Date.now()}`,
          role: 'user',
          content: trimmed || '[Image attachment]',
          imageDataUrls: imagePayload.map((i) => i.data_url),
          createdAt: Date.now()
        }
        const nextMessages = [...chat.messages, userMessage]
        historyForRequest = trimConversationHistory(nextMessages)
        sessionConversationId = chat.conversationId
        const title =
          chat.title === 'New conversation' ? titleFromFirstMessage(trimmed || 'Image conversation') : chat.title
        chatSnapshot = { ...chat, messages: nextMessages, title, mode, updatedAt: Date.now() }
        return patchActiveChat(current, chat.id, { messages: nextMessages, title, mode })
      })

      if (!chatSnapshot) return

      const styleLabel = ANSWER_STYLE_LABELS[voiceSettings.answerStyle]
      const framedMessage =
        voiceSettings.answerStyle !== 'balanced' ? `${messageBody}\n\nAnswer style: ${styleLabel}.` : messageBody

      try {
        const response = await queryStandaloneOrbConversation({
          message: framedMessage,
          mode,
          conversation_id: sessionConversationId,
          history: historyForRequest.slice(0, -1),
          detail: voiceSettings.answerStyle,
          images: imagePayload.length ? imagePayload : undefined
        })

        const newConversationId = response.conversation_id || sessionConversationId
        const answer = response.answer || 'I could not form a response just now.'
        const assistantId = `a-${Date.now()}`
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === chatSnapshot?.id)
          if (!chat) return current
          const withAssistant: StandaloneChatMessage[] = [
            ...chat.messages,
            { id: assistantId, role: 'assistant', content: answer, createdAt: Date.now() }
          ]
          return patchActiveChat(current, chat.id, {
            messages: withAssistant,
            conversationId: newConversationId
          })
        })

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
    [attachments, attachedProfiles, conversationId, mode, pending, voice, voiceSettings.answerStyle, voiceSettings.voiceReplies]
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

  function handleModeChange(next: StandaloneOrbMode) {
    if (voice.speaking) voice.cancelSpeaking()
    if (!activeChat) {
      const chat = createStandaloneChat(workspace.activeProjectId, next)
      setWorkspace((current) => ({
        ...current,
        activeChatId: chat.id,
        chats: [chat, ...current.chats]
      }))
      return
    }
    persistChat(activeChat.id, { mode: next })
  }

  function startNewChat(projectId?: string) {
    if (voice.speaking) voice.cancelSpeaking()
    if (voice.listening) voice.cancelListening()
    voice.pauseVoiceSession()
    const chat = createStandaloneChat(projectId || workspace.activeProjectId, mode)
    setWorkspace((current) => ({
      ...current,
      activeChatId: chat.id,
      activeProjectId: projectId || current.activeProjectId,
      chats: [chat, ...current.chats]
    }))
    setInput('')
    setAttachments([])
    setError(null)
    voice.clearTranscript()
    setSidebarOpen(false)
  }

  function selectChat(chatId: string) {
    const chat = workspace.chats.find((c) => c.id === chatId)
    if (!chat) return
    setWorkspace((current) => ({
      ...current,
      activeChatId: chatId,
      activeProjectId: chat.projectId
    }))
    setInput('')
    setAttachments([])
    setError(null)
    setSidebarOpen(false)
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
    if (entry.mode) handleModeChange(entry.mode)
    inputRef.current?.focus()
    setSidebarOpen(false)
  }

  async function handleDraftWording(text: string) {
    await copyToClipboard(text)
    setDraftNotice('Copied as draft wording. Review before using in records.')
    setTimeout(() => setDraftNotice(null), 5000)
  }

  async function addImageFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    const remaining = MAX_IMAGE_ATTACHMENTS - attachments.length
    const slice = list.slice(0, remaining)
    const next: PendingImageAttachment[] = []
    for (const file of slice) {
      const dataUrl = await readFileAsDataUrl(file)
      next.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dataUrl,
        name: file.name,
        previewUrl: dataUrl
      })
    }
    setAttachments((current) => [...current, ...next].slice(0, MAX_IMAGE_ATTACHMENTS))
  }

  function handlePaste(event: React.ClipboardEvent) {
    const items = event.clipboardData?.items
    if (!items) return
    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length) {
      event.preventDefault()
      void addImageFiles(imageFiles)
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer.files?.length) void addImageFiles(event.dataTransfer.files)
  }

  function toggleProfileOnChat(profileId: string) {
    if (!activeChat) return
    const has = activeChat.profileIds.includes(profileId)
    const profileIds = has
      ? activeChat.profileIds.filter((id) => id !== profileId)
      : [...activeChat.profileIds, profileId]
    persistChat(activeChat.id, { profileIds })
  }

  const modeSafety = MODE_SAFETY[mode]

  const composer = (
    <OrbStandaloneComposer
      input={input}
      pending={pending}
      mode={mode}
      attachments={attachments}
      voiceListening={voice.listening}
      voiceSpeaking={voice.speaking}
      voiceRecognitionAvailable={voice.recognitionAvailable}
      voiceStatusText={voiceStatusLine({ voice, pending })}
      voiceReplies={voiceSettings.voiceReplies}
      synthesisAvailable={voice.synthesisAvailable}
      transcriptReady={voice.phase === 'transcript_ready'}
      displayTranscript={voice.displayTranscript}
      autoSend={voiceSettings.autoSend}
      onInputChange={setInput}
      onSubmit={() => void sendMessage(input)}
      onMicClick={handleOrbActivate}
      onCancelListening={voice.cancelListening}
      onStopSpeaking={voice.cancelSpeaking}
      onToggleVoiceReplies={() => updateVoiceSettings({ voiceReplies: !voiceSettings.voiceReplies })}
      onSendTranscript={() => void sendMessage(voice.transcript || voice.displayTranscript)}
      onRetryTranscript={() => {
        voice.clearTranscript()
        voice.startListening()
      }}
      onAddFiles={(files) => void addImageFiles(files)}
      onRemoveAttachment={(id) => setAttachments((current) => current.filter((a) => a.id !== id))}
      onPaste={handlePaste}
      onDrop={handleDrop}
    />
  )

  const orbDockPanel = (
    <div className={`orb-voice-dock flex flex-col ${orbDockExpanded ? 'orb-voice-dock--expanded' : 'orb-voice-dock--collapsed'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Voice ORB</p>
        <button
          type="button"
          onClick={() => setOrbDockExpanded((open) => !open)}
          className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
          aria-label={orbDockExpanded ? 'Collapse ORB dock' : 'Expand ORB dock'}
        >
          {orbDockExpanded ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
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
            >
              <Settings2 className="h-3.5 w-3.5" />
              Voice settings
            </button>
            {voice.recognitionAvailable ? (
              <div className="flex gap-2">
                {voice.voiceSessionPaused ? (
                  <button type="button" onClick={voice.resumeVoiceSession} className="flex-1 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-2 py-2 text-[10px] font-bold text-cyan-100">
                    Continue conversation
                  </button>
                ) : (
                  <button type="button" onClick={voice.pauseVoiceSession} className="flex-1 rounded-xl border border-white/10 px-2 py-2 text-[10px] font-bold text-slate-300">
                    Pause conversation
                  </button>
                )}
                <button type="button" onClick={voice.endVoiceSession} className="flex-1 rounded-xl border border-white/10 px-2 py-2 text-[10px] font-bold text-slate-300">
                  End voice session
                </button>
              </div>
            ) : null}
          </div>
          {voicePanelOpen ? (
            <div className="border-t border-white/10 p-3">
              <VoiceSettingsPanel voice={voice} voiceSettings={voiceSettings} updateVoiceSettings={updateVoiceSettings} onClose={() => setVoicePanelOpen(false)} />
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
        <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-white/10 bg-[#070b12] transition-transform lg:static lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <OrbStandaloneSidebar
            workspace={workspace}
            modes={modes}
            currentMode={mode}
            chatSearch={chatSearch}
            startersExpanded={startersExpanded}
            suggestedPromptGroups={SUGGESTED_PROMPT_GROUPS}
            onChatSearchChange={setChatSearch}
            onToggleStarters={() => setStartersExpanded((o) => !o)}
            onApplyPrompt={applyPrompt}
            onSelectChat={selectChat}
            onNewChat={startNewChat}
            onSelectProject={(projectId) => setWorkspace((c) => ({ ...c, activeProjectId: projectId }))}
            onWorkspaceChange={setWorkspace}
            onModeChange={handleModeChange}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="orb-chat-header flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#070b12]/90 px-3 py-3 backdrop-blur-md md:px-5">
            <button type="button" className="rounded-lg border border-white/10 p-2 text-slate-300 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
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
              <button type="button" onClick={() => void exportConversation()} disabled={messages.length === 0} className="hidden rounded-lg border border-white/10 p-2 text-slate-400 disabled:opacity-40 sm:inline-flex" aria-label="Copy chat">
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => startNewChat()} className="hidden rounded-lg border border-white/10 p-2 text-slate-400 sm:inline-flex" aria-label="New chat">
                <MessageSquarePlus className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-lg border border-white/10 p-2 text-slate-300 xl:hidden" onClick={() => setMobileOrbOpen((o) => !o)} aria-label="Toggle voice ORB">
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
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  mode === item ? 'border-cyan-300/45 bg-cyan-300/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/25'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {recordingContext ? (
            <div className="mx-3 mt-3 rounded-2xl border border-teal-300/25 bg-teal-300/10 px-4 py-3 text-sm leading-6 text-teal-50 md:mx-5" role="status">
              <strong className="font-black">Recording support:</strong> ORB can help with wording and reflection, but it cannot see the record.
            </div>
          ) : null}

          {attachedProfiles.length > 0 ? (
            <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 md:mx-5">
              {attachedProfiles.map((profile) => (
                <span key={profile.id} className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100">
                  {profile.avatarInitial} {profile.name}
                  <button type="button" onClick={() => toggleProfileOnChat(profile.id)} className="text-violet-200/80 hover:text-white" aria-label={`Remove ${profile.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => setProfilePickerOpen((o) => !o)} className="text-xs font-bold text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline">
                Attach profile
              </button>
            </div>
          ) : (
            <div className="mx-3 mt-2 md:mx-5">
              <button type="button" onClick={() => setProfilePickerOpen((o) => !o)} className="text-xs font-bold text-slate-500 hover:text-slate-300">
                Attach standalone profile to this chat
              </button>
            </div>
          )}

          {profilePickerOpen ? (
            <div className="mx-3 mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:mx-5">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Profiles — user-provided context only</p>
              {workspace.profiles.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">Create a profile in the sidebar first.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {workspace.profiles.map((profile) => (
                    <li key={profile.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={activeChat?.profileIds.includes(profile.id) ?? false}
                          onChange={() => toggleProfileOnChat(profile.id)}
                        />
                        <span className="text-sm text-slate-200">{profile.name}</span>
                        <span className="text-xs text-slate-500">{profile.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {draftNotice ? (
            <p className="mx-3 mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-50 md:mx-5" role="status">
              {draftNotice}
            </p>
          ) : null}

          {showSafeguardingEscalation ? (
            <div className="mx-3 mt-3 rounded-2xl border border-rose-300/30 bg-rose-950/40 px-4 py-3 text-sm leading-6 text-rose-50 md:mx-5" role="status">
              Follow your safeguarding procedure immediately if there is current risk. ORB can help you think, but it does not replace escalation.
            </div>
          ) : null}

          {modeSafety ? (
            <p className="mx-3 mt-2 text-[11px] leading-5 text-slate-500 md:mx-5">{modeSafety}</p>
          ) : null}

          <div className="flex min-h-0 flex-1" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6" role="log" aria-label="ORB conversation">
                <div className="mx-auto max-w-3xl">
                  {showEmptyState ? (
                    <div className="flex flex-col items-center py-8 text-center md:py-16">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80">ORB Care Companion</p>
                      <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">How can I help today?</h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                        Specialist residential children&apos;s homes intelligence — reflection, safeguarding thinking, Ofsted lens and recording quality. No IndiCare OS records or Care Hub.
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

              {!showEmptyState ? (
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
              ) : null}

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
            <button type="button" onClick={() => setMobileOrbOpen(false)} className="rounded-full border border-white/10 px-4 py-1 text-xs font-bold text-slate-400">
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
          <OrbGlow state={glowState} onOrbActivate={() => { setMobileOrbOpen(true); handleOrbActivate() }} interactive={voice.recognitionAvailable} size="compact" compactLabels />
        </button>
      )}
    </main>
  )
}

function MessageBubble({ entry }: { entry: StandaloneChatMessage }) {
  return (
    <article className="ml-auto max-w-[85%] rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 leading-7 text-cyan-50 md:max-w-[75%]">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/70">You</p>
      {entry.imageDataUrls?.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {entry.imageDataUrls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${entry.id}-img-${index}`} src={url} alt="" className="h-20 w-20 rounded-lg border border-white/15 object-cover" />
          ))}
        </div>
      ) : null}
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

function ActionChip({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/30 hover:text-white">
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
  const sortedVoices = useMemo(() => {
    return [...voice.availableVoices].sort((a, b) => a.name.localeCompare(b.name))
  }, [voice.availableVoices])

  return (
    <div id="orb-voice-settings" className="text-sm text-slate-300">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Voice settings</p>
        <button type="button" onClick={onClose} aria-label="Close voice settings">
          <X className="h-4 w-4" />
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
        <p className="mt-1 text-xs text-amber-200/90">Wake word is unavailable in this browser. Tap the ORB or microphone instead.</p>
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
                voiceSettings.answerStyle === style ? 'border-cyan-300/45 bg-cyan-300/15 text-cyan-50' : 'border-white/12 text-slate-400'
              }`}
            >
              {ANSWER_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-slate-400" htmlFor="orb-voice-picker">
          Voice picker
        </label>
        <select
          id="orb-voice-picker"
          value={voiceSettings.selectedVoiceUri ?? ''}
          onChange={(event) => voice.setSelectedVoiceUri(event.target.value || null)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-slate-200"
        >
          <option value="">Auto (prefer British female)</option>
          {sortedVoices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">Preferred voice: British female</p>
      <p className="mt-1 text-xs leading-5 text-slate-300">Actual voice: {voice.preferredVoiceName || 'browser default'}</p>
      {!voice.preferredVoiceIsBritishFemale && voice.preferredVoiceName ? (
        <p className="mt-1 text-xs text-amber-200/90">
          Your browser may not expose a British female voice. Pick one manually above if available.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">Long replies use chunked speech for Safari and Chrome reliability.</p>
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
