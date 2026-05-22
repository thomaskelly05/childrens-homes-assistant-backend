'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Copy,
  FileText,
  Menu,
  MessageSquarePlus,
  PanelRightClose,
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
import { OrbKnowledgeLibraryPanel } from '@/components/orb-standalone/orb-knowledge-library'
import { OrbStandaloneSidebar } from '@/components/orb-standalone/orb-standalone-sidebar'
import { useStandaloneOrbVoice, type StandaloneOrbAnswerStyle } from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  buildProfileContextBlock,
  createStandaloneChat,
  dedupeOrbMessages,
  readStandaloneWorkspace,
  repairOrbWorkspace,
  titleFromFirstMessage,
  writeStandaloneWorkspace,
  type StandaloneChat,
  type StandaloneChatMessage,
  type StandaloneOrbSource,
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
const SUBMIT_GUARD_MS = 1500

const ANSWER_STYLE_LABELS: Record<StandaloneOrbAnswerStyle, string> = {
  voice_concise: 'Voice concise',
  balanced: 'Balanced',
  detailed: 'Detailed'
}

type PromptEntry = { text: string; mode?: StandaloneOrbMode }

const PRIMARY_EMPTY_STARTERS: PromptEntry[] = [
  { text: 'Help me write a daily note', mode: 'Record This Properly' },
  { text: 'Explain Ofsted expectations', mode: 'Ofsted Lens' },
  { text: 'Think through a safeguarding concern', mode: 'Safeguarding' },
  { text: 'Make wording more child-centred', mode: 'Record This Properly' }
]

