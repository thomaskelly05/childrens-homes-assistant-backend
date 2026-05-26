'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode
} from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Copy,
  FileText,
  Menu,
  MessageSquarePlus,
  RotateCcw,
  Settings2,
  Square,
  Volume2,
  Wrench,
  X
} from 'lucide-react'
import {
  OrbStandaloneComposer,
  type PendingImageAttachment
} from '@/components/orb-standalone/orb-standalone-composer'
import { OrbAgentPanel } from '@/components/orb-standalone/orb-agent-panel'
import { OrbDocumentPanel } from '@/components/orb-standalone/orb-document-panel'
import { OrbSavedOutputsPanel } from '@/components/orb-standalone/orb-saved-outputs-panel'
import { OrbKnowledgeLibraryPanel } from '@/components/orb-standalone/orb-knowledge-library'
import { OrbStandaloneAccessibilityPanel } from '@/components/orb-standalone/orb-accessibility-panel'
import { OrbIntelligenceMapPanel } from '@/components/orb-standalone/orb-intelligence-map-panel'
import { OrbMemoryPanel } from '@/components/orb-standalone/orb-memory-panel'
import { OrbPermissionsPanel } from '@/components/orb-standalone/orb-permissions-panel'
import { OrbToolsPanel } from '@/components/orb-standalone/orb-tools-panel'
import { OrbStandaloneSettingsPanel } from '@/components/orb-standalone/orb-standalone-settings-panel'
import {
  ORB_TOOL_TO_PANEL,
  type OrbStandalonePanel
} from '@/components/orb-standalone/orb-standalone-panel-types'
import { OrbStandaloneSidebar } from '@/components/orb-standalone/orb-standalone-sidebar'
import { modeChipLabel } from '@/components/orb-standalone/orb-mode-labels'
import {
  defaultStandaloneOrbAccessibility,
  loadStandaloneOrbAccessibility,
  standaloneOrbAccessibilityClassNames,
  type StandaloneOrbAccessibilityPreferences
} from '@/lib/orb/standalone-accessibility'
import { useAuth } from '@/contexts/auth-context'
import { useMounted } from '@/hooks/use-mounted'
import { STANDALONE_ORB_CSRF_REFRESH_MESSAGE } from '@/lib/auth/api'
import { standaloneOsBoundaryReply } from '@/lib/orb/standalone-os-boundary'
import { useStandaloneOrbVoice, type StandaloneOrbAnswerStyle } from '@/components/orb-standalone/use-standalone-orb-voice'
import {
  buildProfileContextBlock,
  createStandaloneChat,
  dedupeOrbMessages,
  defaultWorkspace,
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
  createOrbSavedOutput,
  fetchOrbSavedOutputsSummary,
  fetchStandaloneOrbConfig,
  parseStandaloneOrbSendError,
  queryStandaloneOrbConversation,
  STANDALONE_ORB_EMPTY_ANSWER_MESSAGE,
  STANDALONE_ORB_MODES,
  type StandaloneOrbAgentSuggestion,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'

/** Standalone /orb is text-first; voice ships in a future ORB Voice surface. */
const STANDALONE_ORB_VOICE_CAPTURE_ENABLED = false
const VOICE_MODE_COMING_SOON = 'Voice mode is coming next — type your message below.'

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
const ORB_THINKING_LABEL = 'ORB is thinking…'

type LastSendStatus = 'idle' | 'sending' | 'success' | 'error'

function replaceMessageById(
  messages: StandaloneChatMessage[],
  messageId: string,
  next: StandaloneChatMessage
): StandaloneChatMessage[] {
  return dedupeOrbMessages(messages.map((entry) => (entry.id === messageId ? next : entry)))
}

function stripTrailingTurnPlaceholders(messages: StandaloneChatMessage[]): StandaloneChatMessage[] {
  const copy = [...messages]
  while (copy.length > 0) {
    const last = copy[copy.length - 1]
    if (last.role === 'assistant' && (last.status === 'thinking' || last.status === 'error')) {
      copy.pop()
      continue
    }
    break
  }
  return dedupeOrbMessages(copy)
}

function createThinkingPlaceholder(id: string): StandaloneChatMessage {
  return {
    id,
    role: 'assistant',
    content: '',
    status: 'thinking',
    thinkingLabel: ORB_THINKING_LABEL,
    createdAt: Date.now()
  }
}

function createErrorPlaceholder(id: string, message: string): StandaloneChatMessage {
  return {
    id,
    role: 'assistant',
    content: message,
    status: 'error',
    createdAt: Date.now()
  }
}

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
  micNotice: string | null
  voiceCaptureEnabled: boolean
}): string {
  const { voice, pending, micNotice, voiceCaptureEnabled } = options
  if (micNotice) return micNotice
  if (!voiceCaptureEnabled) return ''
  if (voice.listening || voice.phase === 'continuous_listening' || voice.phase === 'wake_listening') {
    return 'Listening…'
  }
  if (pending) return 'Thinking…'
  if (voice.speaking) return 'Speaking…'
  return ''
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
  const { csrfReady, refreshSession } = useAuth()
  const mounted = useMounted()
  const searchParams = useSearchParams()
  const initialQuery = mounted ? searchParams.get('q')?.trim() || '' : ''
  const recordingContext = mounted && searchParams.get('context') === 'recording'
  const queryMode = mounted ? modeFromQuery(searchParams.get('mode')) : undefined

  const [workspace, setWorkspace] = useState<StandaloneWorkspace>(() => defaultWorkspace())
  const [modes, setModes] = useState<string[]>([...STANDALONE_ORB_MODES])
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [lastSendStatus, setLastSendStatus] = useState<LastSendStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [retryPayload, setRetryPayload] = useState<{ text: string; chatId: string } | null>(null)
  const [imageUnderstandingNote, setImageUnderstandingNote] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<PendingImageAttachment[]>([])
  const [micNotice, setMicNotice] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<OrbStandalonePanel>(null)
  const [modesBarOpen, setModesBarOpen] = useState(false)
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)
  const [moreExamplesExpanded, setMoreExamplesExpanded] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)
  const [savedOutputsCount, setSavedOutputsCount] = useState(0)
  const [a11yPrefs, setA11yPrefs] = useState<StandaloneOrbAccessibilityPreferences>(defaultStandaloneOrbAccessibility)
  const [fallbackConversationId] = useState('standalone-session')
  const [agentPanelPrompt, setAgentPanelPrompt] = useState('')
  const [agentPanelType, setAgentPanelType] = useState<string | undefined>()
  const [pendingDocument, setPendingDocument] = useState<{
    text: string
    title: string
    sourceId: string | null
  } | null>(null)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const composerUserEditedRef = useRef(false)
  const voiceMayFillComposerRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)
  const sendInFlightRef = useRef(false)
  const submitGuardRef = useRef(false)
  const lastSubmitRef = useRef<{ chatId: string; content: string; at: number } | null>(null)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings } = voice

  const activeProject = useMemo(
    () => workspace.projects.find((p) => p.id === workspace.activeProjectId),
    [workspace.projects, workspace.activeProjectId]
  )

  useEffect(() => {
    void fetchOrbSavedOutputsSummary()
      .then((summary) => setSavedOutputsCount(summary.total || 0))
      .catch(() => setSavedOutputsCount(0))
  }, [activePanel])

  useEffect(() => {
    setWorkspace(readStandaloneWorkspace())
    setA11yPrefs(loadStandaloneOrbAccessibility())
  }, [])

  useEffect(() => {
    if (!mounted) return
    const q = searchParams.get('q')?.trim()
    if (q) setMessage(q)
  }, [mounted, searchParams])

  const activeChat = useMemo(() => {
    if (!workspace.activeChatId) return null
    return workspace.chats.find((c) => c.id === workspace.activeChatId) ?? null
  }, [workspace.activeChatId, workspace.chats])

  const messages = activeChat?.messages ?? []
  const visibleMessages = useMemo(() => dedupeOrbMessages(messages), [messages])
  const mode =
    (activeChat?.mode as StandaloneOrbMode) ||
    queryMode ||
    (recordingContext ? 'Record This Properly' : 'Ask ORB')
  const conversationId = activeChat?.conversationId ?? fallbackConversationId

  const attachedProfiles = useMemo(
    () => workspace.profiles.filter((p) => activeChat?.profileIds.includes(p.id)),
    [workspace.profiles, activeChat?.profileIds]
  )

  const showEmptyState = visibleMessages.length === 0 && !pending && !error

  const closeAllPanels = useCallback(() => {
    setActivePanel(null)
  }, [])

  const closePanel = closeAllPanels

  const openPanel = useCallback((panel: Exclude<OrbStandalonePanel, null>) => {
    setActivePanel(panel)
  }, [])

  const openTool = useCallback(
    (toolId: string) => {
      const panel = ORB_TOOL_TO_PANEL[toolId]
      if (panel) openPanel(panel)
    },
    [openPanel]
  )
  const openToolsPanel = useCallback(() => openPanel('tools'), [openPanel])
  const openSettingsPanel = useCallback(() => openPanel('settings'), [openPanel])
  const openDocumentsPanel = useCallback(() => openPanel('documents'), [openPanel])
  const openAgentsPanel = useCallback(() => openPanel('agents'), [openPanel])
  const openKnowledgeLibrary = useCallback(() => openPanel('knowledge'), [openPanel])
  const openSavedOutputsPanel = useCallback(() => openPanel('saved_outputs'), [openPanel])
  const openMemoryPanel = useCallback(() => openPanel('memory'), [openPanel])
  const openAccessibilityPanel = useCallback(() => openPanel('accessibility'), [openPanel])
  const openPermissionsPanel = useCallback(() => openPanel('permissions'), [openPanel])
  const openIntelligenceMap = useCallback(() => openPanel('intelligence_map'), [openPanel])

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
    if (!STANDALONE_ORB_VOICE_CAPTURE_ENABLED) return
    const display = voice.displayTranscript.trim()
    const transcriptReady = voice.phase === 'transcript_ready'
    if (!display || (!voice.listening && !transcriptReady)) return
    if (composerUserEditedRef.current && !voiceMayFillComposerRef.current) return
    setMessage(display)
  }, [voice.displayTranscript, voice.listening, voice.phase])

  const scrolledMessageCountRef = useRef(0)
  useEffect(() => {
    const count = visibleMessages.length
    const shouldScroll = pending || count !== scrolledMessageCountRef.current
    if (!shouldScroll) return
    scrolledMessageCountRef.current = count
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    messagesEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'end'
    })
  }, [visibleMessages.length, pending])

  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    }
  }, [])

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
    transcriptHasHighRiskTerms(message) ||
    transcriptHasHighRiskTerms(voice.transcript) ||
    messages.some((m) => m.role === 'user' && transcriptHasHighRiskTerms(m.content))

  const sendMessage = useCallback(
    async (text: string, options?: { retry?: boolean; chatId?: string }) => {
      const trimmed = text.trim()
      const hasImages = attachments.length > 0
      if ((!trimmed && !hasImages) || pending || sendInFlightRef.current || submitGuardRef.current) return
      if (!csrfReady) {
        setError(STANDALONE_ORB_CSRF_REFRESH_MESSAGE)
        setLastSendStatus('error')
        void refreshSession()
        return
      }

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

      setPending(true)
      setLastSendStatus('sending')
      setError(null)
      setRetryPayload(null)
      setImageUnderstandingNote(null)

      const userMessageId = `u-${now}`
      const thinkingMessageId = `a-thinking-${now}`
      const userMessage: StandaloneChatMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmed || '[Image attachment]',
        imageDataUrls: imagePayload.map((i) => i.data_url),
        status: 'sent',
        createdAt: now
      }
      const thinkingMessage = createThinkingPlaceholder(thinkingMessageId)

      let targetChatId = options?.chatId || workspace.activeChatId
      let targetChat = targetChatId ? workspace.chats.find((c) => c.id === targetChatId) ?? null : null

      const existingMessages = dedupeOrbMessages(targetChat?.messages ?? [])
      let priorMessages = existingMessages
      if (options?.retry) {
        priorMessages = stripTrailingTurnPlaceholders(existingMessages)
      } else {
        const lastMessage = existingMessages[existingMessages.length - 1]
        const isRapidDuplicate =
          lastMessage?.role === 'user' &&
          lastMessage.content.trim().toLowerCase() === contentKey &&
          typeof lastMessage.createdAt === 'number' &&
          now - lastMessage.createdAt < SUBMIT_GUARD_MS
        priorMessages = isRapidDuplicate
          ? [...stripTrailingTurnPlaceholders(existingMessages), thinkingMessage]
          : [...existingMessages, userMessage, thinkingMessage]
      }
      priorMessages = dedupeOrbMessages(priorMessages)
      const nextTitle = !targetChat || targetChat.title === 'New conversation'
        ? titleFromFirstMessage(trimmed || 'Image conversation')
        : targetChat.title

      const commitMessages = (messages: StandaloneChatMessage[]) => {
        const normalized = dedupeOrbMessages(messages)
        if (!targetChatId) return
        setWorkspace((current) =>
          patchActiveChat(current, targetChatId!, {
            messages: normalized,
            title: nextTitle,
            mode
          })
        )
        targetChat = targetChat
          ? { ...targetChat, messages: normalized, title: nextTitle, mode, updatedAt: Date.now() }
          : targetChat
      }

      if (!targetChat) {
        const created = createStandaloneChat(workspace.activeProjectId, mode)
        targetChatId = created.id
        targetChat = {
          ...created,
          messages: priorMessages,
          title: nextTitle,
          mode,
          updatedAt: Date.now()
        }
        setWorkspace((current) => ({
          ...current,
          activeChatId: created.id,
          chats: [targetChat!, ...current.chats]
        }))
      } else {
        commitMessages(priorMessages)
      }

      setMessage('')
      setAttachments([])
      composerUserEditedRef.current = false
      voiceMayFillComposerRef.current = false
      if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED) {
        voice.clearTranscript()
        voice.markIdle()
      }

      const osBoundary = standaloneOsBoundaryReply(trimmed || messageBody)
      if (osBoundary && !options?.retry) {
        const boundaryMessage: StandaloneChatMessage = {
          id: `a-boundary-${Date.now()}`,
          role: 'assistant',
          content: osBoundary,
          status: 'complete',
          createdAt: Date.now(),
          sources: [
            {
              label: 'IndiCare OS boundary',
              type: 'safety_boundary',
              basis: 'Child or live record context requires permissioned OS ORB.'
            }
          ]
        }
        persistChat(targetChatId!, {
          messages: dedupeOrbMessages(replaceMessageById(priorMessages, thinkingMessageId, boundaryMessage))
        })
        setLastSendStatus('success')
        setPending(false)
        sendInFlightRef.current = false
        return
      }

      const historyForRequest = trimConversationHistory(
        dedupeOrbMessages(priorMessages.filter((entry) => entry.status !== 'thinking' && entry.status !== 'error'))
      )
      const sessionConversationId = targetChat!.conversationId
      const styleLabel = ANSWER_STYLE_LABELS[voiceSettings.answerStyle]
      const framedMessage =
        voiceSettings.answerStyle !== 'balanced' ? `${messageBody}\n\nAnswer style: ${styleLabel}.` : messageBody

      try {
        if (options?.retry) {
          await refreshSession()
        }
        const response = await queryStandaloneOrbConversation({
          message: framedMessage,
          mode,
          conversation_id: sessionConversationId,
          history: historyForRequest.slice(0, -1),
          detail: voiceSettings.answerStyle,
          images: imagePayload.length ? imagePayload : undefined,
          document_text: pendingDocument?.text,
          document_source_id: pendingDocument?.sourceId || undefined,
          document_title: pendingDocument?.title
        })

        const newConversationId = response.conversation_id || sessionConversationId
        const answer = (response.answer || '').trim() || STANDALONE_ORB_EMPTY_ANSWER_MESSAGE
        if (response.image_understanding_available === false) {
          setImageUnderstandingNote(
            'Image understanding is not available in this environment. ORB answered using your text only.'
          )
        }
        const assistantId = `a-${Date.now()}`
        const responseSources = (
          (response.citations?.length ? response.citations : response.sources) ?? []
        ) as StandaloneOrbSource[]
        const modelRouting = response.context_used?.model_routing
        const agentRaw = response.context_used?.agent as StandaloneOrbAgentSuggestion | undefined
        const docAnalysisRaw = response.context_used?.document_analysis as
          | { suggested?: boolean; needs_document?: boolean; open_documents_panel?: boolean }
          | undefined
        const agentSuggestion =
          agentRaw?.suggested && !agentRaw?.auto_run ? agentRaw : undefined
        const documentSuggestion =
          docAnalysisRaw?.suggested && docAnalysisRaw?.needs_document ? docAnalysisRaw : undefined
        const assistantMessage: StandaloneChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: answer,
          status: 'complete',
          createdAt: Date.now(),
          sources: responseSources.length ? responseSources : undefined,
          modelRouting: modelRouting ?? undefined,
          agentSuggestion,
          documentSuggestion
        }
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === targetChatId)
          if (!chat) return current
          const withAssistant = replaceMessageById(chat.messages, thinkingMessageId, assistantMessage)
          return patchActiveChat(current, chat.id, {
            messages: withAssistant,
            conversationId: newConversationId
          })
        })
        setLastSendStatus('success')
        setError(null)
        setRetryPayload(null)

        if (
          STANDALONE_ORB_VOICE_CAPTURE_ENABLED &&
          voiceSettings.voiceReplies &&
          voice.synthesisAvailable
        ) {
          setSpeakingMessageId(assistantId)
          voice.speak(answer, () => setSpeakingMessageId(null))
        }
      } catch (caught) {
        const parsed = parseStandaloneOrbSendError(caught)
        if (parsed.csrfFailed) {
          void refreshSession()
        }
        setError(parsed.message)
        setLastSendStatus('error')
        setRetryPayload({ text: trimmed || messageBody, chatId: targetChatId! })
        const errorMessage = createErrorPlaceholder(`a-error-${Date.now()}`, parsed.message)
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === targetChatId)
          if (!chat) return current
          const withError = chat.messages.some((entry) => entry.id === thinkingMessageId)
            ? replaceMessageById(chat.messages, thinkingMessageId, errorMessage)
            : dedupeOrbMessages([...chat.messages, errorMessage])
          return patchActiveChat(current, chat.id, { messages: withError })
        })
      } finally {
        setPending(false)
        sendInFlightRef.current = false
      }
    },
    [
      attachments,
      attachedProfiles,
      mode,
      csrfReady,
      pending,
      refreshSession,
      voice,
      voiceSettings.answerStyle,
      voiceSettings.voiceReplies,
      workspace.activeChatId,
      workspace.activeProjectId,
      workspace.chats
    ]
  )

  const handleComposerSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void }) => {
      event?.preventDefault?.()
      if (submitGuardRef.current || pending || sendInFlightRef.current) return
      if (!csrfReady) {
        setError(STANDALONE_ORB_CSRF_REFRESH_MESSAGE)
        void refreshSession()
        return
      }

      let formText = ''
      if (event && 'currentTarget' in event && event.currentTarget) {
        formText = String(new FormData(event.currentTarget).get('message') || '')
      }
      const domText = inputRef.current?.value ?? ''
      const finalText = (formText || message || domText).trim()
      if (!finalText && attachments.length === 0) {
        setError('Type a message to send.')
        return
      }

      submitGuardRef.current = true
      void sendMessage(finalText).finally(() => {
        submitGuardRef.current = false
      })
    },
    [attachments.length, csrfReady, message, pending, refreshSession, sendMessage]
  )

  /** Mic is text-first on /orb; barge-in voice controls ship in the future ORB Voice surface. */
  function handleMicClick() {
    if (!STANDALONE_ORB_VOICE_CAPTURE_ENABLED) {
      setMicNotice(VOICE_MODE_COMING_SOON)
      window.setTimeout(() => setMicNotice(null), 5000)
      return
    }
    if (voice.speaking) {
      voice.interruptForListen()
      return
    }
    if (voice.listening) {
      voice.stopListening()
      return
    }
    if (!voice.recognitionAvailable) {
      setMicNotice('Voice unavailable in this browser — type instead.')
      window.setTimeout(() => setMicNotice(null), 5000)
      return
    }
    if (!message.trim()) {
      voiceMayFillComposerRef.current = true
      composerUserEditedRef.current = false
    }
    void voice.beginUserVoiceCapture()
  }

  function handleMessageChange(value: string) {
    composerUserEditedRef.current = true
    voiceMayFillComposerRef.current = false
    setMessage(value)
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
    setMessage('')
    setAttachments([])
    composerUserEditedRef.current = false
    voiceMayFillComposerRef.current = false
    setError(null)
    setRetryPayload(null)
    setLastSendStatus('idle')
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
    setMessage('')
    setAttachments([])
    composerUserEditedRef.current = false
    voiceMayFillComposerRef.current = false
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
    setMessage(entry.text)
    if (entry.mode) handleModeChange(entry.mode)
    inputRef.current?.focus()
    setSidebarOpen(false)
  }

  async function handleDraftWording(text: string) {
    await copyToClipboard(text)
    setDraftNotice('Copied as draft wording. Review before using in records.')
    setTimeout(() => setDraftNotice(null), 5000)
  }

  async function saveChatNote(entry: StandaloneChatMessage) {
    try {
      await createOrbSavedOutput({
        title: titleFromFirstMessage(entry.content) || 'ORB chat note',
        type: 'intelligence_note',
        project_id: workspace.activeProjectId,
        project_name: activeProject?.name,
        summary: entry.content.slice(0, 800),
        content_markdown: entry.content,
        intelligence_output: {
          title: titleFromFirstMessage(entry.content) || 'ORB chat note',
          summary: entry.content.slice(0, 2000),
          type: 'answer',
          standalone_only: true,
          os_linked: false,
          care_record_access: false
        },
        sources: entry.sources,
        created_from: 'chat',
        created_from_id: entry.id
      })
      setDraftNotice('Saved output — standalone ORB artefact (not an OS record).')
      const summary = await fetchOrbSavedOutputsSummary()
      setSavedOutputsCount(summary.total || 0)
    } catch {
      await copyToClipboard(entry.content)
      setDraftNotice('Could not save to server — copied to clipboard instead.')
    }
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
      value={message}
      composerStateLength={message.trim().length}
      pending={pending}
      lastSendStatus={lastSendStatus}
      mode={mode}
      attachments={attachments}
      voiceListening={voice.listening}
      voiceSpeaking={voice.speaking}
      voiceRecognitionAvailable={voice.recognitionAvailable}
      voiceCaptureEnabled={STANDALONE_ORB_VOICE_CAPTURE_ENABLED}
      voiceStatusText={voiceStatusLine({
        voice,
        pending,
        micNotice,
        voiceCaptureEnabled: STANDALONE_ORB_VOICE_CAPTURE_ENABLED
      })}
      transcriptReady={STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voice.phase === 'transcript_ready'}
      displayTranscript={voice.displayTranscript}
      autoSend={STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voiceSettings.autoSend}
      onChange={handleMessageChange}
      onSubmit={handleComposerSubmit}
      onMicClick={handleMicClick}
      onCancelListening={voice.cancelListening}
      onStopSpeaking={voice.cancelSpeaking}
      onSendTranscript={() => void sendMessage(voice.transcript || voice.displayTranscript)}
      onRetryTranscript={() => {
        voice.clearTranscript()
        if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED) voice.startListening()
      }}
      onAddFiles={(files) => void addImageFiles(files)}
      onRemoveAttachment={(id) => setAttachments((current) => current.filter((a) => a.id !== id))}
      onPaste={handlePaste}
      onDrop={handleDrop}
      inputRef={inputRef}
      documentAttached={Boolean(pendingDocument?.text)}
      documentTitle={pendingDocument?.title}
      onAttachDocumentClick={() => openDocumentsPanel()}
      onAnalyseDocument={() => {
        openDocumentsPanel()
        setMessage((current) => current || 'Analyse this document')
      }}
      onDocumentActionPlan={() => {
        openDocumentsPanel()
        setMessage('Create an action plan from this document')
      }}
      onSummariseDocument={() => {
        openDocumentsPanel()
        setMessage('Summarise the uploaded document')
      }}
      onAddDocumentToLibrary={() => openKnowledgeLibrary()}
    />
  )

  function openVoiceSettings() {
    setMicNotice(VOICE_MODE_COMING_SOON)
    window.setTimeout(() => setMicNotice(null), 5000)
    openSettingsPanel()
    setSidebarOpen(false)
  }

  const layoutA11yClass = standaloneOrbAccessibilityClassNames(a11yPrefs)

  return (
    <main
      className={`orb-chat-layout relative flex flex-col overflow-hidden bg-[#05070d] text-white ${layoutA11yClass}`}
      data-orb-active-panel={activePanel || 'none'}
      data-orb-close-all-panels
      data-orb-text-first-chat="true"
    >
      <span className="sr-only">ORB Care Companion — standalone residential care assistant</span>
      <div className="pointer-events-none fixed inset-0 orb-cinematic-light-field opacity-50" aria-hidden />

      <OrbKnowledgeLibraryPanel open={activePanel === 'knowledge'} onClose={closePanel} />
      <OrbSavedOutputsPanel
        open={activePanel === 'saved_outputs'}
        onClose={closePanel}
        workspace={workspace}
        onReuseInChat={(prompt) => {
          setMessage(prompt)
          closePanel()
        }}
      />
      <OrbDocumentPanel
        open={activePanel === 'documents'}
        onClose={closePanel}
        projects={workspace.projects}
        activeProjectId={workspace.activeProjectId}
        activeProjectName={activeProject?.name}
        onReuseInChat={(prompt) => {
          setMessage(prompt)
          closePanel()
        }}
        onInsertIntoChat={(text) => {
          setMessage(text)
          closePanel()
        }}
        onOpenSavedOutputs={openSavedOutputsPanel}
        onDocumentContext={(ctx) => setPendingDocument(ctx)}
        onRunDeepResearch={(ctx) => {
          setPendingDocument(ctx)
          setAgentPanelType('deep_research')
          setAgentPanelPrompt(
            `Deep research on this document: ${ctx.title}. What does guidance say and what should we do next?`
          )
          openAgentsPanel()
        }}
        onRunDocumentAnalysisAgent={(ctx) => {
          setPendingDocument(ctx)
          setAgentPanelType('document_analysis')
          setAgentPanelPrompt(`Analyse this document and create a manager briefing: ${ctx.title}`)
          openAgentsPanel()
        }}
      />
      <OrbStandaloneSettingsPanel
        open={activePanel === 'settings'}
        onClose={closePanel}
        onOpenMemory={openMemoryPanel}
        onOpenAccessibility={openAccessibilityPanel}
        onOpenPermissions={openPermissionsPanel}
        onOpenVoiceSettings={openVoiceSettings}
        onOpenIntelligenceMap={openIntelligenceMap}
      />
      <OrbToolsPanel
        open={activePanel === 'tools'}
        onClose={closePanel}
        onOpenKnowledge={openKnowledgeLibrary}
        onOpenDocuments={openDocumentsPanel}
        onOpenAgents={openAgentsPanel}
        onOpenSavedOutputs={openSavedOutputsPanel}
        onOpenMemory={openMemoryPanel}
        onOpenIntelligenceMap={openIntelligenceMap}
        onOpenAccessibility={openAccessibilityPanel}
        onOpenPermissions={openPermissionsPanel}
        onRunDeepResearch={() => {
          setAgentPanelType('deep_research')
          setAgentPanelPrompt('Run deep research on this topic')
          openAgentsPanel()
        }}
        onAskOrb={() => {
          closePanel()
          inputRef.current?.focus()
        }}
      />
      <OrbMemoryPanel
        open={activePanel === 'memory'}
        onClose={closePanel}
        workspace={workspace}
        savedOutputsCount={savedOutputsCount}
        onWorkspaceCleared={() => setWorkspace(readStandaloneWorkspace())}
      />
      <OrbStandaloneAccessibilityPanel open={activePanel === 'accessibility'} onClose={closePanel} onChange={setA11yPrefs} />
      <OrbPermissionsPanel
        open={activePanel === 'permissions'}
        onClose={closePanel}
        voiceInputAvailable={voice.recognitionAvailable}
        voiceOutputAvailable={voice.synthesisAvailable}
      />
      <OrbIntelligenceMapPanel open={activePanel === 'intelligence_map'} onClose={closePanel} />
      <OrbAgentPanel
        open={activePanel === 'agents'}
        onClose={() => {
          closePanel()
          setAgentPanelPrompt('')
          setAgentPanelType(undefined)
        }}
        initialAgentType={agentPanelType}
        initialPrompt={agentPanelPrompt}
        initialDocumentText={pendingDocument?.text}
        initialDocumentSourceId={pendingDocument?.sourceId}
        initialDocumentTitle={pendingDocument?.title}
        projects={workspace.projects}
        activeProjectId={workspace.activeProjectId}
        activeProjectName={activeProject?.name}
        onOpenSavedOutputs={openSavedOutputsPanel}
        onReuseInChat={(prompt) => {
          setMessage(prompt)
          closePanel()
        }}
      />

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
            onChatSearchChange={setChatSearch}
            onSelectChat={selectChat}
            onNewChat={startNewChat}
            onSelectProject={(projectId) => setWorkspace((c) => ({ ...c, activeProjectId: projectId }))}
            onWorkspaceChange={setWorkspace}
            onOpenSettings={() => {
              openSettingsPanel()
              setSidebarOpen(false)
            }}
            onOpenSavedOutputs={() => {
              openSavedOutputsPanel()
              setSidebarOpen(false)
            }}
            onOpenTools={() => {
              openToolsPanel()
              setSidebarOpen(false)
            }}
            savedOutputsCount={savedOutputsCount}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <div className="orb-chat-main flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="orb-chat-header flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#05070d]/80 px-3 py-2.5 backdrop-blur-md md:px-5">
            <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-white md:text-base" data-orb-header-title>
                {activeChat?.title || 'ORB'}
              </h1>
              <p className="truncate text-xs text-slate-500" data-orb-header-subtitle>
                Standalone residential care assistant · Powered by IndiCare
              </p>
            </div>
            <span
              className="hidden shrink-0 rounded-full bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-emerald-200/75 sm:inline"
              data-orb-header-privacy
            >
              No OS records accessed
            </span>
            <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                onClick={openToolsPanel}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-white/[0.06] hover:text-cyan-200"
                aria-label="IndiCare Tools"
                data-orb-header-tools
              >
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Tools</span>
              </button>
              <button
                type="button"
                onClick={openSettingsPanel}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
                aria-label="Settings"
                data-orb-header-settings
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
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

          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] px-3 py-2 md:px-5">
            <button
              type="button"
              className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-white/[0.08] md:hidden"
              onClick={() => setModesBarOpen((open) => !open)}
              aria-expanded={modesBarOpen}
            >
              Modes
            </button>
            <div
              className={`orb-mode-chips orb-mode-chips--quiet flex min-w-0 flex-1 gap-1.5 overflow-x-auto ${
                modesBarOpen ? '' : 'max-md:hidden'
              }`}
              role="tablist"
              aria-label="ORB mode"
              data-orb-mode-chips
            >
              {modes.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => handleModeChange(item as StandaloneOrbMode)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    mode === item
                      ? 'bg-white text-slate-950'
                      : 'bg-white/[0.04] text-slate-500 ring-1 ring-white/[0.06] hover:text-slate-300'
                  }`}
                >
                  {modeChipLabel(item)}
                </button>
              ))}
            </div>
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
                  <div
                    className="flex min-h-[min(60vh,28rem)] flex-col items-center justify-center py-6 text-center md:py-8"
                    data-orb-empty-state
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/80" data-orb-brand-name>
                      ORB
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500" data-orb-brand-powered>
                      Powered by IndiCare
                    </p>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-white md:text-2xl" data-orb-empty-heading>
                      How can I help?
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-slate-500" data-orb-empty-subline>
                      Text-first assistant for residential children&apos;s homes. No OS records accessed.
                    </p>
                    <div className="mt-6 grid w-full max-w-xl gap-2.5 sm:grid-cols-2" data-orb-starter-cards>
                      {PRIMARY_EMPTY_STARTERS.map((starter) => (
                        <button
                          key={starter.text}
                          type="button"
                          onClick={() => applyPrompt(starter)}
                          className="orb-starter-card rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-left text-sm font-medium text-slate-200 hover:border-white/12 hover:bg-white/[0.06]"
                          data-orb-starter-card
                        >
                          {starter.text}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromptDrawerOpen(true)}
                      className="mt-4 text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
                      data-orb-more-examples
                    >
                      More examples
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
                          entry.status === 'thinking' ? (
                            <article
                              className="orb-message-assistant"
                              data-testid="orb-message-thinking"
                              aria-live="polite"
                            >
                              <p className="mb-2 text-xs font-medium text-slate-500">ORB</p>
                              <p className="text-sm text-slate-400">{entry.thinkingLabel || ORB_THINKING_LABEL}</p>
                            </article>
                          ) : entry.status === 'error' ? (
                            <article
                              className="orb-message-assistant rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3"
                              data-testid="orb-message-error"
                              role="alert"
                            >
                              <p className="mb-2 text-xs font-medium text-amber-100/90">ORB</p>
                              <p className="text-sm text-amber-50">{entry.content}</p>
                              {retryPayload && index === visibleMessages.length - 1 ? (
                                <button
                                  type="button"
                                  data-testid="orb-message-retry"
                                  onClick={() =>
                                    void sendMessage(retryPayload.text, {
                                      retry: true,
                                      chatId: retryPayload.chatId
                                    })
                                  }
                                  disabled={pending}
                                  className="mt-3 inline-flex h-9 items-center rounded-full border border-amber-200/40 px-4 text-xs font-semibold text-amber-50 hover:bg-amber-400/15 disabled:opacity-40"
                                >
                                  Retry
                                </button>
                              ) : null}
                            </article>
                          ) : (
                          <article className="orb-message-assistant group" data-testid="orb-message-assistant">
                            <p className="mb-2 text-xs font-medium text-slate-500">ORB</p>
                            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">{entry.content}</div>
                            <SourcesBasis sources={entry.sources} modelRouting={entry.modelRouting} />
                            {entry.documentSuggestion?.needs_document ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    openDocumentsPanel()
                                    setSidebarOpen(false)
                                  }}
                                  className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-200 ring-1 ring-violet-400/25"
                                >
                                  Open Documents
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAgentPanelType('document_analysis')
                                    setAgentPanelPrompt(message || entry.content.slice(0, 200))
                                    openAgentsPanel()
                                  }}
                                  className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-200 ring-1 ring-cyan-400/25"
                                >
                                  Run Document Analysis
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAgentPanelType('deep_research')
                                    setAgentPanelPrompt(message || entry.content.slice(0, 200))
                                    openAgentsPanel()
                                  }}
                                  className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10"
                                >
                                  Run Deep Research
                                </button>
                              </div>
                            ) : null}
                            {entry.agentSuggestion?.suggested && entry.agentSuggestion.agent_type ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const type = entry.agentSuggestion?.agent_type
                                    setAgentPanelType(type)
                                    setAgentPanelPrompt(message || entry.content.slice(0, 200))
                                    openAgentsPanel()
                                  }}
                                  className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-200 ring-1 ring-cyan-400/25 hover:bg-cyan-500/25"
                                >
                                  Run{' '}
                                  {entry.agentSuggestion.agent_type === 'deep_research'
                                    ? 'Deep Research'
                                    : `${String(entry.agentSuggestion.agent_type).replace(/_/g, ' ')} agent`}
                                </button>
                              </div>
                            ) : null}
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
                                  setMessage('')
                                  inputRef.current?.focus()
                                }}
                                onDraft={() => void handleDraftWording(entry.content)}
                                onSave={
                                  entry.content.trim().length > 300
                                    ? () => void saveChatNote(entry)
                                    : undefined
                                }
                              />
                            ) : (
                              <div className="mt-2 flex flex-wrap gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                <ActionChip icon={<Copy className="h-3 w-3" />} label="Copy" onClick={() => void copyToClipboard(entry.content)} />
                              </div>
                            )}
                          </article>
                          )
                        ) : (
                          <MessageBubble entry={entry} />
                        )}
                      </div>
                    ))}
                    {error && !visibleMessages.some((entry) => entry.status === 'error') ? (
                      <div
                        className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
                        role="alert"
                        data-testid="orb-send-error"
                      >
                        <p>{error}</p>
                        {retryPayload ? (
                          <button
                            type="button"
                            data-testid="orb-message-retry"
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

            {composer}
          </section>
        </div>
      </div>

      {promptDrawerOpen ? (
        <OrbPromptDrawer
          groups={SUGGESTED_PROMPT_GROUPS}
          moreStarters={MORE_EMPTY_STARTERS}
          moreExpanded={moreExamplesExpanded}
          onToggleMore={() => setMoreExamplesExpanded((o) => !o)}
          onApply={(entry) => {
            applyPrompt(entry)
            setPromptDrawerOpen(false)
          }}
          onClose={() => setPromptDrawerOpen(false)}
        />
      ) : null}
    </main>
  )
}

function OrbPromptDrawer({
  groups,
  moreStarters,
  moreExpanded,
  onToggleMore,
  onApply,
  onClose
}: {
  groups: Array<{ title: string; prompts: PromptEntry[] }>
  moreStarters: PromptEntry[]
  moreExpanded: boolean
  onToggleMore: () => void
  onApply: (entry: PromptEntry) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[68] flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-label="Example prompts">
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1117] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Example prompts</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">{group.title}</p>
            <ul className="space-y-1">
              {group.prompts.map((prompt) => (
                <li key={prompt.text}>
                  <button
                    type="button"
                    onClick={() => onApply(prompt)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/[0.04]"
                  >
                    {prompt.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {moreExpanded ? (
          <ul className="mb-3 space-y-1">
            {moreStarters.map((prompt) => (
              <li key={prompt.text}>
                <button
                  type="button"
                  onClick={() => onApply(prompt)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/[0.04]"
                >
                  {prompt.text}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" onClick={onToggleMore} className="text-xs text-slate-500 hover:text-slate-300">
          {moreExpanded ? 'Fewer examples' : 'More examples'}
        </button>
      </div>
    </div>
  )
}

function modelRouteSummary(modelRouting?: import('@/lib/orb/standalone-client').StandaloneOrbModelRouting) {
  if (!modelRouting?.task_type) return null
  const quality = modelRouting.quality_tier || 'balanced'
  const task = modelRouting.task_type.replace(/_/g, ' ')
  const retrieval =
    modelRouting.requires_rag || modelRouting.requires_citations
      ? ' with built-in ORB knowledge retrieval'
      : ''
  const fallback = modelRouting.fallback_used ? ' (fallback route used)' : ''
  return `Answered using a ${quality} model route for ${task}${retrieval}.${fallback}`
}

function SourcesBasis({
  sources,
  modelRouting
}: {
  sources?: StandaloneOrbSource[]
  modelRouting?: import('@/lib/orb/standalone-client').StandaloneOrbModelRouting
}) {
  const [open, setOpen] = useState(false)
  const routeSummary = modelRouteSummary(modelRouting)
  if (!sources?.length && !routeSummary) return null
  const hasDocumentChunks = (sources ?? []).some(
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
      {!open && routeSummary ? (
        <p className="mt-1 text-[10px] text-slate-600">{routeSummary}</p>
      ) : null}
      {open ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {routeSummary ? (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] text-slate-500">
              <p className="font-medium text-slate-400">Model route</p>
              <p className="mt-0.5 text-slate-500">{routeSummary}</p>
              {modelRouting?.cost_tier ? (
                <p className="mt-1 text-[9px] text-slate-600">
                  Cost tier: {modelRouting.cost_tier.replace(/_/g, ' ')}
                  {modelRouting.fallback_used ? ' · Fallback used' : ''}
                </p>
              ) : null}
            </div>
          ) : null}
          {hasDocumentChunks ? (
            <p className="text-[10px] font-medium text-cyan-200/80">Retrieved from ORB Knowledge Library</p>
          ) : null}
          {sources?.map((source, index) => {
            const extended = source as StandaloneOrbSource & {
              document_chunk?: boolean
              section?: string
              page?: string
              origin?: string
              official_source?: boolean
              confidence_level?: string
              governance_status?: string
              warning?: string
              retrieval_strategy?: string
            }
            const isDocument =
              extended.document_chunk || String(extended.type || '').startsWith('document_chunk:')
            const typeLabel = String(extended.type || '')
              .replace(/^document_chunk:/, '')
              .replace(/_/g, ' ')
            const originLabel = extended.official_source
              ? 'Official summary'
              : extended.origin === 'seeded' || extended.origin === 'built_in'
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
                {extended.retrieval_strategy ? (
                  <p className="mt-0.5 text-[9px] text-slate-600">
                    Retrieval:{' '}
                    {extended.retrieval_strategy === 'hybrid_semantic_keyword'
                      ? 'Hybrid semantic + keyword'
                      : extended.retrieval_strategy === 'keyword_plus_synonyms'
                        ? 'Keyword + synonyms'
                        : extended.retrieval_strategy === 'keyword_only'
                          ? 'Keyword only'
                          : extended.retrieval_strategy.replace(/_/g, ' ')}
                  </p>
                ) : null}
                {extended.warning ? (
                  <p className="mt-0.5 text-[9px] text-amber-200/90">{extended.warning}</p>
                ) : null}
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
    <article
      className="orb-message-user rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/[0.06]"
      data-testid="orb-message-user"
    >
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
  onDraft,
  onSave
}: {
  content: string
  speaking: boolean
  synthesisAvailable: boolean
  onSpeak: () => void
  onStop: () => void
  onNewQuestion: () => void
  onDraft: () => void
  onSave?: () => void
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1 border-t border-white/[0.04] pt-3">
      <ActionChip icon={<Copy className="h-3 w-3" />} label="Copy" onClick={() => void copyToClipboard(content)} />
      {onSave ? (
        <ActionChip icon={<FileText className="h-3 w-3" />} label="Save output" onClick={onSave} />
      ) : null}
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
