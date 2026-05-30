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
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Copy,
  FileText,
  Menu,
  Pencil,
  RotateCcw,
  Square,
  User,
  Volume2,
  X
} from 'lucide-react'
import {
  OrbStandaloneComposer,
  type PendingImageAttachment
} from '@/components/orb-standalone/orb-standalone-composer'
import {
  OrbAskAboutThisChips,
  OrbAssistantMessageBody,
  OrbDocumentContextChips,
  OrbResponseActionBar,
  OrbSuggestedReplyChips,
  OrbUserSpeakerAvatar,
  contextualSuggestedReplies,
  contextualSuggestedRepliesForOutput,
  type OrbAttachmentFollowUpAction,
  type OrbResponseFollowUpAction,
  type OrbSuggestedReplyItem
} from '@/components/orb-standalone/orb-assistant-message'
import { OrbMessageFeedback } from '@/components/orb-standalone/orb-message-feedback'
import { OrbScrollToBottomFab } from '@/components/orb-standalone/orb-scroll-to-bottom-fab'
import { OrbAgentPanel } from '@/components/orb-standalone/orb-agent-panel'
import { OrbResidentialAgentsPanel } from '@/components/orb-standalone/orb-residential-agents-panel'
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
import { OrbAmbientCognition, type OrbCognitionAmbientState } from '@/components/orb-standalone/orb-ambient-cognition'
import { OrbAdultProfileDrawer } from '@/components/orb-standalone/orb-adult-profile-drawer'
import { OrbStandaloneSidebar } from '@/components/orb-standalone/orb-standalone-sidebar'
import { OrbHueMark } from '@/components/orb-standalone/orb-hue-logo'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { ORB_LIGHT_UI_BUILD } from '@/lib/orb/orb-light-ui-build'
import {
  buildAdultProfilePromptBlock,
  normalizeAdultProfileRole,
  personalisedEmptyHeading,
  personalisedWelcomeMessage,
  readAdultProfile,
  roleBasedEmptyStarters,
  type AdultProfile
} from '@/lib/orb/adult-profile-store'
import {
  STANDALONE_ORB_SIGN_IN_PATH,
  STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER,
  isStandaloneOrbSignInPromptMessage,
  tryStandaloneGuestLocalAnswer
} from '@/lib/orb/standalone-guest-response'
import { profileInitialsFromName } from '@/lib/orb/orb-profile-initials'
import { OrbHelpPanel } from '@/components/orb-standalone/orb-help-panel'
import { OrbVoiceSettingsPanel } from '@/components/orb-standalone/orb-voice-settings-panel'
import {
  agentForMode,
  atmosphereClassForMode,
  type ResidentialAgentDefinition
} from '@/lib/orb/residential-agents'
import { streamTextIntoView } from '@/lib/orb/streaming-text'
import {
  defaultStandaloneOrbAccessibility,
  loadStandaloneOrbAccessibility,
  saveStandaloneOrbAccessibility,
  standaloneOrbAccessibilityClassNames,
  type StandaloneOrbAccessibilityPreferences
} from '@/lib/orb/standalone-accessibility'
import { useAuth } from '@/contexts/auth-context'
import { useMounted } from '@/hooks/use-mounted'
import { getCsrfToken, STANDALONE_ORB_CSRF_REFRESH_MESSAGE } from '@/lib/auth/api'
import { standaloneOsBoundaryReply } from '@/lib/orb/standalone-os-boundary'
import { useStandaloneOrbVoice, type StandaloneOrbAnswerStyle } from '@/components/orb-standalone/use-standalone-orb-voice'
import { generateOrbChatTitle } from '@/lib/orb/orb-chat-title'
import {
  URGENT_SAFEGUARDING_BANNER_COPY,
  safeguardingBannerTextFromMessages
} from '@/lib/orb/orb-safety-banner'
import {
  isOrbScrollNearBottom,
  orbScrollBehaviorForReducedMotion,
  scrollOrbToBottom,
  shouldShowOrbScrollFab
} from '@/lib/orb/orb-scroll'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import { stripMarkdownForSpeech } from '@/lib/orb/orb-speech-text'
import { loadOrbStandaloneChatSettings } from '@/lib/orb/orb-standalone-settings'
import {
  buildProfileContextBlock,
  clearStandaloneCustomProjects,
  clearStandaloneLocalState,
  clearStandaloneProfiles,
  createStandaloneChat,
  dedupeOrbMessages,
  ensureStandaloneMessage,
  defaultWorkspace,
  exportStandaloneWorkspaceJson,
  readStandaloneWorkspace,
  repairOrbWorkspace,
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
  isStandaloneOrbRetryableNetworkError,
  parseStandaloneOrbSendError,
  logOrbCognitionDebug,
  logOrbTiming,
  queryStandaloneOrbConversation,
  runOrbDocumentIntelligence,
  runStandaloneOrbAction,
  sendStandaloneOrbMessageStream,
  type OrbDocumentLens,
  STANDALONE_ORB_EMPTY_ANSWER_MESSAGE,
  STANDALONE_ORB_MODES,
  type StandaloneOrbAgentSuggestion,
  type StandaloneOrbConversationResponse,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'
import {
  BACKEND_ORB_STANDALONE_ACTION_IDS,
  backendOrbActionIdForFollowUp,
  isBackendSupportedOrbResponseAction
} from '@/lib/orb/orb-response-actions'
import { collectCognitionDisplayLabels } from '@/lib/orb/residential-agents'
import {
  contextualDocumentActions,
  documentIntelligenceDisplayTitle,
  formatDocumentIntelligenceMarkdown
} from '@/lib/orb/document-intelligence'

/** Push-to-talk voice with reflective pacing — no passive listening. */
const STANDALONE_ORB_VOICE_CAPTURE_ENABLED = true
const VOICE_MODE_COMING_SOON = 'Allow microphone access to use push-to-talk voice.'

const MODE_SAFETY: Partial<Record<StandaloneOrbMode, string>> = {
  'Safeguarding Thinking':
    'Follow safeguarding procedures and escalate immediate risk. ORB supports thinking; it does not make decisions.',
  'Record This Properly': 'ORB can help with wording, but review before adding to records.',
  'Ofsted Lens': 'Guidance support only. ORB does not make inspection judgements.',
  'Reg 44 / Reg 45 Prep': 'Governance support only — improvement plans and evidence remain provider-led.'
}

const MAX_HISTORY_TURNS = 20
const MAX_IMAGE_ATTACHMENTS = 4
const SUBMIT_GUARD_MS = 1500
const ORB_THINKING_LABEL = 'ORB is thinking…'

type LastSendStatus = 'idle' | 'sending' | 'success' | 'error'

type SendMessageOptions = {
  retry?: boolean
  chatId?: string
  /** Internal one-shot network retry after session refresh. */
  internalRetry?: boolean
  /** Replace conversation from an edited user message onward. */
  editMessageId?: string
}

function buildExplainabilityFromResponse(
  response: StandaloneOrbConversationResponse,
  messageHint?: string
): StandaloneChatMessage['explainability'] {
  const labels = collectCognitionDisplayLabels(
    response.context_used?.explainability,
    {
      context_used: response.context_used,
      cognition_display_labels: response.cognition_display_labels
    },
    messageHint
  )
  const base = response.context_used?.explainability
  return {
    ...base,
    cognition_display_labels: labels.length ? labels : base?.cognition_display_labels,
    depth_topic: base?.depth_topic ?? response.context_used?.depth_topic,
    active_brains: base?.active_brains ?? response.context_used?.active_brains
  }
}

function precedingUserMessageHint(messages: StandaloneChatMessage[], assistantIndex: number): string | undefined {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const entry = messages[index]
    if (entry?.role === 'user' && entry.content.trim()) {
      return entry.content
    }
  }
  return undefined
}

/** Collect prior user turns so Academy/NVQ actions stay anchored to the described incident. */
function gatherActionSourceContext(
  messages: StandaloneChatMessage[],
  assistantIndex: number
): { sourceMessage: string; chatHistory: Array<{ role: string; content: string }> } {
  const endIndex = assistantIndex >= 0 ? assistantIndex : messages.length
  const historySlice = messages.slice(0, endIndex)
  const chatHistory = trimConversationHistory(historySlice)

  const userTurns: string[] = []
  for (let index = historySlice.length - 1; index >= 0 && userTurns.length < 5; index -= 1) {
    const entry = historySlice[index]
    if (entry?.role === 'user' && entry.content.trim()) {
      userTurns.unshift(entry.content.trim())
    }
  }

  const currentQuestion = userTurns[userTurns.length - 1] || ''
  const priorIncident = userTurns.slice(0, -1).join('\n\n')
  let sourceMessage = currentQuestion
  if (priorIncident) {
    sourceMessage = `${priorIncident}\n\n--- Follow-up question ---\n${currentQuestion}`
  }

  return { sourceMessage, chatHistory }
}

function traceOrbSend(event: string, detail?: Record<string, unknown>) {
  if (detail && Object.keys(detail).length > 0) {
    console.info(`[orb-send] ${event}`, detail)
    return
  }
  console.info(`[orb-send] ${event}`)
}

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
    if (
      last.role === 'assistant' &&
      (last.status === 'thinking' ||
        last.status === 'streaming' ||
        last.status === 'error' ||
        last.status === 'stopped')
    ) {
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
  { text: 'Help me think through an allegation safely', mode: 'Safeguarding Thinking' },
  { text: 'Rewrite this professionally', mode: 'Record This Properly' },
  { text: 'What would Ofsted expect?', mode: 'Ofsted Lens' },
  { text: 'Help me reflect after a difficult shift', mode: 'Staff Coach' }
]