const MORE_EMPTY_STARTERS: PromptEntry[] = [
  { text: 'Reflect after a difficult shift', mode: 'Reflect' },
  { text: 'Help me record an incident calmly.', mode: 'Record This Properly' },
  { text: 'What would Ofsted expect to see here?', mode: 'Ofsted Lens' },
  { text: 'Help me understand behaviour as communication.', mode: 'Behaviour Support' },
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
  if (voice.speechPlaybackError) return voice.speechPlaybackError
  if (!voice.speechInputAvailable && !voice.speechOutputAvailable) {
    return 'Voice is unavailable in this browser. You can still type.'
  }
  if (!voice.speechInputAvailable && voice.speechOutputAvailable) {
    return 'Voice replies may work. Microphone dictation may require Chrome or Edge.'
  }
  if (!voice.speechOutputAvailable && voice.speechInputAvailable) {
    return 'Microphone input is available. Voice replies are not supported here.'
  }
  if (voice.error && voice.wakeStatus === 'unsupported') {
    return voice.error
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
  const [retryPayload, setRetryPayload] = useState<{ text: string; chatId: string } | null>(null)
  const [imageUnderstandingNote, setImageUnderstandingNote] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<PendingImageAttachment[]>([])
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [orbDockExpanded, setOrbDockExpanded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileOrbOpen, setMobileOrbOpen] = useState(false)
  const [startersExpanded, setStartersExpanded] = useState(false)
  const [moreExamplesExpanded, setMoreExamplesExpanded] = useState(false)
  const [composerPromptsExpanded, setComposerPromptsExpanded] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)
  const [knowledgeLibraryOpen, setKnowledgeLibraryOpen] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)
  const sendInFlightRef = useRef(false)
  const submitGuardRef = useRef(false)
  const lastSubmitRef = useRef<{ chatId: string; content: string; at: number } | null>(null)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings, updateSettings: updateVoiceSettings } = voice

  const activeChat = useMemo(() => {
    if (!workspace.activeChatId) return null
    return workspace.chats.find((c) => c.id === workspace.activeChatId) ?? null
  }, [workspace.activeChatId, workspace.chats])

  const messages = activeChat?.messages ?? []
  const visibleMessages = useMemo(() => dedupeOrbMessages(messages), [messages])
  const mode = (activeChat?.mode as StandaloneOrbMode) || queryMode || (recordingContext ? 'Record This Properly' : 'Ask ORB')
  const conversationId = activeChat?.conversationId ?? `standalone-${Date.now().toString(36)}`

  const attachedProfiles = useMemo(
    () => workspace.profiles.filter((p) => activeChat?.profileIds.includes(p.id)),
    [workspace.profiles, activeChat?.profileIds]
  )

  const showEmptyState = visibleMessages.length === 0 && !pending

  useEffect(() => {
    if (hydratedRef.current) writeStandaloneWorkspace(repairOrbWorkspace(workspace))
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
  }, [visibleMessages, pending])

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
    setWorkspace((current) => {
      const nextPatch = { ...patch }
      if (patch.messages) {
        nextPatch.messages = dedupeOrbMessages(patch.messages)
      }
      return patchActiveChat(current, chatId, nextPatch)
    })
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
    async (text: string, options?: { retry?: boolean; chatId?: string }) => {
      const trimmed = text.trim()
      const hasImages = attachments.length > 0
      if ((!trimmed && !hasImages) || pending || sendInFlightRef.current || submitGuardRef.current) return

      const contentKey = (trimmed || '[Image attachment]').trim().toLowerCase()
      const guardChatId = options?.chatId || workspace.activeChatId || 'new'
      const now = Date.now()
      if (
        !options?.retry &&
        lastSubmitRef.current &&
        lastSubmitRef.current.content === contentKey &&
        lastSubmitRef.current.chatId === guardChatId &&
        now - lastSubmitRef.current.at < SUBMIT_GUARD_MS
      ) {
        return
      }

      sendInFlightRef.current = true
      if (!options?.retry) {
        lastSubmitRef.current = { chatId: guardChatId, content: contentKey, at: now }
      }
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
      setRetryPayload(null)
      setImageUnderstandingNote(null)

      const userMessage: StandaloneChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed || '[Image attachment]',
        imageDataUrls: imagePayload.map((i) => i.data_url),
        createdAt: Date.now()
      }

      let targetChatId = options?.chatId || workspace.activeChatId
      let targetChat = targetChatId ? workspace.chats.find((c) => c.id === targetChatId) ?? null : null

      const existingMessages = dedupeOrbMessages(targetChat?.messages ?? [])
      let priorMessages = existingMessages
      if (!options?.retry) {
        const lastMessage = existingMessages[existingMessages.length - 1]
        const isRapidDuplicate =
          lastMessage?.role === 'user' &&
          lastMessage.content.trim().toLowerCase() === contentKey &&
          typeof lastMessage.createdAt === 'number' &&
          now - lastMessage.createdAt < SUBMIT_GUARD_MS
        priorMessages = isRapidDuplicate ? existingMessages : [...existingMessages, userMessage]
      }
      priorMessages = dedupeOrbMessages(priorMessages)
      const nextTitle = !targetChat || targetChat.title === 'New conversation'
        ? titleFromFirstMessage(trimmed || 'Image conversation')
        : targetChat.title

      if (!targetChat) {
        const created = createStandaloneChat(workspace.activeProjectId, mode)
        targetChatId = created.id
        targetChat = {
          ...created,
          messages: options?.retry ? created.messages : priorMessages,
          title: nextTitle,
          mode,
          updatedAt: Date.now()
        }
        setWorkspace((current) => ({
          ...current,
          activeChatId: created.id,
          chats: [targetChat!, ...current.chats]
        }))
      } else if (!options?.retry) {
        targetChat = { ...targetChat, messages: priorMessages, title: nextTitle, mode, updatedAt: Date.now() }
        setWorkspace((current) =>
          patchActiveChat(current, targetChatId!, {
            messages: dedupeOrbMessages(priorMessages),
            title: nextTitle,
            mode
          })
        )
      }

      const historyForRequest = trimConversationHistory(dedupeOrbMessages(priorMessages))
      const sessionConversationId = targetChat.conversationId
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
        if (response.image_understanding_available === false) {
          setImageUnderstandingNote(
            'Image understanding is not available in this environment. ORB answered using your text only.'
          )
        }
        const assistantId = `a-${Date.now()}`
        const responseSources = (
          (response.citations?.length ? response.citations : response.sources) ?? []
        ) as StandaloneOrbSource[]
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === targetChatId)
          if (!chat) return current
          const withAssistant: StandaloneChatMessage[] = dedupeOrbMessages([
            ...chat.messages,
            {
              id: assistantId,
              role: 'assistant',
              content: answer,
              createdAt: Date.now(),
              sources: responseSources.length ? responseSources : undefined
            }
          ])
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
        const message = standaloneOrbErrorMessage(caught)
        setError(message)
        setRetryPayload({ text: trimmed || messageBody, chatId: targetChatId! })
      } finally {
        setPending(false)
        sendInFlightRef.current = false
      }
    },
    [
      attachments,
      attachedProfiles,
      mode,
      pending,
      voice,
      voiceSettings.answerStyle,
      voiceSettings.voiceReplies,
      workspace.activeChatId,
      workspace.activeProjectId,
      workspace.chats
    ]
  )

  const handleComposerSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.()
      if (submitGuardRef.current || pending || sendInFlightRef.current) return
      submitGuardRef.current = true
      void sendMessage(input).finally(() => {
        submitGuardRef.current = false
      })
    },
    [input, pending, sendMessage]
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
    if (visibleMessages.length === 0) return
    const body = visibleMessages.map((m) => `${m.role === 'user' ? 'You' : 'ORB'}: ${m.content}`).join('\n\n')
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
      onSubmit={handleComposerSubmit}
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
      inputRef={inputRef}
    />
  )

  const orbVoiceDock = (
    <OrbFloatingVoiceDock
      expanded={orbDockExpanded}
      glowState={glowState}
      mode={mode}
      voice={voice}
      voiceSettings={voiceSettings}
      updateVoiceSettings={updateVoiceSettings}
      voicePanelOpen={voicePanelOpen}
      onToggleExpanded={() => setOrbDockExpanded((open) => !open)}
      onOrbActivate={handleOrbActivate}
      onToggleVoicePanel={() => setVoicePanelOpen((open) => !open)}
      onCloseVoicePanel={() => setVoicePanelOpen(false)}
    />
  )

  function openVoiceSettings() {
    setOrbDockExpanded(true)
    setVoicePanelOpen(true)
    setSidebarOpen(false)
  }

  return (
    <main className="orb-chat-layout relative flex flex-col overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0 orb-cinematic-light-field opacity-50" aria-hidden />

      <OrbKnowledgeLibraryPanel open={knowledgeLibraryOpen} onClose={() => setKnowledgeLibraryOpen(false)} />

      {sidebarOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-[#0d1117] transition-transform lg:static lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <OrbStandaloneSidebar
            workspace={workspace}
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
            onOpenSettings={openVoiceSettings}
            onOpenKnowledgeLibrary={() => {
              setKnowledgeLibraryOpen(true)
              setSidebarOpen(false)
            }}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <div className="orb-chat-main flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="orb-chat-header flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#05070d]/80 px-3 py-2.5 backdrop-blur-md md:px-5">
            <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-white md:text-base">{activeChat?.title || 'ORB Care Companion'}</h1>
              <p className="truncate text-xs text-slate-500">Standalone residential care assistant</p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200/90 sm:inline">
              No OS records accessed
            </span>
            <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => setProfilePickerOpen((o) => !o)}
                className="hidden rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 sm:inline-flex"
              >
                Profiles
              </button>
              <button type="button" onClick={() => void exportConversation()} disabled={visibleMessages.length === 0} className="hidden rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-40 sm:inline-flex" aria-label="Copy chat">
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => startNewChat()} className="hidden rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 sm:inline-flex" aria-label="New chat">
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            className="orb-mode-chips flex shrink-0 gap-2 overflow-x-auto border-b border-white/[0.04] px-3 py-2.5 md:px-5"
            role="tablist"
            aria-label="ORB mode"
          >
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={mode === item}
                onClick={() => handleModeChange(item as StandaloneOrbMode)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  mode === item
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'bg-white/[0.05] text-slate-400 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-slate-200'
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
          ) : null}

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

          <section className="flex min-h-0 flex-1 flex-col" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
            <div className="orb-chat-thread flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-6" role="log" aria-label="ORB conversation">
              <div className="mx-auto w-full max-w-[var(--orb-chat-column-max,52.5rem)]">
                {showEmptyState ? (
                  <div className="flex min-h-[min(70vh,32rem)] flex-col items-center justify-center py-6 text-center md:py-10">
                    <p className="text-xs font-medium text-slate-500">ORB Care Companion</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">How can I help today?</h2>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
                      Specialist residential children&apos;s homes intelligence — recording, Ofsted, safeguarding, reflection and general questions.
                    </p>
                    <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                      {PRIMARY_EMPTY_STARTERS.map((starter) => (
                        <button
                          key={starter.text}
                          type="button"
                          onClick={() => applyPrompt(starter)}
                          className="orb-starter-card orb-starter-card--primary rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-5 text-left text-[15px] font-medium leading-snug text-slate-200 hover:border-white/15 hover:bg-white/[0.07]"
                        >
                          {starter.text}
                        </button>
                      ))}
                    </div>
                    {moreExamplesExpanded ? (
                      <div className="mt-3 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                        {MORE_EMPTY_STARTERS.map((starter) => (
                          <button
                            key={starter.text}
                            type="button"
                            onClick={() => applyPrompt(starter)}
                            className="orb-starter-card rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm text-slate-400 hover:border-white/12 hover:bg-white/[0.05] hover:text-slate-200"
                          >
                            {starter.text}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setMoreExamplesExpanded((o) => !o)}
                      className="mt-5 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
                    >
                      {moreExamplesExpanded ? 'Fewer examples' : 'More examples'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 pb-4">
                    {imageUnderstandingNote ? (
                      <p className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-2 text-xs text-slate-300" role="status">
                        {imageUnderstandingNote}
                      </p>
                    ) : null}
                    {visibleMessages.map((entry, index) => (
                      <div key={entry.id}>
                        {entry.role === 'assistant' ? (
                          <article className="orb-message-assistant group">
                            <p className="mb-2 text-xs font-medium text-slate-500">ORB</p>
                            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">{entry.content}</div>
                            <SourcesBasis sources={entry.sources} />
                            {index === visibleMessages.length - 1 ? (
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
                            ) : (
                              <div className="mt-2 flex flex-wrap gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                <ActionChip icon={<Copy className="h-3 w-3" />} label="Copy" onClick={() => void copyToClipboard(entry.content)} />
                              </div>
                            )}
                          </article>
                        ) : (
                          <MessageBubble entry={entry} />
                        )}
                      </div>
                    ))}
                    {pending ? (
                      <p className="text-sm text-slate-400" role="status">
                        Thinking that through…
                      </p>
                    ) : null}
                    {error ? (
                      <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-50" role="alert">
                        <p>{error}</p>
                        {retryPayload ? (
                          <button
                            type="button"
                            onClick={() => void sendMessage(retryPayload.text, { retry: true, chatId: retryPayload.chatId })}
                            disabled={pending}
                            className="mt-3 inline-flex h-9 items-center rounded-full border border-amber-200/40 px-4 text-xs font-semibold text-amber-50 hover:bg-amber-400/15 disabled:opacity-40"
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {!showEmptyState && composerPromptsExpanded ? (
              <div className="shrink-0 border-t border-white/[0.04] px-3 py-2 md:px-6">
                <div className="mx-auto flex max-w-[var(--orb-composer-max,53.125rem)] flex-wrap gap-2">
                  {SUGGESTED_PROMPT_GROUPS.flatMap((g) => g.prompts.slice(0, 1)).map((starter) => (
                    <button
                      key={starter.text}
                      type="button"
                      onClick={() => applyPrompt(starter)}
                      className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 ring-1 ring-white/[0.06] hover:text-slate-200"
                    >
                      {starter.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!showEmptyState ? (
              <div className="mx-auto w-full max-w-[var(--orb-composer-max,53.125rem)] px-3 pb-1 md:px-6">
                <button
                  type="button"
                  onClick={() => setComposerPromptsExpanded((o) => !o)}
                  className="text-xs text-slate-500 hover:text-slate-400"
                >
                  {composerPromptsExpanded ? 'Hide prompt ideas' : 'Show prompt ideas'}
                </button>
              </div>
            ) : null}

            {composer}
          </section>
        </div>
      </div>

      <div className={`orb-floating-dock hidden xl:block ${orbDockExpanded ? 'orb-floating-dock--expanded' : 'orb-floating-dock--collapsed'}`}>
        {orbVoiceDock}
      </div>

      {mobileOrbOpen ? (
        <div className="orb-voice-dock fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0a0e16]/95 shadow-2xl backdrop-blur-xl xl:hidden">
          <div className="sticky top-0 flex justify-center bg-[#0a0e16]/95 py-2">
            <button type="button" onClick={() => setMobileOrbOpen(false)} className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-400 ring-1 ring-white/10">
              Close voice ORB
            </button>
          </div>
          <OrbFloatingVoiceDock
            expanded
            glowState={glowState}
            mode={mode}
            voice={voice}
            voiceSettings={voiceSettings}
            updateVoiceSettings={updateVoiceSettings}
            voicePanelOpen={voicePanelOpen}
            onToggleExpanded={() => setMobileOrbOpen(false)}
            onOrbActivate={handleOrbActivate}
            onToggleVoicePanel={() => setVoicePanelOpen((open) => !open)}
            onCloseVoicePanel={() => setVoicePanelOpen(false)}
            mobile
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMobileOrbOpen(true)}
          className="orb-mobile-orb-fab fixed right-4 z-30 flex flex-col items-center gap-1 rounded-full border border-cyan-300/30 bg-[#0a0e16]/95 p-1.5 shadow-lg backdrop-blur xl:hidden"
          aria-label="Open voice ORB — Tap to speak"
        >
          <OrbGlow state={glowState} onOrbActivate={() => { setMobileOrbOpen(true); handleOrbActivate() }} interactive={voice.recognitionAvailable} size="compact" compactLabels />
          <span className="px-1 text-[9px] font-medium text-slate-500">Tap to speak</span>
        </button>
      )}
    </main>
  )
}

function OrbFloatingVoiceDock({
  expanded,
  glowState,
  mode,
  voice,
  voiceSettings,
  updateVoiceSettings,
  voicePanelOpen,
  onToggleExpanded,
  onOrbActivate,
  onToggleVoicePanel,
  onCloseVoicePanel,
  mobile = false
}: {
  expanded: boolean
  glowState: StandaloneOrbGlowState
  mode: StandaloneOrbMode
  voice: ReturnType<typeof useStandaloneOrbVoice>
  voiceSettings: ReturnType<typeof useStandaloneOrbVoice>['settings']
  updateVoiceSettings: ReturnType<typeof useStandaloneOrbVoice>['updateSettings']
  voicePanelOpen: boolean
  onToggleExpanded: () => void
  onOrbActivate: () => void
  onToggleVoicePanel: () => void
  onCloseVoicePanel: () => void
  mobile?: boolean
}) {
  if (!expanded && !mobile) {
    return (
      <div className="orb-floating-dock-trigger">
        <button type="button" onClick={onToggleExpanded} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" aria-label="Expand voice ORB">
          <OrbGlow
            state={glowState}
            voiceEnabled={voiceSettings.voiceReplies && voice.synthesisAvailable}
            onOrbActivate={() => {
              onToggleExpanded()
              onOrbActivate()
            }}
            interactive={voice.recognitionAvailable}
            size="compact"
            compactLabels
          />
        </button>
        <span className="max-w-[5.5rem] text-center text-[10px] font-medium leading-tight text-slate-500">Tap to speak</span>
      </div>
    )
  }

  return (
    <div className={`orb-voice-dock orb-floating-dock-drawer flex flex-col ${mobile ? 'mx-3 mb-4' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <p className="text-xs font-semibold text-slate-300">Voice ORB</p>
        {!mobile ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
            aria-label="Collapse ORB dock"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col items-center px-4 py-5">
        <OrbGlow
          state={glowState}
          mode={mode}
          voiceEnabled={voiceSettings.voiceReplies && voice.synthesisAvailable}
          onOrbActivate={onOrbActivate}
          interactive={voice.recognitionAvailable}
          size="dock"
          compactLabels
        />
        <p className="mt-2 text-center text-xs text-slate-500">Tap to speak</p>
        {voice.interimTranscript && voice.listening ? (
          <p className="mt-2 max-w-[14rem] text-center text-xs italic text-slate-400">&ldquo;{voice.interimTranscript}&rdquo;</p>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-white/[0.06] px-4 py-3">
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
          onClick={onToggleVoicePanel}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-slate-300 ring-1 ring-white/[0.06] hover:bg-white/[0.06]"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Voice settings
        </button>
        {voice.speaking ? (
          <button
            type="button"
            onClick={voice.cancelSpeaking}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-50"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop speaking
          </button>
        ) : null}
        {voice.recognitionAvailable ? (
          <div className="flex gap-2">
            {voice.voiceSessionPaused ? (
              <button type="button" onClick={voice.resumeVoiceSession} className="flex-1 rounded-xl bg-cyan-400/10 px-2 py-2 text-[10px] font-semibold text-cyan-100 ring-1 ring-cyan-300/25">
                Continue conversation
              </button>
            ) : (
              <button type="button" onClick={voice.pauseVoiceSession} className="flex-1 rounded-xl bg-white/[0.04] px-2 py-2 text-[10px] font-medium text-slate-400 ring-1 ring-white/[0.06]">
                Pause conversation
              </button>
            )}
            <button type="button" onClick={voice.endVoiceSession} className="flex-1 rounded-xl bg-white/[0.04] px-2 py-2 text-[10px] font-medium text-slate-400 ring-1 ring-white/[0.06]">
              End voice session
            </button>
          </div>
        ) : null}
      </div>
      {voicePanelOpen ? (
        <div className="border-t border-white/[0.06] p-4">
          <VoiceSettingsPanel voice={voice} voiceSettings={voiceSettings} updateVoiceSettings={updateVoiceSettings} onClose={onCloseVoicePanel} />
        </div>
      ) : null}
    </div>
  )
}

function SourcesBasis({ sources }: { sources?: StandaloneOrbSource[] }) {
  const [open, setOpen] = useState(false)
  if (!sources?.length) return null
  const hasDocumentChunks = sources.some(
    (source) =>
      Boolean((source as { document_chunk?: boolean }).document_chunk) ||
      String(source.type || '').startsWith('document_chunk:')
  )
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-400 hover:underline"
      >
        {open ? 'Hide sources / basis' : 'Sources / basis'}
      </button>
      {hasDocumentChunks && !open ? (
        <p className="mt-1 text-[10px] text-cyan-200/70">Retrieved from ORB Knowledge Library</p>
      ) : null}
      {open ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {hasDocumentChunks ? (
            <p className="text-[10px] font-medium text-cyan-200/80">Retrieved from ORB Knowledge Library</p>
          ) : null}
          {sources.map((source, index) => {
            const extended = source as StandaloneOrbSource & {
              document_chunk?: boolean
              section?: string
              page?: string
              origin?: string
            }
            const isDocument =
              extended.document_chunk || String(extended.type || '').startsWith('document_chunk:')
            const typeLabel = String(extended.type || '')
              .replace(/^document_chunk:/, '')
              .replace(/_/g, ' ')
            const originLabel =
              extended.origin === 'seeded' || extended.origin === 'built_in'
                ? 'Built-in'
                : extended.origin === 'user_uploaded'
                  ? 'Uploaded'
                  : isDocument
                    ? 'Knowledge library'
                    : 'Built-in'
            return (
              <div
                key={`${source.id ?? source.type}-${source.label}-${index}`}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-400"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-slate-300">{source.label}</span>
                  {typeLabel ? (
                    <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">
                      {typeLabel}
                    </span>
                  ) : null}
                  <span className="text-[9px] text-slate-600">{originLabel}</span>
                  {source.live_retrieved === true ? (
                    <span className="text-[9px] text-emerald-600/80">Live retrieved</span>
                  ) : source.live_retrieved === false ? (
                    <span className="text-[9px] text-slate-600">Not live</span>
                  ) : null}
                </div>
                {extended.section ? (
                  <p className="mt-0.5 text-slate-500">Section: {extended.section}</p>
                ) : null}
                {extended.page ? <p className="mt-0.5 text-slate-500">Page: {extended.page}</p> : null}
                {source.basis ? <p className="mt-0.5 text-slate-500">{source.basis}</p> : null}
                {source.note && source.note !== source.basis ? (
                  <p className="mt-0.5 text-slate-600">{source.note}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
      {open ? (
        <p className="mt-1 text-[10px] text-slate-600">Standalone mode — no OS records accessed</p>
      ) : null}
    </div>
  )
}

function MessageBubble({ entry }: { entry: StandaloneChatMessage }) {
  const created = entry.createdAt ? new Date(entry.createdAt) : null
  const timeLabel =
    created && !Number.isNaN(created.getTime())
      ? created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : null

  return (
    <article className="orb-message-user rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/[0.06]">
      {entry.imageDataUrls?.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {entry.imageDataUrls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${entry.id}-img-${index}`} src={url} alt="" className="h-16 w-16 rounded-lg border border-white/10 object-cover" />
          ))}
        </div>
      ) : null}
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">{entry.content}</p>
      {timeLabel ? <p className="mt-1.5 text-right text-[10px] text-slate-600">{timeLabel}</p> : null}
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
    <div className="mt-3 flex flex-wrap gap-1 border-t border-white/[0.04] pt-3">
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
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
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

      <div className="mt-4 space-y-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
        <p className="font-semibold text-slate-400">Browser voice support</p>
        <p className="text-slate-300">
          Voice replies: {voice.speechOutputAvailable ? 'available' : 'unavailable'}
        </p>
        <p className="text-slate-300">
          Microphone input: {voice.speechInputAvailable ? 'available' : 'unavailable'}
        </p>
        <p className="text-slate-300">Wake phrase: {voice.wakePhraseAvailable ? 'available' : 'unavailable'}</p>
        <p className="text-slate-300">
          Continuous conversation: {voice.continuousConversationAvailable}
        </p>
        {!voice.speechInputAvailable && voice.speechOutputAvailable ? (
          <p className="text-amber-200/90">
            Voice replies may work. Microphone dictation may require Chrome or Edge.
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">Actual voice: {voice.preferredVoiceName || 'browser default'}</p>
      {!voice.preferredVoiceIsBritishFemale ? (
        <p className="mt-1 text-xs text-amber-200/90">
          Your browser did not provide a British female voice. Choose another voice in settings or install additional system
          voices.
        </p>
      ) : null}
      <button
        type="button"
        disabled={!voice.synthesisAvailable}
        onClick={() => voice.testSelectedVoice()}
        className="mt-3 inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-xs font-semibold text-slate-200 hover:bg-white/[0.06] disabled:opacity-40"
      >
        Test voice
      </button>
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