const MORE_EMPTY_STARTERS: PromptEntry[] = [
  { text: 'Explore the behaviour meaning', mode: 'Therapeutic Reframe' },
  { text: 'Help me record an incident calmly.', mode: 'Record This Properly' },
  { text: 'Think through a safeguarding concern', mode: 'Safeguarding Thinking' },
  { text: 'What might leadership need to review?', mode: 'Manager Copilot' },
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
      { text: 'Does this need manager review?', mode: 'Safeguarding Thinking' },
      { text: 'Help me think through a safeguarding concern.', mode: 'Safeguarding Thinking' }
    ]
  },
  {
    title: 'Reflective practice',
    prompts: [
      { text: 'Help me reflect after a difficult shift.', mode: 'Staff Coach' },
      { text: 'Help me understand behaviour as communication.', mode: 'Therapeutic Reframe' }
    ]
  }
]

function trimConversationHistory(messages: StandaloneChatMessage[]): Array<{ role: string; content: string }> {
  const pairs = messages.map((entry) => ({ role: entry.role, content: entry.content }))
  if (pairs.length <= MAX_HISTORY_TURNS) return pairs
  return pairs.slice(-MAX_HISTORY_TURNS)
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
  await copyTextToClipboard(text)
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

function OrbSignInCallToAction({ className = '' }: { className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      data-orb-sign-in-cta
      onClick={() => router.push(STANDALONE_ORB_SIGN_IN_PATH)}
      className={`mt-3 inline-flex h-9 items-center rounded-full bg-[var(--orb-accent)] px-4 text-xs font-semibold text-white hover:opacity-95 ${className}`}
    >
      Sign in to ORB
    </button>
  )
}

export function OrbCareCompanion() {
  const { status, user, csrfReady, refreshSession } = useAuth()
  const orbSessionReady = status === 'authenticated' && Boolean(user) && csrfReady
  const mounted = useMounted()
  const { resolvedTheme, appearanceMode, setAppearanceMode } = useOrbAppearance()
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
  const [imageNoteForMessageId, setImageNoteForMessageId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<PendingImageAttachment[]>([])
  const [micNotice, setMicNotice] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<OrbStandalonePanel>(null)
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false)
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
  const [adultProfile, setAdultProfile] = useState<AdultProfile | null>(null)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [showScrollFab, setShowScrollFab] = useState(false)
  const [savedOutputMessageIds, setSavedOutputMessageIds] = useState<Set<string>>(() => new Set())
  const [saveFeedbackByMessageId, setSaveFeedbackByMessageId] = useState<
    Record<string, 'idle' | 'saved' | 'already_saved' | 'failed'>
  >({})
  const [chatUiSettings, setChatUiSettings] = useState(() => loadOrbStandaloneChatSettings())

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const composerUserEditedRef = useRef(false)
  const voiceMayFillComposerRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)
  const lastSendHadImagesRef = useRef(false)
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)
  const sendInFlightRef = useRef(false)
  const submitGuardRef = useRef(false)
  const lastSubmitRef = useRef<{ chatId: string; content: string; at: number } | null>(null)
  const sendGenerationRef = useRef(0)
  const requestAbortRef = useRef<AbortController | null>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const streamGenerationRef = useRef(0)
  const streamPartialRef = useRef('')
  const sessionPrimedRef = useRef(false)
  const workspaceHydratedRef = useRef(false)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings } = voice

  const activeProject = useMemo(
    () => workspace.projects.find((p) => p.id === workspace.activeProjectId),
    [workspace.projects, workspace.activeProjectId]
  )

  useEffect(() => {
    if (!orbSessionReady) return
    void fetchOrbSavedOutputsSummary()
      .then((summary) => setSavedOutputsCount(summary.total || 0))
      .catch(() => setSavedOutputsCount(0))
  }, [activePanel, orbSessionReady])

  useEffect(() => {
    setWorkspace(readStandaloneWorkspace())
    setA11yPrefs(loadStandaloneOrbAccessibility())
    setAdultProfile(readAdultProfile())
    workspaceHydratedRef.current = true
  }, [])

  useEffect(() => {
    if (adultProfile?.voicePreference?.prefersSpokenResponses && !voiceSettings.voiceReplies) {
      voice.updateSettings({ voiceReplies: true })
    }
  }, [adultProfile?.voicePreference?.prefersSpokenResponses, voice, voiceSettings.voiceReplies])

  useEffect(() => {
    if (status !== 'authenticated' || !user) return
    if (sessionPrimedRef.current) return
    sessionPrimedRef.current = true
    traceOrbSend('session_prime_start')
    void refreshSession().finally(() => {
      traceOrbSend('session_prime_end', { csrfReady: Boolean(getCsrfToken()) })
    })
  }, [status, user, refreshSession])

  useEffect(() => {
    return () => {
      traceOrbSend('request_abort', { reason: 'component_unmount' })
      requestAbortRef.current?.abort()
      streamAbortRef.current?.abort()
    }
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
    if (!workspaceHydratedRef.current) return
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
    if (!orbSessionReady) return
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
  }, [orbSessionReady])

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

  const streamingTail = useMemo(() => {
    const last = visibleMessages[visibleMessages.length - 1]
    if (last?.status === 'streaming' || last?.status === 'thinking') {
      return `${last.id}:${last.content.length}`
    }
    return ''
  }, [visibleMessages])

  const threadIsStreaming = useMemo(
    () => pending || visibleMessages.some((m) => m.status === 'streaming' || m.status === 'thinking'),
    [pending, visibleMessages]
  )

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const syncFab = () => {
      const nearBottom = isOrbScrollNearBottom(container)
      isNearBottomRef.current = nearBottom
      setShowScrollFab(
        shouldShowOrbScrollFab({
          nearBottom,
          hasMessages: visibleMessages.length > 0,
          isStreaming: threadIsStreaming
        })
      )
    }
    syncFab()
    container.addEventListener('scroll', syncFab, { passive: true })
    return () => container.removeEventListener('scroll', syncFab)
  }, [visibleMessages.length, threadIsStreaming, streamingTail])

  const requestChatScroll = useCallback((force = false) => {
    if (!force && !isNearBottomRef.current) return
    const behavior = orbScrollBehaviorForReducedMotion()
    requestAnimationFrame(() => {
      scrollOrbToBottom(messagesEndRef.current, { behavior, block: 'end' })
      if (force) {
        isNearBottomRef.current = true
        setShowScrollFab(false)
      }
    })
  }, [])

  const speakMessageContent = useCallback(
    (messageId: string, rawContent: string) => {
      if (!voice.synthesisAvailable) return
      if (voice.speaking && speakingMessageId && speakingMessageId !== messageId) {
        voice.cancelSpeaking()
      }
      const speechText = stripMarkdownForSpeech(rawContent)
      if (!speechText) return
      setSpeakingMessageId(messageId)
      voice.speakAloud(speechText, () => setSpeakingMessageId(null))
    },
    [voice, speakingMessageId]
  )

  useEffect(() => {
    requestChatScroll(true)
  }, [visibleMessages.length, pending, requestChatScroll])

  useEffect(() => {
    if (!streamingTail) return
    requestChatScroll(false)
  }, [streamingTail, requestChatScroll])

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

  const showUrgentSafeguardingBanner = Boolean(
    safeguardingBannerTextFromMessages(visibleMessages, mode)
  )

  const cognitionAmbientState = useMemo((): OrbCognitionAmbientState => {
    if (pending) return 'thinking'
    const last = visibleMessages[visibleMessages.length - 1]
    if (last?.status === 'streaming') return 'streaming'
    if (last?.status === 'thinking') return 'analysing'
    if (mode === 'Safeguarding Thinking' || showUrgentSafeguardingBanner) return 'safeguarding'
    if (mode === 'Therapeutic Reframe' || mode === 'Staff Coach') return 'reflecting'
    return 'idle'
  }, [pending, visibleMessages, mode, showUrgentSafeguardingBanner])

  const cognitionStatusLabel = pending
    ? 'Thinking'
    : visibleMessages.some((m) => m.status === 'streaming')
      ? 'Streaming'
      : 'Ready'

  const sendMessage = useCallback(
    async (text: string, options?: SendMessageOptions) => {
      const trimmed = text.trim()
      const hasImages = attachments.length > 0
      if ((!trimmed && !hasImages) || pending || sendInFlightRef.current) {
        traceOrbSend('submit_blocked', { reason: 'empty_or_in_flight', pending, inFlight: sendInFlightRef.current })
        return
      }

      const sendGeneration = ++sendGenerationRef.current
      const isCurrentSend = () => sendGenerationRef.current === sendGeneration

      traceOrbSend('submit', {
        sendGeneration,
        hasText: Boolean(trimmed),
        retry: Boolean(options?.retry),
        internalRetry: Boolean(options?.internalRetry)
      })

      const contentKey = (trimmed || '[Image attachment]').trim().toLowerCase()
      const guardChatId = options?.chatId || workspace.activeChatId || 'new'
      const now = Date.now()
      if (
        !options?.retry &&
        !options?.internalRetry &&
        lastSubmitRef.current &&
        lastSubmitRef.current.content === contentKey &&
        lastSubmitRef.current.chatId === guardChatId &&
        now - lastSubmitRef.current.at < SUBMIT_GUARD_MS
      ) {
        traceOrbSend('submit_blocked', { sendGeneration, reason: 'duplicate_guard' })
        return
      }

      sendInFlightRef.current = true
      if (!options?.retry && !options?.internalRetry) {
        lastSubmitRef.current = { chatId: guardChatId, content: contentKey, at: now }
      }
      if (voice.speaking) voice.cancelSpeaking()

      const imagePayload = attachments.map((a) => ({ data_url: a.dataUrl, name: a.name }))
      lastSendHadImagesRef.current = imagePayload.length > 0
      let targetChatId = options?.chatId || workspace.activeChatId
      let targetChat = targetChatId ? workspace.chats.find((c) => c.id === targetChatId) ?? null : null
      const skipPersonalisation = Boolean(targetChat?.temporary)
      const profileBlock = skipPersonalisation ? '' : buildProfileContextBlock(attachedProfiles)
      const adultBlock =
        skipPersonalisation || !adultProfile ? '' : buildAdultProfilePromptBlock(adultProfile)
      const messageBody = [
        adultBlock,
        profileBlock,
        trimmed || (hasImages ? 'Please look at the image(s) I shared and help me with this.' : '')
      ]
        .filter(Boolean)
        .join('\n\n')

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

      const existingMessages = dedupeOrbMessages(targetChat?.messages ?? [])
      let priorMessages = existingMessages
      if (options?.editMessageId) {
        const editIndex = existingMessages.findIndex((m) => m.id === options.editMessageId)
        if (editIndex >= 0) {
          priorMessages = [
            ...existingMessages.slice(0, editIndex),
            { ...existingMessages[editIndex], content: trimmed || userMessage.content, createdAt: now },
            thinkingMessage
          ]
        } else {
          priorMessages = [...existingMessages, userMessage, thinkingMessage]
        }
      } else if (options?.retry) {
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
      const titleContext = {
        mode,
        documentLens: pendingDocument?.title
          ? pendingDocument.sourceId
            ? 'policy'
            : null
          : null,
        documentTitle: pendingDocument?.title ?? null
      }
      const nextTitle =
        !targetChat || targetChat.title === 'New conversation' || targetChat.title === 'New chat'
          ? generateOrbChatTitle(trimmed || 'Image conversation', titleContext)
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

      setPending(true)
      setLastSendStatus('sending')
      setError(null)
      setRetryPayload(null)
      setImageUnderstandingNote(null)
      setImageNoteForMessageId(null)
      traceOrbSend('pending_state', { sendGeneration, pending: true })

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
        traceOrbSend('pending_state', { sendGeneration, pending: false, reason: 'os_boundary' })
        setPending(false)
        sendInFlightRef.current = false
        return
      }

      if (!orbSessionReady) {
        const guestAnswer =
          imagePayload.length > 0
            ? `${STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER}\n\nSign in to attach images and run document intelligence.`
            : tryStandaloneGuestLocalAnswer(trimmed) ?? STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER
        const assistantMessage: StandaloneChatMessage = {
          id: `a-guest-${Date.now()}`,
          role: 'assistant',
          content: guestAnswer,
          status: 'complete',
          createdAt: Date.now(),
          explainability: { cognition_display_labels: ['ORB'] }
        }
        persistChat(targetChatId!, {
          messages: dedupeOrbMessages(replaceMessageById(priorMessages, thinkingMessageId, assistantMessage))
        })
        setLastSendStatus('success')
        setError(null)
        setRetryPayload(null)
        traceOrbSend('guest_local_response', { sendGeneration, signedIn: false })
        setPending(false)
        sendInFlightRef.current = false
        return
      }

      if (!getCsrfToken()) {
        traceOrbSend('submit_blocked', { sendGeneration, reason: 'csrf_not_ready' })
        void refreshSession()
        setError(STANDALONE_ORB_CSRF_REFRESH_MESSAGE)
        setLastSendStatus('error')
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

      requestAbortRef.current?.abort()
      const requestController = new AbortController()
      requestAbortRef.current = requestController

      const frontendRequestStartedAt = Date.now()

      const conversationRequest = {
        message: framedMessage,
        mode,
        conversation_id: sessionConversationId,
        history: historyForRequest.slice(0, -1),
        detail: voiceSettings.answerStyle,
        images: imagePayload.length ? imagePayload : undefined,
        document_text: pendingDocument?.text,
        document_source_id: pendingDocument?.sourceId || undefined,
        document_title: pendingDocument?.title
      }

      const runConversationRequest = async () =>
        queryStandaloneOrbConversation(conversationRequest, requestController.signal)

      const assistantId = `a-${Date.now()}`
      const streamingMessage: StandaloneChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: Date.now()
      }

      traceOrbSend('placeholder_replace', {
        sendGeneration,
        from: thinkingMessageId,
        to: assistantId,
        status: 'streaming'
      })
      setWorkspace((current) => {
        const chat = current.chats.find((c) => c.id === targetChatId)
        if (!chat) return current
        return patchActiveChat(current, chat.id, {
          messages: replaceMessageById(chat.messages, thinkingMessageId, streamingMessage)
        })
      })

      const streamGeneration = ++streamGenerationRef.current
      streamPartialRef.current = ''
      streamAbortRef.current?.abort()
      const streamController = new AbortController()
      streamAbortRef.current = streamController
      const streamSignal = streamController.signal

      const applyStreamingPartial = (partial: string, extras?: Partial<StandaloneChatMessage>) => {
        if (streamGenerationRef.current !== streamGeneration) return
        streamPartialRef.current = partial
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === targetChatId)
          if (!chat) return current
          const streaming = chat.messages.find((m) => m.id === assistantId)
          if (!streaming) return current
          const updated: StandaloneChatMessage = {
            ...streaming,
            ...extras,
            content: partial,
            status: 'streaming'
          }
          return patchActiveChat(current, chat.id, {
            messages: replaceMessageById(chat.messages, assistantId, updated)
          })
        })
      }

      const finalizeAssistantFromResponse = (
        response: StandaloneOrbConversationResponse,
        options?: { streamErrorNote?: string }
      ) => {
        const newConversationId = response.conversation_id || sessionConversationId
        const answer =
          (response.answer || '').trim() ||
          streamPartialRef.current.trim() ||
          STANDALONE_ORB_EMPTY_ANSWER_MESSAGE
        const displayAnswer = options?.streamErrorNote
          ? `${answer}\n\n*(${options.streamErrorNote})*`
          : answer
        if (lastSendHadImagesRef.current && response.image_understanding_available === false) {
          setImageUnderstandingNote(
            'Image understanding is not available in this environment. ORB answered using your text only.'
          )
          setImageNoteForMessageId(assistantId)
        } else {
          setImageUnderstandingNote(null)
          setImageNoteForMessageId(null)
        }
        lastSendHadImagesRef.current = false
        const responseSources = (
          (response.citations?.length ? response.citations : response.sources) ?? []
        ) as StandaloneOrbSource[]
        const modelRouting = response.context_used?.model_routing
        const explainabilityRaw = buildExplainabilityFromResponse(response, trimmed || messageBody)
        const agentRaw = response.context_used?.agent as StandaloneOrbAgentSuggestion | undefined
        const docAnalysisRaw = response.context_used?.document_analysis as
          | { suggested?: boolean; needs_document?: boolean; open_documents_panel?: boolean }
          | undefined
        const agentSuggestion =
          agentRaw?.suggested && !agentRaw?.auto_run ? agentRaw : undefined
        const documentSuggestion =
          docAnalysisRaw?.suggested && docAnalysisRaw?.needs_document ? docAnalysisRaw : undefined
        const expertMeta = response.context_used?.expert_answer_engine as
          | {
              detected_family?: string
              secondary_families?: string[]
              source_anchors?: string[]
            }
          | undefined
        const assistantMessage: StandaloneChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: displayAnswer,
          status: 'complete',
          createdAt: streamingMessage.createdAt,
          sources: responseSources.length ? responseSources : undefined,
          modelRouting: modelRouting ?? undefined,
          explainability: explainabilityRaw,
          agentSuggestion,
          documentSuggestion,
          feedbackContext: {
            prompt_tier: response.context_used?.prompt_tier ?? modelRouting?.cost_tier,
            detected_family: expertMeta?.detected_family,
            secondary_families: expertMeta?.secondary_families,
            source_anchors: expertMeta?.source_anchors
          }
        }
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === targetChatId)
          if (!chat) return current
          return patchActiveChat(current, chat.id, {
            messages: replaceMessageById(chat.messages, assistantId, assistantMessage),
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
          voice.speak(displayAnswer, () => setSpeakingMessageId(null))
        }
      }

      try {
        traceOrbSend('request_start', { sendGeneration, conversationId: sessionConversationId })
        logOrbTiming('request_start', {
          sendGeneration,
          conversationId: sessionConversationId,
          frontend_request_started_at: frontendRequestStartedAt,
          transport: 'sse'
        })
        if (options?.retry) {
          await refreshSession()
        }

        let response: StandaloneOrbConversationResponse | null = null
        let streamFailedBeforeToken = false

        try {
          response = await sendStandaloneOrbMessageStream(
            conversationRequest,
            {
              onToken: (_delta, partial) => applyStreamingPartial(partial),
              onMetadata: (meta) => {
                const responseSources = (
                  (meta.citations?.length ? meta.citations : meta.sources) ?? []
                ) as StandaloneOrbSource[]
                applyStreamingPartial(streamPartialRef.current, {
                  sources: responseSources.length ? responseSources : undefined,
                  modelRouting: meta.context_used?.model_routing,
                  explainability: buildExplainabilityFromResponse(meta, trimmed || messageBody)
                })
              }
            },
            streamSignal
          )
        } catch (streamTransportError) {
          if (streamTransportError instanceof DOMException && streamTransportError.name === 'AbortError') {
            throw streamTransportError
          }
          const hadPartial = Boolean(streamPartialRef.current.trim())
          if (hadPartial) {
            streamFailedBeforeToken = false
            response = {
              ok: true,
              standalone: true,
              os_records_accessed: false,
              answer: streamPartialRef.current.trim(),
              error_detail: 'stream_interrupted'
            }
          } else {
            streamFailedBeforeToken = true
            traceOrbSend('stream_fallback', { sendGeneration, reason: 'no_tokens' })
            console.warn('[orb-send] streaming unavailable, falling back to POST', streamTransportError)
          }
        }

        if (!response && streamFailedBeforeToken) {
          try {
            response = await runConversationRequest()
          } catch (firstError) {
            if (
              !options?.internalRetry &&
              isStandaloneOrbRetryableNetworkError(firstError)
            ) {
              traceOrbSend('request_retry', { sendGeneration, reason: 'retryable_network' })
              await refreshSession()
              response = await runConversationRequest()
            } else {
              throw firstError
            }
          }
          const fallbackAnswer = (response.answer || '').trim() || STANDALONE_ORB_EMPTY_ANSWER_MESSAGE
          await streamTextIntoView({
            text: fallbackAnswer,
            signal: streamSignal,
            onChunk: (partial) => applyStreamingPartial(partial)
          })
        }

        if (!response) {
          throw new Error('ORB did not return a response.')
        }

        if (!isCurrentSend()) {
          traceOrbSend('request_stale', { sendGeneration })
          return
        }

        if (streamSignal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        traceOrbSend('request_end', { sendGeneration, hasAnswer: Boolean(response.answer) })
        const frontendRequestCompletedAt = Date.now()
        logOrbTiming('request_end', {
          sendGeneration,
          frontend_request_started_at: frontendRequestStartedAt,
          frontend_request_completed_at: frontendRequestCompletedAt,
          frontend_elapsed_ms: frontendRequestCompletedAt - frontendRequestStartedAt,
          ...(response.context_used?.timing ?? {})
        })

        if (!isCurrentSend() || streamGenerationRef.current !== streamGeneration) return

        finalizeAssistantFromResponse(
          response,
          response.error_detail
            ? { streamErrorNote: 'ORB could not finish streaming; partial answer kept.' }
            : undefined
        )
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          traceOrbSend('stream_abort', { sendGeneration, streamGeneration })
          if (!isCurrentSend() || streamGenerationRef.current !== streamGeneration) return
          const partial = streamPartialRef.current.trim()
          const stoppedMessage: StandaloneChatMessage = {
            ...streamingMessage,
            content: partial
              ? `${partial}\n\n*(Stopped — partial answer kept.)*`
              : '*(Stopped before ORB finished responding.)*',
            status: 'stopped'
          }
          setWorkspace((current) => {
            const chat = current.chats.find((c) => c.id === targetChatId)
            if (!chat) return current
            return patchActiveChat(current, chat.id, {
              messages: replaceMessageById(chat.messages, assistantId, stoppedMessage)
            })
          })
          setLastSendStatus('success')
          setError(null)
          return
        }
        if (requestController.signal.aborted || streamSignal.aborted) {
          if (!isCurrentSend()) {
            traceOrbSend('request_abort', { sendGeneration, reason: 'superseded' })
            return
          }
          return
        }
        const parsed = parseStandaloneOrbSendError(caught)
        const signInRequired =
          parsed.status === 401 && (status !== 'authenticated' || isStandaloneOrbSignInPromptMessage(parsed.message))
        const displayMessage = signInRequired ? STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER : parsed.message
        traceOrbSend('request_failed', {
          sendGeneration,
          message: displayMessage,
          status: parsed.status,
          detail: parsed.detail,
          csrfFailed: parsed.csrfFailed
        })
        if (!isCurrentSend()) return
        if (parsed.csrfFailed) {
          void refreshSession()
        }
        setError(displayMessage)
        setLastSendStatus('error')
        setRetryPayload({ text: trimmed || messageBody, chatId: targetChatId! })
        const errorMessage = createErrorPlaceholder(`a-error-${Date.now()}`, displayMessage)
        traceOrbSend('placeholder_replace', {
          sendGeneration,
          from: thinkingMessageId,
          status: 'error'
        })
        setWorkspace((current) => {
          const chat = current.chats.find((c) => c.id === targetChatId)
          if (!chat) return current
          const withError = chat.messages.some((entry) => entry.id === thinkingMessageId)
            ? replaceMessageById(chat.messages, thinkingMessageId, errorMessage)
            : dedupeOrbMessages([...chat.messages, errorMessage])
          return patchActiveChat(current, chat.id, { messages: withError })
        })
      } finally {
        if (isCurrentSend()) {
          setPending(false)
          sendInFlightRef.current = false
          traceOrbSend('pending_state', { sendGeneration, pending: false })
        }
      }
    },
    [
      attachments,
      attachedProfiles,
      adultProfile,
      mode,
      orbSessionReady,
      pending,
      refreshSession,
      status,
      voice,
      voiceSettings.answerStyle,
      voiceSettings.voiceReplies,
      workspace.activeChatId,
      workspace.activeProjectId,
      workspace.chats
    ]
  )

  const handleComposerSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()

      if (submitGuardRef.current || pending || sendInFlightRef.current) {
        traceOrbSend('submit_blocked', { reason: 'composer_guard', pending, inFlight: sendInFlightRef.current })
        return
      }

      const finalText = message.trim()
      const activeAgentForLog = agentForMode(mode)

      traceOrbSend('composer_submit', {
        hasText: Boolean(finalText),
        pending,
        activeAgent: activeAgentForLog?.id ?? null,
        mode
      })

      if (!finalText && attachments.length === 0) {
        setError('Type a message to send.')
        return
      }

      submitGuardRef.current = true

      try {
        await sendMessage(finalText)
      } finally {
        submitGuardRef.current = false
      }
    },
    [
      attachments.length,
      message,
      mode,
      pending,
      sendMessage
    ]
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
      setMicNotice('Voice input is not available in this browser yet.')
      window.setTimeout(() => setMicNotice(null), 5000)
      return
    }
    if (voice.error) {
      setMicNotice(voice.error)
      window.setTimeout(() => setMicNotice(null), 5000)
      return
    }
    if (!message.trim()) {
      voiceMayFillComposerRef.current = true
      composerUserEditedRef.current = false
    }
    void voice.beginUserVoiceCapture().then((started) => {
      if (!started && voice.error) {
        setMicNotice(voice.error)
        window.setTimeout(() => setMicNotice(null), 5000)
      }
    })
  }

  const SLASH_MODE_COMMANDS: Record<string, StandaloneOrbMode> = {
    '/safeguard': 'Safeguarding Thinking',
    '/safeguarding': 'Safeguarding Thinking',
    '/record': 'Record This Properly',
    '/ofsted': 'Ofsted Lens',
    '/therapeutic': 'Therapeutic Reframe',
    '/manager': 'Manager Copilot',
    '/supervision': 'Staff Coach',
    '/reg44': 'Reg 44 / Reg 45 Prep',
    '/reg45': 'Reg 44 / Reg 45 Prep',
    '/shift': 'Ask ORB'
  }

  function handleMessageChange(value: string) {
    composerUserEditedRef.current = true
    voiceMayFillComposerRef.current = false
    const slash = value.trim().toLowerCase()
    if (slash === '/clear') {
      setMessage('')
      return
    }
    if (slash === '/agent') {
      setAgentsPanelOpen(true)
      setMessage('')
      return
    }
    if (slash === '/policy') {
      openKnowledgeLibrary()
      setMessage('')
      return
    }
    if (slash === '/whatamimissing') {
      setMessage('What am I missing in this situation? Help me see gaps in facts, recording, escalation, and follow-up.')
      return
    }
    const modeFromSlash = SLASH_MODE_COMMANDS[slash]
    if (modeFromSlash) {
      handleModeChange(modeFromSlash)
      if (slash === '/shift') {
        setMessage('Help me build a shift handover: priorities, risks, child experience, and what needs manager attention.')
      } else if (slash === '/supervision') {
        setMessage('Help me prepare supervision prompts from what I share next.')
      } else {
        setMessage('')
      }
      return
    }
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

  function selectResidentialAgent(agent: ResidentialAgentDefinition) {
    handleModeChange(agent.mode)
    setMessage('')
    inputRef.current?.focus()
  }

  function startTemporaryChat() {
    if (voice.speaking) voice.cancelSpeaking()
    if (voice.listening) voice.cancelListening()
    voice.pauseVoiceSession()
    const chat = createStandaloneChat(workspace.activeProjectId, 'Ask ORB', { temporary: true })
    setWorkspace((current) => ({
      ...current,
      activeChatId: chat.id,
      chats: [chat, ...current.chats]
    }))
    setMessage('')
    setAttachments([])
    setError(null)
    setSidebarOpen(false)
  }

  function startNewChat(projectId?: string) {
    if (voice.speaking) voice.cancelSpeaking()
    if (voice.listening) voice.cancelListening()
    voice.pauseVoiceSession()
    const chat = createStandaloneChat(projectId || workspace.activeProjectId, 'Ask ORB', {
      temporary: chatUiSettings.defaultTemporaryChat
    })
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
    setImageUnderstandingNote(null)
    setImageNoteForMessageId(null)
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
    setImageUnderstandingNote(null)
    setImageNoteForMessageId(null)
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

  const handleStopGeneration = useCallback(() => {
    if (!pending && !sendInFlightRef.current) return
    traceOrbSend('request_abort', { reason: 'user_stop' })
    requestAbortRef.current?.abort()
    streamAbortRef.current?.abort()
    voice.cancelSpeaking()
    setWorkspace((current) => {
      const chatId = current.activeChatId
      if (!chatId) return current
      const chat = current.chats.find((c) => c.id === chatId)
      if (!chat) return current
      const messages = chat.messages.map((entry) => {
        if (entry.status !== 'thinking' && entry.status !== 'streaming') return entry
        const partial = entry.content.trim()
        return {
          ...entry,
          status: 'stopped' as const,
          content: partial
            ? `${partial}\n\n*(Stopped — partial answer kept.)*`
            : '*(Stopped before ORB finished responding.)*'
        }
      })
      return patchActiveChat(current, chatId, { messages: dedupeOrbMessages(messages) })
    })
    setPending(false)
    sendInFlightRef.current = false
    setLastSendStatus('success')
  }, [pending, voice])

  function handleAttachmentFollowUp(action: OrbAttachmentFollowUpAction) {
    const prompts: Record<OrbAttachmentFollowUpAction, string> = {
      summarise: 'Summarise what you can see in the image(s) I shared. Standalone ORB only — no OS records.',
      safeguarding_lens:
        'Apply a safeguarding lens to the image(s) or document I shared: facts, concerns, gaps, escalation.',
      ofsted_lens: 'Apply an Ofsted / SCCIF lens to what I shared. What evidence would an inspector ask for?',
      recording_quality:
        'Review recording quality for anything I can log from this attachment. Suggest objective wording.',
      action_plan: 'Create a practical action plan from this attachment. Standalone draft only.'
    }
    if (action === 'safeguarding_lens') handleModeChange('Safeguarding Thinking')
    if (action === 'ofsted_lens') handleModeChange('Ofsted Lens')
    if (action === 'recording_quality') handleModeChange('Record This Properly')
    setMessage(prompts[action])
    inputRef.current?.focus()
  }

  function prefillOrbFollowUpComposer(action: OrbResponseFollowUpAction, sourceContent: string) {
    const excerpt = sourceContent.slice(0, 2400)
    const prompts: Record<OrbResponseFollowUpAction, string> = {
      improve_wording: `Improve the professional wording below. Keep facts unchanged; do not invent details.\n\n${excerpt}`,
      more_concise: `Make this more concise for a busy shift. Keep safeguarding and escalation points.\n\n${excerpt}`,
      more_detailed: `Expand this with clearer structure, actions, and follow-up. Still standalone — no OS records.\n\n${excerpt}`,
      recording_wording: `Rewrite as objective, child-centred recording wording I can review before entering a log.\n\n${excerpt}`,
      child_voice: `Add prompts to capture the child's voice and perspective appropriately for this situation.\n\n${excerpt}`,
      manager_oversight: `Draft a manager oversight note: facts, risks, actions, and what I need from the RM.\n\n${excerpt}`,
      chronology: `Suggest chronology entries and sequencing I should record from this (no invented facts).\n\n${excerpt}`,
      shift_builder: `Turn this into shift handover bullets: priorities, risks, child experience, manager attention.\n\n${excerpt}`,
      checklist: `Create a practical checklist for staff follow-up from this.\n\n${excerpt}`,
      what_missing: `What am I missing? Review for facts, concerns, gaps, escalation, recording, and follow-up.\n\n${excerpt}`,
      ofsted_lens: `Apply an Ofsted / SCCIF lens to this. What would an inspector ask? What evidence is thin?\n\n${excerpt}`,
      safeguarding_lens: `Apply a safeguarding lens: facts, concerns, gaps, escalation, and immediate safety.\n\n${excerpt}`,
      nvq_evidence_map: `Map this to possible NVQ/diploma criteria from what I describe only — do not invent practice.\n\n${excerpt}`,
      reflective_learning: `Create a reflective account plan from what I describe only.\n\n${excerpt}`,
      pd_prompts: `Create professional discussion prompts from what I describe only.\n\n${excerpt}`,
      evidence_gaps: `What learning evidence gaps do you see from what I describe?\n\n${excerpt}`,
      learner_action_plan: `Create a learner action plan for missing evidence — authentic collection only.\n\n${excerpt}`,
      supervision_reflect: `Link this supervision material to possible qualification evidence.\n\n${excerpt}`,
      incident_reflective: `Turn this into reflective learning from what I describe — no invented facts.\n\n${excerpt}`,
      explain_criteria: `Explain the criteria mentioned here in plain English for residential childcare.\n\n${excerpt}`,
      assessor_feedback: `Draft assessor feedback (support for judgement only) from what I describe.\n\n${excerpt}`
    }
    if (action === 'ofsted_lens') handleModeChange('Ofsted Lens')
    if (action === 'safeguarding_lens') handleModeChange('Safeguarding Thinking')
    if (action === 'recording_wording') handleModeChange('Record This Properly')
    setMessage(prompts[action])
    inputRef.current?.focus()
  }

  async function runBackendOrbAction(
    backendAction: string,
    sourceContent: string,
    assistantIndex?: number,
    frontendAction?: string
  ) {
    const chatId = workspace.activeChatId
    if (!chatId || pending || sendInFlightRef.current) {
      return false
    }

    const actionContext =
      typeof assistantIndex === 'number'
        ? gatherActionSourceContext(visibleMessages, assistantIndex)
        : gatherActionSourceContext(visibleMessages, visibleMessages.length)

    const sourceMessage = actionContext.sourceMessage || undefined

    const thinkingMessage = ensureStandaloneMessage({
      role: 'assistant',
      content: '',
      status: 'thinking',
      thinkingLabel: 'Running ORB action…'
    })

    setPending(true)
    setWorkspace((current) => {
      const chat = current.chats.find((c) => c.id === chatId)
      if (!chat) return current
      return patchActiveChat(current, chatId, {
        messages: dedupeOrbMessages([...chat.messages, thinkingMessage])
      })
    })

    try {
      const result = await runStandaloneOrbAction({
        action: backendAction,
        source_message: sourceMessage,
        source_answer: sourceContent.slice(0, 12000),
        mode,
        context: {
          surface: 'standalone_orb_action',
          frontend_action: frontendAction ?? backendAction,
          profile_role: adultProfile
            ? normalizeAdultProfileRole(adultProfile.role)
            : 'residential_support_worker',
          chat_history: actionContext.chatHistory,
          incident_context: actionContext.sourceMessage || undefined
        }
      })

      const actionMessage = ensureStandaloneMessage({
        id: thinkingMessage.id,
        role: 'assistant',
        content: result.answer,
        status: 'complete',
        sources: result.sources,
        explainability: {
          confidence: result.confidence,
          human_review_boundaries: [
            'Standalone ORB action — based only on provided text, not live OS records.'
          ],
          reasoning_summary: result.title
        }
      })

      setWorkspace((current) => {
        const chat = current.chats.find((c) => c.id === chatId)
        if (!chat) return current
        return patchActiveChat(current, chatId, {
          messages: replaceMessageById(chat.messages, thinkingMessage.id, actionMessage)
        })
      })
      setDraftNotice(`${result.title} — standalone ORB action (not an OS record).`)
      return true
    } catch {
      setWorkspace((current) => {
        const chat = current.chats.find((c) => c.id === chatId)
        if (!chat) return current
        return patchActiveChat(current, chatId, {
          messages: chat.messages.filter((m) => m.id !== thinkingMessage.id)
        })
      })
      setDraftNotice('Action could not run — composer prefill is available instead.')
      return false
    } finally {
      setPending(false)
    }
  }

  const documentLensActions = useMemo(() => {
    if (!pendingDocument?.text?.trim() && !pendingDocument?.sourceId) return []
    return contextualDocumentActions(pendingDocument.text || '', pendingDocument.title)
  }, [pendingDocument?.text, pendingDocument?.sourceId, pendingDocument?.title])

  async function runDocumentLens(lens: OrbDocumentLens) {
    const doc = pendingDocument
    if (!doc || (!doc.text?.trim() && !doc.sourceId)) return

    const chatId = workspace.activeChatId
    if (!chatId || pending || sendInFlightRef.current) return

    const thinkingMessage = ensureStandaloneMessage({
      role: 'assistant',
      content: '',
      status: 'thinking',
      thinkingLabel: 'Analysing document…'
    })

    setPending(true)
    setWorkspace((current) => {
      const chat = current.chats.find((c) => c.id === chatId)
      if (!chat) return current
      return patchActiveChat(current, chatId, {
        messages: dedupeOrbMessages([...chat.messages, thinkingMessage])
      })
    })

    try {
      const result = await runOrbDocumentIntelligence({
        lens,
        document_text: doc.sourceId ? undefined : doc.text,
        document_source_id: doc.sourceId || undefined,
        document_title: doc.title,
        mode
      })
      const displayTitle = documentIntelligenceDisplayTitle(lens, doc.title || result.title, doc.text)
      const markdown = formatDocumentIntelligenceMarkdown({ ...result, title: displayTitle })
      setWorkspace((current) => {
        const chat = current.chats.find((c) => c.id === chatId)
        if (!chat) return current
        const messages = chat.messages.map((entry) =>
          entry.id === thinkingMessage.id
            ? {
                ...entry,
                status: 'complete' as const,
                content: markdown,
                outputKind: lens,
                outputTitle: displayTitle,
                documentTitle: doc.title,
                sources: [
                  {
                    label: doc.title || 'Uploaded document',
                    type: 'user_provided',
                    basis: 'User-provided document only — no live OS records',
                    live_retrieved: false
                  }
                ]
              }
            : entry
        )
        const title =
          chat.title === 'New chat' || !chat.title.trim()
            ? generateOrbChatTitle(displayTitle, {
                documentLens: lens,
                documentTitle: doc.title || undefined
              })
            : chat.title
        return patchActiveChat(current, chatId, { messages: dedupeOrbMessages(messages), title })
      })
      setDraftNotice('Document intelligence — standalone draft from uploaded text only.')
    } catch (err) {
      setWorkspace((current) => {
        const chat = current.chats.find((c) => c.id === chatId)
        if (!chat) return current
        return patchActiveChat(current, chatId, {
          messages: chat.messages.filter((m) => m.id !== thinkingMessage.id)
        })
      })
      setDraftNotice(err instanceof Error ? err.message : 'Document intelligence failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleOrbFollowUp(
    action: OrbResponseFollowUpAction,
    sourceContent: string,
    assistantIndex?: number,
    options?: { prefill?: string }
  ) {
    if (options?.prefill?.trim()) {
      setMessage(options.prefill.trim())
      inputRef.current?.focus()
      return
    }
    if (action === 'ofsted_lens') handleModeChange('Ofsted Lens')
    if (action === 'safeguarding_lens') handleModeChange('Safeguarding Thinking')
    if (action === 'recording_wording') handleModeChange('Record This Properly')

    if (!isBackendSupportedOrbResponseAction(action)) {
      prefillOrbFollowUpComposer(action, sourceContent)
      return
    }

    const backendAction = backendOrbActionIdForFollowUp(action)
    if (!backendAction) {
      prefillOrbFollowUpComposer(action, sourceContent)
      return
    }

    const ran = await runBackendOrbAction(backendAction, sourceContent, assistantIndex, action)
    if (!ran) {
      prefillOrbFollowUpComposer(action, sourceContent)
    }
  }

  async function saveChatNote(entry: StandaloneChatMessage) {
    if (savedOutputMessageIds.has(entry.id)) {
      setSaveFeedbackByMessageId((current) => ({ ...current, [entry.id]: 'already_saved' }))
      return
    }
    const savedTitle =
      entry.outputTitle ||
      generateOrbChatTitle(entry.content, {
        mode,
        documentLens: entry.outputKind,
        documentTitle: entry.documentTitle
      }) ||
      'ORB chat note'
    try {
      await createOrbSavedOutput({
        title: savedTitle,
        type: entry.outputKind === 'actions' || entry.outputKind === 'action_plan' ? 'action_plan' : 'document_review',
        project_id: workspace.activeProjectId,
        project_name: activeProject?.name,
        summary: entry.content.slice(0, 800),
        content_markdown: entry.content,
        intelligence_output: {
          title: savedTitle,
          summary: entry.content.slice(0, 2000),
          type: entry.outputKind || 'answer',
          standalone_only: true,
          os_linked: false,
          care_record_access: false
        },
        sources: entry.sources,
        created_from: 'chat',
        created_from_id: entry.id
      })
      setSavedOutputMessageIds((current) => new Set(current).add(entry.id))
      setSaveFeedbackByMessageId((current) => ({ ...current, [entry.id]: 'saved' }))
      setDraftNotice('Saved — standalone ORB artefact (not an OS record).')
      const summary = await fetchOrbSavedOutputsSummary()
      setSavedOutputsCount(summary.total || 0)
    } catch {
      setSaveFeedbackByMessageId((current) => ({ ...current, [entry.id]: 'failed' }))
      await copyToClipboard(entry.content)
      setDraftNotice('Save failed — copied to clipboard instead.')
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
  const activeAgent = agentForMode(mode)
  const isAnswering =
    pending || visibleMessages.some((m) => m.status === 'streaming' || m.status === 'thinking')

  const composer = (
    <div className="orb-composer-dock border-t border-transparent bg-gradient-to-t from-[#f4f6f9] via-[#f4f6f9] to-transparent pt-2">
      {documentLensActions.length ? (
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <OrbDocumentContextChips
            actions={documentLensActions}
            onSelect={(lens) => void runDocumentLens(lens as OrbDocumentLens)}
          />
        </div>
      ) : null}
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
      documentAttached={Boolean(pendingDocument?.text || pendingDocument?.sourceId)}
      documentTitle={pendingDocument?.title}
      onAttachDocumentClick={() => openDocumentsPanel()}
      onAnalyseDocument={() => void runDocumentLens('explain')}
      onDocumentActionPlan={() => void runDocumentLens('actions')}
      onSummariseDocument={() => void runDocumentLens('summary')}
      onAddDocumentToLibrary={() => openKnowledgeLibrary()}
      onToolsClick={openToolsPanel}
      suggestions={undefined}
      agentLabel={activeAgent?.title ?? 'Ask ORB'}
      onAgentSelectorClick={() => setAgentsPanelOpen(true)}
      answering={isAnswering}
      onStopGenerating={isAnswering ? handleStopGeneration : undefined}
    />
    </div>
  )

  function openVoiceSettings() {
    openPanel('voice')
    setSidebarOpen(false)
  }

  function openHelpPanel() {
    openPanel('help')
    setSidebarOpen(false)
  }

  const emptyStarters = useMemo(() => {
    if (adultProfile?.name || adultProfile?.role !== 'residential_support_worker') {
      return roleBasedEmptyStarters(adultProfile ?? readAdultProfile()).map((text) => ({ text }))
    }
    return PRIMARY_EMPTY_STARTERS
  }, [adultProfile])

  const emptyWelcome = useMemo(() => {
    const profile = adultProfile ?? readAdultProfile()
    return personalisedWelcomeMessage(profile, { temporary: Boolean(activeChat?.temporary) })
  }, [adultProfile, activeChat?.temporary])

  const emptyHeading = useMemo(
    () => emptyWelcome.heading || (adultProfile ? personalisedEmptyHeading(adultProfile) : 'How can I help?'),
    [adultProfile, emptyWelcome.heading]
  )

  const userDisplayInitials = useMemo(
    () => profileInitialsFromName(adultProfile?.name),
    [adultProfile?.name]
  )

  const handleEditAndResubmit = useCallback(
    (messageId: string, newContent: string) => {
      const trimmedEdit = newContent.trim()
      if (!trimmedEdit || pending || sendInFlightRef.current) return
      void sendMessage(trimmedEdit, { editMessageId: messageId, chatId: workspace.activeChatId ?? undefined })
    },
    [pending, sendMessage, workspace.activeChatId]
  )

  const handleRegenerate = useCallback(() => {
    const lastUser = [...visibleMessages].reverse().find((m) => m.role === 'user' && m.status === 'sent')
    if (!lastUser?.content.trim() || pending) return
    void sendMessage(lastUser.content, { retry: true, chatId: workspace.activeChatId ?? undefined })
  }, [pending, sendMessage, visibleMessages, workspace.activeChatId])

  const layoutA11yClass = standaloneOrbAccessibilityClassNames(a11yPrefs)

  const atmosphereClass = atmosphereClassForMode(mode)
  const themeClass = resolvedTheme === 'light' ? 'orb-theme-light' : 'orb-theme-dark'

  return (
    <main
      className={`orb-chat-layout relative flex flex-col overflow-hidden ${layoutA11yClass} ${atmosphereClass} ${themeClass} ${isAnswering ? 'orb-response-active' : ''}`}
      data-orb-theme={resolvedTheme}
      data-orb-light-ui-build={ORB_LIGHT_UI_BUILD}
      data-orb-appearance-mode={appearanceMode}
      data-orb-active-panel={activePanel || 'none'}
      data-orb-close-all-panels
      data-orb-text-first-chat="true"
      data-orb-agent={activeAgent?.id ?? 'ask_orb'}
      data-orb-cognition-state={cognitionAmbientState}
    >
      <span className="sr-only">ORB Care Companion — standalone residential care assistant</span>
      <OrbAmbientCognition
        state={cognitionAmbientState}
        agentAtmosphere={atmosphereClass}
        reducedMotion={a11yPrefs.reducedMotion}
      />
      {resolvedTheme === 'dark' ? (
        <div className="pointer-events-none fixed inset-0 orb-cinematic-light-field opacity-35" aria-hidden />
      ) : null}

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
        onClose={() => {
          setChatUiSettings(loadOrbStandaloneChatSettings())
          closePanel()
        }}
        appearanceMode={appearanceMode}
        onAppearanceChange={setAppearanceMode}
        a11yPrefs={a11yPrefs}
        onA11yChange={(patch) => {
          setA11yPrefs((current) => {
            const next = { ...current, ...patch }
            saveStandaloneOrbAccessibility(next)
            return next
          })
        }}
        voiceInputEnabled={STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voice.recognitionAvailable}
        onVoiceInputChange={() => {
          setMicNotice(VOICE_MODE_COMING_SOON)
        }}
        voiceRepliesEnabled={voiceSettings.voiceReplies}
        onVoiceRepliesChange={(enabled) => voice.setVoiceReplies(enabled)}
        onOpenVoiceSettings={openVoiceSettings}
        onOpenProfile={() => setProfileDrawerOpen(true)}
        onOpenHelp={openHelpPanel}
        onExportWorkspace={() => {
          const json = exportStandaloneWorkspaceJson(workspace)
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `orb-standalone-workspace-${Date.now()}.json`
          anchor.click()
          URL.revokeObjectURL(url)
        }}
        onClearMemory={() => {
          if (!window.confirm('Clear all local ORB chat memory on this device?')) return
          clearStandaloneLocalState()
          setWorkspace(readStandaloneWorkspace())
        }}
        onClearProfiles={() => {
          if (!window.confirm('Clear all local profiles?')) return
          clearStandaloneProfiles(workspace)
          setWorkspace(readStandaloneWorkspace())
        }}
        onClearProjects={() => {
          if (!window.confirm('Clear custom projects? Chats will move to General.')) return
          clearStandaloneCustomProjects(workspace)
          setWorkspace(readStandaloneWorkspace())
        }}
      />
      <OrbHelpPanel open={activePanel === 'help'} onClose={closePanel} />
      <OrbVoiceSettingsPanel open={activePanel === 'voice'} onClose={closePanel} />
      <OrbToolsPanel
        open={activePanel === 'tools'}
        onClose={closePanel}
        onOpenKnowledge={openKnowledgeLibrary}
        onOpenDocuments={openDocumentsPanel}
        onOpenAgents={openAgentsPanel}
        onRunDeepResearch={() => {
          setAgentPanelType('deep_research')
          setAgentPanelPrompt('Run deep research on this topic')
          openAgentsPanel()
        }}
        onAskOrb={() => {
          closePanel()
          inputRef.current?.focus()
        }}
        onComposerPrefill={(text) => {
          setMessage(text)
          closePanel()
          inputRef.current?.focus()
        }}
        onRunStandaloneAction={(actionId, prefill) => {
          closePanel()
          void runBackendOrbAction(actionId, prefill, undefined, actionId)
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
      <OrbResidentialAgentsPanel
        open={agentsPanelOpen}
        activeMode={mode}
        onSelect={selectResidentialAgent}
        onClose={() => setAgentsPanelOpen(false)}
      />
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
          className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--orb-line)] transition-transform lg:static lg:z-auto lg:translate-x-0 ${
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
            onOpenAgents={() => {
              setAgentsPanelOpen(true)
              setSidebarOpen(false)
            }}
            onOpenLibrary={() => {
              openKnowledgeLibrary()
              setSidebarOpen(false)
            }}
            onOpenDeepResearch={() => {
              setAgentPanelType('deep_research')
              setAgentPanelPrompt('Run deep research on this topic')
              openAgentsPanel()
              setSidebarOpen(false)
            }}
            onOpenHelp={() => {
              openHelpPanel()
              setSidebarOpen(false)
            }}
            onOpenAdultProfile={() => {
              setProfileDrawerOpen(true)
              setSidebarOpen(false)
            }}
            adultProfile={adultProfile}
            cognitionStatusLabel={cognitionStatusLabel}
            cognitionModeLabel={activeAgent?.cognitionLabel}
            savedOutputsCount={savedOutputsCount}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <div className="orb-chat-main flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="orb-chat-header relative z-10 flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)] bg-[var(--orb-bg-deep)]/90 px-3 py-2.5 backdrop-blur-sm md:px-5">
            <button type="button" className="rounded-lg p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-[var(--orb-foreground)] md:text-base" data-orb-header-title>
                {showEmptyState ? 'ORB' : activeChat?.title || 'ORB'}
              </h1>
            </div>
            {activeChat?.temporary ? (
              <span
                className="hidden shrink-0 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-800 sm:inline"
                data-orb-header-temporary-chat
              >
                Temporary · no memory
              </span>
            ) : (
              <span
                className="hidden shrink-0 rounded-full border border-[#93C5FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#0369A1] sm:inline"
                data-orb-header-privacy
              >
                No OS records accessed
              </span>
            )}
            <button
              type="button"
              onClick={() => (activeChat?.temporary ? startNewChat() : startTemporaryChat())}
              className="hidden rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] sm:inline"
              data-orb-header-temporary-toggle
              title={activeChat?.temporary ? 'Start a normal chat with profile memory' : 'Temporary chat — skips profile memory for this thread'}
            >
              {activeChat?.temporary ? 'Normal chat' : 'Temporary'}
            </button>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setProfileDrawerOpen(true)
                  setSidebarOpen(false)
                }}
                className="rounded-lg p-2 text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[#0077FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50"
                aria-label="Profile"
                data-orb-header-profile
              >
                <User className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void exportConversation()}
                disabled={visibleMessages.length === 0}
                className="rounded-lg p-2 text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50 disabled:opacity-40"
                aria-label="Copy chat"
                data-orb-header-export
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </header>

          {recordingContext ? (
            <div className="mx-3 mt-3 rounded-2xl border border-teal-300/25 bg-teal-300/10 px-4 py-3 text-sm leading-6 text-teal-50 md:mx-5" role="status">
              <strong className="font-black">Recording support:</strong> ORB can help with wording and reflection, but it cannot see the record.
            </div>
          ) : null}

          {attachedProfiles.length > 0 ? (
            <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 md:mx-5">
              {attachedProfiles.map((profile) => (
                <span key={profile.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#C4B5FD] bg-[#F5F3FF] px-3 py-1 text-xs font-semibold text-[#5B21B6]">
                  {profile.avatarInitial} {profile.name}
                  <button type="button" onClick={() => toggleProfileOnChat(profile.id)} className="text-[#7C3AED] hover:text-[#5B21B6]" aria-label={`Remove ${profile.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => setProfilePickerOpen((o) => !o)} className="text-xs font-semibold text-[var(--orb-muted)] underline-offset-2 hover:text-[var(--orb-foreground)] hover:underline">
                Attach profile
              </button>
            </div>
          ) : null}

          {profilePickerOpen ? (
            <div className="mx-3 mt-2 rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-3 md:mx-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">Profiles — user-provided context only</p>
              {workspace.profiles.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--orb-muted)]">Create a profile in the sidebar first.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {workspace.profiles.map((profile) => (
                    <li key={profile.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--orb-surface-hover)]">
                        <input
                          type="checkbox"
                          checked={activeChat?.profileIds.includes(profile.id) ?? false}
                          onChange={() => toggleProfileOnChat(profile.id)}
                        />
                        <span className="text-sm text-[var(--orb-foreground)]">{profile.name}</span>
                        <span className="text-xs text-[var(--orb-muted)]">{profile.label}</span>
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

          {showUrgentSafeguardingBanner ? (
            <div
              className="mx-auto mt-3 flex max-w-[var(--orb-chat-column-max,52.5rem)] items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950 shadow-sm md:px-6"
              role="alert"
              data-orb-safeguarding-urgent-banner
            >
              <span className="mt-0.5 text-lg" aria-hidden>
                ⚠
              </span>
              <p>{URGENT_SAFEGUARDING_BANNER_COPY}</p>
            </div>
          ) : null}

          {modeSafety ? (
            <p className="mx-3 mt-2 text-[11px] leading-5 text-slate-500 md:mx-5">{modeSafety}</p>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
            <div
              ref={scrollContainerRef}
              className="orb-chat-thread flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 pb-32 md:px-6"
              role="log"
              aria-label="ORB conversation"
              data-orb-chat-scroll-container
            >
              <div className="mx-auto w-full max-w-[var(--orb-chat-column-max,50rem)]">
                {showEmptyState ? (
                  <div
                    className="flex min-h-[min(52vh,24rem)] flex-col items-center justify-center px-2 py-6 text-center md:py-8"
                    data-orb-empty-state
                  >
                    <p className="orb-empty-brand-title orb-hue-text" data-orb-brand-name data-orb-empty-title>
                      ORB
                    </p>
                    <p className="orb-empty-brand-powered mt-1.5" data-orb-brand-powered>
                      Powered by IndiCare
                    </p>
                    <h2
                      className="mt-6 text-xl font-semibold tracking-tight text-slate-900 md:text-[1.35rem]"
                      data-orb-empty-heading
                    >
                      {emptyHeading}
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-7 text-slate-600" data-orb-empty-subline>
                      {emptyWelcome.subline}
                    </p>
                    {emptyWelcome.temporaryNote ? (
                      <p
                        className="mt-2 max-w-lg text-xs font-medium leading-5 text-amber-800"
                        data-orb-empty-temporary-note
                      >
                        {emptyWelcome.temporaryNote}
                      </p>
                    ) : null}
                    <p className="mt-3 max-w-md text-xs leading-5 text-slate-500">
                      Pick a starter, choose an agent, or type in the composer below.
                    </p>
                    <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2" data-orb-starter-cards>
                      {emptyStarters.map((starter) => (
                        <button
                          key={starter.text}
                          type="button"
                          onClick={() => applyPrompt(starter)}
                          className="orb-starter-card px-4 py-3.5 text-left text-sm leading-snug"
                          data-orb-starter-card
                        >
                          {starter.text}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromptDrawerOpen(true)}
                      className="mt-3 text-xs font-medium text-[var(--orb-muted)] underline-offset-4 transition hover:text-[var(--orb-foreground)] hover:underline"
                      data-orb-more-examples
                    >
                      More examples
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 pb-6">
                    {imageUnderstandingNote &&
                    imageNoteForMessageId &&
                    visibleMessages.some((m) => m.id === imageNoteForMessageId) ? (
                      <p
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
                        role="status"
                        data-orb-image-unavailable-banner
                      >
                        {imageUnderstandingNote}
                      </p>
                    ) : null}
                    {visibleMessages.map((entry, index) => (
                      <div key={entry.id}>
                        {entry.role === 'assistant' ? (
                          entry.status === 'thinking' ? (
                            <article
                              className="orb-message-assistant flex gap-3"
                              data-testid="orb-message-thinking"
                              aria-live="polite"
                            >
                              <OrbHueMark pulse />
                              <div className="min-w-0 flex-1">
                                <p className="mb-1 text-xs font-medium text-[var(--orb-muted)]">ORB</p>
                                <p className="text-sm text-[var(--orb-muted)] orb-streaming-pulse">
                                  {entry.thinkingLabel || ORB_THINKING_LABEL}
                                </p>
                              </div>
                            </article>
                          ) : entry.status === 'error' ? (
                            <article
                              className="orb-message-assistant rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3"
                              data-testid="orb-message-error"
                              role="alert"
                            >
                              <p className="mb-2 text-xs font-medium text-amber-100/90">ORB</p>
                              <p className="text-sm text-amber-50">{entry.content}</p>
                              {isStandaloneOrbSignInPromptMessage(entry.content) ? (
                                <OrbSignInCallToAction className="border border-white/20 bg-white/10 text-amber-50" />
                              ) : retryPayload && index === visibleMessages.length - 1 ? (
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
                          <>
                          <OrbAssistantMessageBody
                            content={entry.content}
                            sources={entry.sources}
                            mode={mode}
                            streaming={entry.status === 'streaming'}
                            explainability={entry.explainability}
                            modelRouting={entry.modelRouting}
                            messageHint={precedingUserMessageHint(visibleMessages, index)}
                            showCognitionLabels={chatUiSettings.showCognitionLabels}
                            heading={entry.outputTitle}
                            cognitionContext={{
                              context_used: {
                                cognition_display_labels: entry.explainability?.cognition_display_labels,
                                active_brains: entry.explainability?.active_brains,
                                depth_topic: entry.explainability?.depth_topic
                              }
                            }}
                          />
                            {isStandaloneOrbSignInPromptMessage(entry.content) ? (
                              <OrbSignInCallToAction />
                            ) : null}
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
                            {(entry.status === 'complete' || entry.status === 'stopped') ? (
                              <>
                                <OrbResponseActionBar
                                  mode={mode}
                                  content={entry.content}
                                  isLatest={index === visibleMessages.length - 1}
                                  speaking={speakingMessageId === entry.id}
                                  synthesisAvailable={voice.synthesisAvailable}
                                  saveFeedback={saveFeedbackByMessageId[entry.id] || 'idle'}
                                  onRegenerate={
                                    index === visibleMessages.length - 1 ? handleRegenerate : undefined
                                  }
                                  onSpeak={() => speakMessageContent(entry.id, entry.content)}
                                  onStop={voice.cancelSpeaking}
                                  onNewQuestion={() => {
                                    setMessage('')
                                    inputRef.current?.focus()
                                  }}
                                  onDraft={() => void handleDraftWording(entry.content)}
                                  onSave={() => void saveChatNote(entry)}
                                  onSaveToProject={() => void saveChatNote(entry)}
                                  onActionPlan={() => {
                                    setMessage(`Create an action plan from this:\n\n${entry.content.slice(0, 500)}`)
                                    inputRef.current?.focus()
                                  }}
                                  onReflection={() => void saveChatNote(entry)}
                                  onSupervision={() => {
                                    void (async () => {
                                      const ran = await runBackendOrbAction(
                                        BACKEND_ORB_STANDALONE_ACTION_IDS.supervision_prompt,
                                        entry.content,
                                        index,
                                        'supervision_prompt'
                                      )
                                      if (!ran) {
                                        setMessage(
                                          'Help me prepare supervision prompts from our last exchange.'
                                        )
                                        inputRef.current?.focus()
                                      }
                                    })()
                                  }}
                                  onInspectionPrep={() => handleModeChange('Ofsted Lens')}
                                  onOrbFollowUp={(action, content) =>
                                    void handleOrbFollowUp(action, content, index)
                                  }
                                />
                                <OrbMessageFeedback
                                  payload={{
                                    message_id: entry.id,
                                    conversation_id: activeChat?.conversationId,
                                    rating: 'up',
                                    answer_snapshot: entry.content.slice(0, 6000),
                                    question_snapshot: precedingUserMessageHint(
                                      visibleMessages,
                                      index
                                    )?.slice(0, 4000),
                                    mode,
                                    profile_role: adultProfile
                                      ? adultProfile.roleLabel || adultProfile.role
                                      : undefined,
                                    prompt_tier: entry.feedbackContext?.prompt_tier,
                                    detected_family: entry.feedbackContext?.detected_family,
                                    secondary_families: entry.feedbackContext?.secondary_families,
                                    source_anchors: entry.feedbackContext?.source_anchors,
                                    document_lens: entry.feedbackContext?.document_lens
                                  }}
                                  onRetryWithFeedback={
                                    index === visibleMessages.length - 1
                                      ? (comment, reason) => {
                                          const detailSuffix = comment.trim()
                                            ? ` ${comment.trim()}`
                                            : ''
                                          setMessage(
                                            `Please try again. The last answer missed something (${reason.replace(/_/g, ' ')}).${detailSuffix}`
                                          )
                                          inputRef.current?.focus()
                                        }
                                      : undefined
                                  }
                                />
                                {entry.status === 'complete' && index === visibleMessages.length - 1 ? (
                                  <OrbSuggestedReplyChips
                                    suggestions={
                                      entry.outputKind
                                        ? contextualSuggestedRepliesForOutput({
                                            outputKind: entry.outputKind,
                                            content: entry.content,
                                            mode,
                                            messageHint: precedingUserMessageHint(visibleMessages, index)
                                          })
                                        : contextualSuggestedReplies({
                                            mode,
                                            messageHint: precedingUserMessageHint(visibleMessages, index)
                                          })
                                    }
                                    onSelect={(item) =>
                                      void handleOrbFollowUp(item.action, entry.content, index, {
                                        prefill: item.prefill
                                      })
                                    }
                                  />
                                ) : null}
                              </>
                            ) : null}
                          </>
                          )
                        ) : (
                          <>
                          <OrbUserMessageBubble
                            entry={entry}
                            userInitials={userDisplayInitials}
                            onEditSubmit={handleEditAndResubmit}
                            disabled={pending || isAnswering}
                          />
                          {(entry.imageDataUrls?.length ?? 0) > 0 &&
                          index === visibleMessages.length - 1 &&
                          !pending ? (
                            <OrbAskAboutThisChips onSelect={handleAttachmentFollowUp} />
                          ) : null}
                          </>
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
                        {isStandaloneOrbSignInPromptMessage(error) ? (
                          <OrbSignInCallToAction className="border border-white/20 bg-white/10 text-amber-50" />
                        ) : retryPayload ? (
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

            <OrbScrollToBottomFab
              visible={showScrollFab}
              streaming={threadIsStreaming}
              reducedMotion={a11yPrefs.reducedMotion}
              onClick={() => requestChatScroll(true)}
            />

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

      {adultProfile ? (
        <OrbAdultProfileDrawer
          open={profileDrawerOpen}
          profile={adultProfile}
          cognitionModeLabel={activeAgent?.cognitionLabel}
          onClose={() => setProfileDrawerOpen(false)}
          onSave={setAdultProfile}
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

function OrbUserMessageBubble({
  entry,
  userInitials,
  onEditSubmit,
  disabled
}: {
  entry: StandaloneChatMessage
  userInitials: string
  onEditSubmit: (messageId: string, content: string) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.content)
  const created = entry.createdAt ? new Date(entry.createdAt) : null
  const timeLabel =
    created && !Number.isNaN(created.getTime())
      ? created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : null

  useEffect(() => {
    if (!editing) setDraft(entry.content)
  }, [entry.content, editing])

  function saveEdit() {
    const next = draft.trim()
    if (!next || next === entry.content.trim()) {
      setEditing(false)
      return
    }
    onEditSubmit(entry.id, next)
    setEditing(false)
  }

  return (
    <article className="orb-message-user group flex items-end justify-end gap-2.5" data-testid="orb-message-user">
      <div className="orb-message-bubble min-w-0">
        {entry.imageDataUrls?.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {entry.imageDataUrls.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${entry.id}-img-${index}`} src={url} alt="" className="h-16 w-16 rounded-lg border border-[var(--orb-line)] object-cover" />
            ))}
          </div>
        ) : null}
        {editing ? (
          <div data-orb-message-edit>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-[15px] leading-7 text-[var(--orb-foreground)] outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  saveEdit()
                }
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={disabled || !draft.trim()}
                className="rounded-lg bg-[#E0F2FE] px-3 py-1.5 text-xs font-semibold text-[#0369A1] border border-[#0284C7] disabled:opacity-50"
                data-orb-edit-save
              >
                Save & submit
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(entry.content)
                  setEditing(false)
                }}
                className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
                data-orb-edit-cancel
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--orb-foreground)]">{entry.content}</p>
            <div className="mt-1.5 flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={disabled}
                className="orb-action-chip inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold"
                data-orb-message-edit-button
              >
                <Pencil className="h-3 w-3" aria-hidden />
                Edit
              </button>
              {timeLabel ? <span className="text-[10px] text-[#64748B]">{timeLabel}</span> : null}
            </div>
          </>
        )}
      </div>
      <OrbUserSpeakerAvatar initials={userInitials} />
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
      className="orb-action-chip inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition"
    >
      {icon}
      {label}
    </button>
  )
}
