'use client'

import dynamic from 'next/dynamic'
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
  Save,
  Square,
  User,
  Volume2,
  X
} from 'lucide-react'
import { OrbGlow } from '@/components/orb-standalone/orb-glow'
import {
  ensureResidentialWorkspaceProjects,
  readOrbProjectsMemory,
  residentialProjectsToMemory,
  writeOrbProjectsMemory
} from '@/lib/orb/orb-residential-projects'
import {
  fetchOrbProjectsResilient,
  mergeOrbProjectsSafely,
  syncOrbProjectsDebounced
} from '@/lib/orb/orb-projects-resilience'
import { fetchOrbSavedOutputsSummaryResilient } from '@/lib/orb/orb-saved-outputs-resilience'
import { markOrbUserInitiatedConversationStream } from '@/lib/orb/orb-request-storm-guard'
import { shouldSkipAuthenticatedOrbFetch } from '@/lib/orb/orb-session-gate'
import {
  readOrbSidebarCollapsed,
  writeOrbSidebarCollapsed
} from '@/lib/orb/orb-sidebar-preference'
import {
  OrbStandaloneComposer
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
import { OrbDocumentContextPanel } from '@/components/orb-standalone/orb-document-context-panel'
import type { OrbRecordingLibraryAction } from '@/components/orb/recording/OrbRecordingLibraryCards'
import {
  convergedHandoffToOrbWrite,
  convergedTemplateHandoff,
  handoffSavedOutputToOrbWrite
} from '@/lib/orb/write/orb-write-converged-handoff'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import { buildOrbWriteTemplateSectionBody } from '@/lib/orb/recording/orb-recording-framework'
import {
  ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE,
  ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP,
  ORB_RESIDENTIAL_EMPTY_STARTERS,
  ORB_RESIDENTIAL_EMPTY_SUBLINE,
  ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING,
  ORB_RESIDENTIAL_MOBILE_EMPTY_STARTERS,
  ORB_RESIDENTIAL_MOBILE_EMPTY_SUBLINE,
  ORB_RESIDENTIAL_MORE_STARTERS,
  ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTERS,
  ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT,
  ORB_RESIDENTIAL_STARTER_GROUPS,
  residentialStarterPrompt,
  type ResidentialStarter
} from '@/lib/orb/orb-residential-copy'
import { OrbStandaloneAccessibilityPanel } from '@/components/orb-standalone/orb-accessibility-panel'
import { OrbIntelligenceMapPanel } from '@/components/orb-standalone/orb-intelligence-map-panel'
import { OrbMemoryPanel } from '@/components/orb-standalone/orb-memory-panel'
import { OrbPermissionsPanel } from '@/components/orb-standalone/orb-permissions-panel'
import { OrbToolsPanel } from '@/components/orb-standalone/orb-tools-panel'
import { OrbReviewPanel } from '@/components/orb-standalone/orb-review-panel'
import { OrbSkillsPanel } from '@/components/orb-standalone/orb-skills-panel'
import type { OrbSkillDefinition } from '@/lib/orb/orb-skills-catalog'
import {
  OrbWriteTemplatePicker,
  type OrbWriteTemplateApplyMode
} from '@/components/orb-write/orb-write-template-picker'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import type { OrbComposerPlusAction } from '@/components/orb-standalone/orb-composer-plus-menu'
import type { OrbSettingsSectionId } from '@/components/orb-standalone/orb-standalone-settings-panel'
import {
  ORB_TOOL_TO_PANEL,
  type OrbStandalonePanel
} from '@/components/orb-standalone/orb-standalone-panel-types'
import { isOrbCoreWorkspacePanel } from '@/components/orb-standalone/orb-core-workspace-panels'
import { OrbAmbientCognition, type OrbCognitionAmbientState } from '@/components/orb-standalone/orb-ambient-cognition'
import { OrbIntelligenceMicroStatus } from '@/components/orb-standalone/orb-intelligence-micro-status'
import { OrbAccountMenu, type OrbAccountMenuSettingsSection } from '@/components/orb-residential/orb-account-menu'
import { ORB_MOBILE_SHELL_CLASS } from '@/components/orb-residential/orb-mobile-shell'
import { OrbAccountModal } from '@/components/orb-standalone/orb-account-modal'
import { OrbAdultProfileDrawer } from '@/components/orb-standalone/orb-adult-profile-drawer'
import { OrbLayout, OrbMobileChatHeader } from '@/components/orb/orb-layout'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbGuidedDemoEntry } from '@/components/orb-residential/orb-guided-demo-entry'
import { OrbGuidedDemoPanel } from '@/components/orb-residential/orb-guided-demo-panel'
import {
  advanceOrbGuidedDemoStep,
  clearOrbGuidedDemoState,
  markOrbGuidedDemoSaveHint,
  orbGuidedDemoChatPrompt,
  orbGuidedDemoDictateNotes,
  orbGuidedDemoSaveTitle,
  orbGuidedDemoWriteSeed,
  readOrbGuidedDemoState,
  startOrbGuidedDemo,
  type OrbGuidedDemoState,
  type OrbGuidedDemoStep
} from '@/lib/orb/orb-guided-demo'
import {
  ORB_GUIDED_DEMO_ACTIVE_MARKER
} from '@/lib/orb/orb-showstopper-copy'
import {
  ORB_COMPOSER_V2_PLACEHOLDER_CHAT,
  ORB_COMPOSER_V2_PLACEHOLDER_HOME,
  ORB_HOME_RAIL_TRUST_ITEMS
} from '@/lib/orb/orb-convergence-phase-1h-copy'
import { ORB_REQUEST_DEMO_URL } from '@/lib/orb/orb-user-facing-names'
import { OrbStandaloneSidebar } from '@/components/orb-standalone/orb-standalone-sidebar'
import {
  OrbResidentialSidebar,
  type OrbResidentialPracticePanelId,
  type OrbResidentialStationId
} from '@/components/orb-residential/orb-residential-sidebar'
import {
  OrbInspectionReadinessPanel,
  OrbRecordProperlyPanel,
  OrbSafeguardingThinkingPanel
} from '@/components/orb-standalone/orb-practice-panels'
import { OrbConvergedPanelRedirect } from '@/components/orb-standalone/orb-converged-panel-redirect'
import {
  isDeprecatedPrimaryNavPanel,
  practicePanelToDeprecatedId,
  resolveConvergedNavigation,
  type OrbDeprecatedPrimaryNavPanelId
} from '@/lib/orb/orb-navigation-convergence'
import { OrbHueMark } from '@/components/orb-standalone/orb-hue-logo'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { OrbUiAuditBootstrap } from '@/components/orb-standalone/orb-ui-audit-bootstrap'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import { ORB_LIGHT_UI_BUILD } from '@/lib/orb/orb-light-ui-build'
import { ORB_DATA_BOUNDARY, ORB_DATA_BOUNDARY_SHORT, ORB_PRODUCT_NAME } from '@/lib/orb/orb-product-copy'
import {
  buildAdultProfilePromptBlock,
  normalizeAdultProfileRole,
  readAdultProfile,
  roleBasedEmptyStarters,
  type AdultProfile
} from '@/lib/orb/adult-profile-store'
import {
  personalisedEmptyHeading,
  personalisedWelcomeMessage
} from '@/lib/orb/orb-personalised-greeting'
import {
  STANDALONE_ORB_SIGN_IN_PATH,
  STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER,
  isStandaloneOrbSignInPromptMessage,
  isStandaloneOrbSafetyAcceptanceMessage,
  isOrbMinimalTurn,
  standaloneGreetingLocalAnswer,
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
import {
  defaultStandaloneOrbAccessibility,
  loadStandaloneOrbAccessibility,
  type StandaloneOrbAccessibilityPreferences,
  saveStandaloneOrbAccessibility,
  standaloneOrbAccessibilityClassNames
} from '@/lib/orb/standalone-accessibility'
import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/contexts/orb-account-context'
import { getOrbBillingDisplayStatus } from '@/lib/orb/orb-billing-display'
import { shouldAllowOrbProductFetch } from '@/lib/orb/orb-product-bootstrap-guard'
import { normaliseRole } from '@/lib/auth/permissions'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import {
  canUseComposerMic,
  orbMicDevLog,
  resolveOrbMicAccessContext
} from '@/lib/orb/voice/orb-mic-access'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { isOrbRealtimeVoiceAvailable } from '@/lib/orb/voice/orb-realtime-availability'
import { isSafariBrowser } from '@/lib/orb/voice/orb-voice-readiness'
import { useOrbSessionGate } from '@/hooks/use-orb-session-gate'
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
  resetOrbChatScrollPosition,
  scrollOrbToBottom,
  shouldShowOrbScrollFab
} from '@/lib/orb/orb-scroll'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import { stripMarkdownForSpeech } from '@/lib/orb/orb-speech-text'
import { loadOrbStandaloneChatSettings } from '@/lib/orb/orb-standalone-settings'
import {
  estimateTranscriptExpertDepth,
  extractAnswerQualityGate,
  extractIndicareIntelligenceCore,
  shouldPauseVoiceAutoSend
} from '@/lib/orb/indicare-intelligence-core'
import { resolveOrbVoiceSpeechDecision } from '@/lib/orb/voice/orb-voice-speech-policy'
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
import { buildSavedOutputCreateBody } from '@/lib/orb/orb-saved-output-adapters'
import type { OrbSavedOutputRerunState } from '@/lib/orb/orb-saved-output-adapters'
import {
  createOrbSavedOutput,
  fetchStandaloneOrbConfig,
  ORB_SAFETY_ONBOARDING_PATH,
  parseStandaloneOrbSendError,
  logOrbCognitionDebug,
  logOrbTiming,
  queryStandaloneOrbConversation,
  runOrbDocumentIntelligence,
  runStandaloneOrbAction,
  STANDALONE_ORB_EMPTY_ANSWER_MESSAGE,
  STANDALONE_ORB_MODES,
  type StandaloneOrbAgentSuggestion,
  type StandaloneOrbConversationResponse,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'
import { uploadOrbComposerDocument } from '@/lib/orb/orb-composer-upload-client'
import {
  ORB_COMPOSER_MAX_ATTACHMENTS,
  ORB_COMPOSER_MAX_DOCUMENT_ATTACHMENTS,
  ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE,
  composerAttachmentFromFile,
  readComposerFileAsBase64,
  readComposerFileAsDataUrl,
  revokeComposerAttachmentPreview,
  type OrbComposerAttachment
} from '@/lib/orb/orb-composer-attachments'
import { orbComposerInlineVoiceStatusLine } from '@/lib/orb/orb-composer-inline-voice-status'
import {
  ORB_COMPOSER_SPEECH_LISTENING_COPY,
  ORB_COMPOSER_SPEECH_OPENING_MIC_COPY,
  ORB_COMPOSER_SPEECH_START_TIMEOUT_MS,
  ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE,
  composerSpeechImmediateStatus,
  orbComposerSpeechFallbackMessage,
  shouldComposerPreferDictateFallback
} from '@/lib/orb/orb-composer-inline-voice-fallback'
import { ORB_DRAFT_NOTICE_CLASS } from '@/lib/orb/orb-draft-notice'
import {
  BACKEND_ORB_STANDALONE_ACTION_IDS,
  backendOrbActionIdForFollowUp,
  isBackendSupportedOrbResponseAction
} from '@/lib/orb/orb-response-actions'
import { buildOrbBrainConversationRequest } from '@/lib/orb/orb-brain-router'
import { executeOrbConversationTransport } from '@/hooks/use-orb-conversation'
import {
  markOrbVoiceBrainFetchFailure,
  markOrbVoiceClientBrainFetch
} from '@/lib/orb/voice/orb-voice-submit-client'
import {
  logOrbChatLatencySnapshot,
  markOrbChatLatency,
  startOrbChatLatencyTrace
} from '@/lib/orb/orb-chat-latency'
import {
  isOrbFastOpeningOnlyCompletion,
  resolveOrbStreamedAnswer
} from '@/lib/orb/orb-fast-opening'
import { collectCognitionDisplayLabels } from '@/lib/orb/residential-agents'
import {
  contextualDocumentActions,
  documentIntelligenceDisplayTitle,
  formatDocumentIntelligenceMarkdown,
  RESIDENTIAL_FIRST_CLASS_LENSES,
  type OrbDocumentIntelligenceResult,
  type OrbDocumentLens
} from '@/lib/orb/document-intelligence'

const OrbKnowledgeLibraryPanel = dynamic(
  () =>
    import('@/components/orb-standalone/orb-knowledge-library').then(
      (mod) => mod.OrbKnowledgeLibraryPanel
    ),
  { loading: () => null, ssr: false }
)
const OrbTemplatesPanel = dynamic(
  () =>
    import('@/components/orb-standalone/orb-templates-panel').then((mod) => mod.OrbTemplatesPanel),
  { loading: () => null, ssr: false }
)
const OrbSavedOutputsPanel = dynamic(
  () =>
    import('@/components/orb-standalone/orb-saved-outputs-panel').then(
      (mod) => mod.OrbSavedOutputsPanel
    ),
  { loading: () => null, ssr: false }
)
const OrbDocumentPanel = dynamic(
  () =>
    import('@/components/orb-standalone/orb-document-panel').then((mod) => mod.OrbDocumentPanel),
  { loading: () => null, ssr: false }
)
const OrbShiftBuilderPanel = dynamic(
  () =>
    import('@/components/orb-standalone/shift-builder/orb-shift-builder-panel').then(
      (mod) => mod.OrbShiftBuilderPanel
    ),
  { loading: () => null, ssr: false }
)
const OrbVoiceStation = dynamic(
  () =>
    import('@/components/orb-standalone/orb-voice-station').then((mod) => mod.OrbVoiceStation),
  { loading: () => null, ssr: false }
)
const OrbDictateStation = dynamic(
  () =>
    import('@/components/orb-standalone/orb-dictate-station').then((mod) => mod.OrbDictateStation),
  { loading: () => null, ssr: false }
)
const OrbWriteStandalonePanel = dynamic(
  () =>
    import('@/components/orb-write/orb-write-standalone-panel').then(
      (mod) => mod.OrbWriteStandalonePanel
    ),
  { loading: () => null, ssr: false }
)
const OrbBillingModal = dynamic(
  () =>
    import('@/components/orb-standalone/orb-billing-modal').then((mod) => mod.OrbBillingModal),
  { loading: () => null, ssr: false }
)
const OrbStandaloneSettingsPanel = dynamic(
  () =>
    import('@/components/orb-standalone/orb-standalone-settings-panel').then(
      (mod) => mod.OrbStandaloneSettingsPanel
    ),
  { loading: () => null, ssr: false }
)

/** Push-to-talk voice with reflective pacing — no passive listening. */
const STANDALONE_ORB_VOICE_CAPTURE_ENABLED = true
const VOICE_MODE_COMING_SOON = 'Allow microphone access to use push-to-talk voice.'

const MODE_SAFETY: Partial<Record<StandaloneOrbMode, string>> = {
  'Safeguarding Thinking':
    'Follow safeguarding procedures and escalate immediate risk. ORB supports thinking; it does not make decisions.',
  'Record This Properly': 'ORB can help with wording, but review before adding to records.',
  'Ofsted Lens': 'Inspection evidence preparation guidance only. ORB does not make regulatory judgements.',
  'Reg 44 / Reg 45 Prep': 'Governance support only — improvement plans and evidence remain provider-led.'
}

const MAX_HISTORY_TURNS = 20
const MAX_IMAGE_ATTACHMENTS = ORB_COMPOSER_MAX_ATTACHMENTS
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
  /** When voice sends a transcript, preserve it if the brain request fails. */
  source?: 'voice' | 'chat'
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

function stripInFlightAssistantPlaceholders(messages: StandaloneChatMessage[]): StandaloneChatMessage[] {
  return dedupeOrbMessages(
    messages.filter((entry) => entry.status !== 'thinking' && entry.status !== 'streaming')
  )
}

function replaceInFlightWithError(
  messages: StandaloneChatMessage[],
  errorMessage: StandaloneChatMessage
): StandaloneChatMessage[] {
  const withoutInFlight = stripInFlightAssistantPlaceholders(messages)
  return dedupeOrbMessages([...withoutInFlight, errorMessage])
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
  mobileInlineVoice?: boolean
}): string {
  const { voice, pending, micNotice, voiceCaptureEnabled, mobileInlineVoice } = options
  if (mobileInlineVoice) {
    return orbComposerInlineVoiceStatusLine({
      listening: voice.listening,
      speaking: voice.speaking,
      pending,
      phase: voice.phase,
      voiceCaptureState: voice.voiceCaptureState,
      micNotice,
      voiceCaptureEnabled
    })
  }
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
      Sign in to ORB Residential
    </button>
  )
}

function OrbSafetyAcceptanceCallToAction({ className = '' }: { className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      data-orb-safety-acceptance-cta
      onClick={() => router.push(ORB_SAFETY_ONBOARDING_PATH)}
      className={`mt-3 inline-flex h-9 items-center rounded-full bg-[var(--orb-accent)] px-4 text-xs font-semibold text-white hover:opacity-95 ${className}`}
    >
      Continue
    </button>
  )
}

function orbErrorCallToAction(message: string, className = 'mt-3') {
  if (isStandaloneOrbSafetyAcceptanceMessage(message)) {
    return <OrbSafetyAcceptanceCallToAction className={className} />
  }
  if (isStandaloneOrbSignInPromptMessage(message)) {
    return <OrbSignInCallToAction className={className} />
  }
  return null
}

export function OrbCareCompanion({ residentialSurface = false }: { residentialSurface?: boolean } = {}) {
  const { status, csrfReady, refreshSession, logout } = useAuth()
  const account = useOrbAccountState()
  const subscriptionStatusLabel = useMemo(() => {
    if (!account.isSignedIn) return null
    return getOrbBillingDisplayStatus(account.access, {
      isLoading: account.accessStatus === 'loading' || (account.isLoading && !account.access),
      hasError: account.accessStatus === 'error',
      isSignedIn: true
    }).headline
  }, [account.access, account.accessStatus, account.isLoading, account.isSignedIn])
  const sessionGate = useOrbSessionGate()
  const orbSessionReady = account.isSignedIn && csrfReady && !account.isLoading
  const mounted = useMounted()
  const { resolvedTheme, appearanceMode, setAppearanceMode } = useOrbAppearance()
  const isMobileViewport = useOrbMobileViewport()
  const searchParams = useSearchParams()
  const initialQuery = mounted ? searchParams.get('q')?.trim() || '' : ''
  const recordingContext = mounted && searchParams.get('context') === 'recording'
  const queryMode = mounted ? modeFromQuery(searchParams.get('mode')) : undefined

  const [workspace, setWorkspace] = useState<StandaloneWorkspace>(() => defaultWorkspace())
  const [modes, setModes] = useState<string[]>([...STANDALONE_ORB_MODES])
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [answeringStreamStatus, setAnsweringStreamStatus] = useState<string | null>(null)
  const [answeringDepthHint, setAnsweringDepthHint] = useState<string | null>(null)
  const [lastSendStatus, setLastSendStatus] = useState<LastSendStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [retryPayload, setRetryPayload] = useState<{ text: string; chatId: string } | null>(null)
  const [imageUnderstandingNote, setImageUnderstandingNote] = useState<string | null>(null)
  const [imageNoteForMessageId, setImageNoteForMessageId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<OrbComposerAttachment[]>([])
  const [micNotice, setMicNotice] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePanel, setActivePanel] = useState<OrbStandalonePanel>(null)
  const [dictateImportTranscript, setDictateImportTranscript] = useState<string | undefined>()
  const [dictateImportNoteType, setDictateImportNoteType] = useState<OrbDictateNoteType | undefined>()
  const [dictateImportStudio, setDictateImportStudio] = useState(false)
  const [dictateImportStudioTemplateId, setDictateImportStudioTemplateId] = useState<string | undefined>()
  const [documentImportRecordTypeId, setDocumentImportRecordTypeId] = useState<string | undefined>()
  const [documentImportText, setDocumentImportText] = useState<string | undefined>()
  const [documentImportLens, setDocumentImportLens] = useState<OrbDocumentLens | undefined>()
  const [templatesImportSearch, setTemplatesImportSearch] = useState('')
  const [composerRecordTypePickerOpen, setComposerRecordTypePickerOpen] = useState(false)
  const [convergenceRedirectPanel, setConvergenceRedirectPanel] =
    useState<OrbDeprecatedPrimaryNavPanelId | null>(null)
  const [convergenceNotice, setConvergenceNotice] = useState<string | null>(null)
  const [shiftImportNotes, setShiftImportNotes] = useState<string | undefined>()
  const [shiftImportFocus, setShiftImportFocus] = useState<
    import('@/lib/orb/shift-builder').OrbShiftBuilderFocus | undefined
  >()
  const [realtimeVoiceAvailable, setRealtimeVoiceAvailable] = useState(false)
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false)
  const [promptDrawerOpen, setPromptDrawerOpen] = useState(false)
  const [moreExamplesExpanded, setMoreExamplesExpanded] = useState(false)
  const [guidedDemoState, setGuidedDemoState] = useState<OrbGuidedDemoState>(() =>
    typeof window === 'undefined' ? { active: false, stepIndex: 0, startedAt: 0 } : readOrbGuidedDemoState()
  )
  const [guidedDemoPanelOpen, setGuidedDemoPanelOpen] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)
  const [savedOutputsCount, setSavedOutputsCount] = useState(0)
  const [a11yPrefs, setA11yPrefs] = useState<StandaloneOrbAccessibilityPreferences>(() =>
    loadStandaloneOrbAccessibility()
  )
  const [fallbackConversationId] = useState('standalone-session')
  const [agentPanelPrompt, setAgentPanelPrompt] = useState('')
  const [agentPanelType, setAgentPanelType] = useState<string | undefined>()
  const [pendingDocument, setPendingDocument] = useState<{
    text: string
    title: string
    sourceId: string | null
  } | null>(null)
  const [documentPanelResult, setDocumentPanelResult] = useState<OrbDocumentIntelligenceResult | null>(
    null
  )
  const [adultProfile, setAdultProfile] = useState<AdultProfile | null>(null)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<OrbSettingsSectionId>('appearance')
  const accountMenuAnchorRef = useRef<HTMLElement | null>(null)
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
  const composerSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)
  const sendInFlightRef = useRef(false)
  const submitGuardRef = useRef(false)
  const lastSubmitRef = useRef<{ chatId: string; content: string; at: number } | null>(null)
  const sendGenerationRef = useRef(0)
  const requestAbortRef = useRef<AbortController | null>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const streamGenerationRef = useRef(0)
  const streamPartialRef = useRef('')
  const workspaceHydratedRef = useRef(false)

  const voice = useStandaloneOrbVoice()
  const { settings: voiceSettings } = voice

  const activeProject = useMemo(
    () => workspace.projects.find((p) => p.id === workspace.activeProjectId),
    [workspace.projects, workspace.activeProjectId]
  )

  useEffect(() => {
    if (!orbSessionReady || shouldSkipAuthenticatedOrbFetch()) return
    if (!shouldAllowOrbProductFetch('saved_outputs_summary')) return
    void fetchOrbSavedOutputsSummaryResilient()
      .then((summary) => setSavedOutputsCount(summary.total || 0))
      .catch(() => setSavedOutputsCount(0))
  }, [activePanel, orbSessionReady])

  useEffect(() => {
    let next = readStandaloneWorkspace()
    if (residentialSurface) {
      next = ensureResidentialWorkspaceProjects(next)
      setSidebarCollapsed(readOrbSidebarCollapsed())
    }
    setWorkspace(next)
    setA11yPrefs(loadStandaloneOrbAccessibility())
    setAdultProfile(readAdultProfile())
    workspaceHydratedRef.current = true
  }, [residentialSurface])

  useEffect(() => {
    if (!residentialSurface || !workspaceHydratedRef.current) return
    writeOrbProjectsMemory(workspace)
    if (account.isSignedIn && !shouldSkipAuthenticatedOrbFetch()) {
      void syncOrbProjectsDebounced(residentialProjectsToMemory(workspace))
    }
  }, [residentialSurface, workspace, account.isSignedIn])

  useEffect(() => {
    if (!residentialSurface || !workspaceHydratedRef.current) return
    if (!account.isSignedIn && shouldSkipAuthenticatedOrbFetch()) return
    if (!shouldAllowOrbProductFetch('projects')) return
    void fetchOrbProjectsResilient().then(({ server, usedLocalFallback }) => {
      if (usedLocalFallback && !server.length) return
      if (!server.length) return
      const localMemory = readOrbProjectsMemory() ?? residentialProjectsToMemory(workspace)
      const merged = mergeOrbProjectsSafely(localMemory, server)
      setWorkspace((current) => {
        const projects = current.projects.map((project) => {
          const remote = merged.find((row) => row.id === project.id)
          if (!remote?.pinnedContext) return project
          return { ...project, memory: remote.pinnedContext, updatedAt: Date.now() }
        })
        return { ...current, projects }
      })
    })
  }, [residentialSurface, account.isSignedIn])

  useEffect(() => {
    if (account.isLoading) return
    setAdultProfile((current) => {
      const local = current ?? readAdultProfile()
      if (!account.isSignedIn) return local
      return {
        ...account.adultProfile,
        name: local.name.trim() ? local.name : account.adultProfile.name,
        role: local.updatedAt > 0 ? local.role : account.adultProfile.role,
        roleLabel: local.updatedAt > 0 ? local.roleLabel : account.adultProfile.roleLabel
      }
    })
  }, [account.isLoading, account.isSignedIn, account.adultProfile, account.userEmail])

  useEffect(() => {
    if (adultProfile?.voicePreference?.prefersSpokenResponses && !voiceSettings.voiceReplies) {
      voice.updateSettings({ voiceReplies: true })
    }
  }, [adultProfile?.voicePreference?.prefersSpokenResponses, voice, voiceSettings.voiceReplies])

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

  const voiceStationAssistant = useMemo(() => {
    if (activePanel !== 'orb_voice' || !activeChat) return null
    const lastAssistant = [...activeChat.messages]
      .reverse()
      .find(
        (entry) =>
          entry.role === 'assistant' &&
          entry.status !== 'thinking' &&
          entry.status !== 'error' &&
          (entry.content.trim() || entry.status === 'streaming')
      )
    if (!lastAssistant) return null
    const lastUser = [...activeChat.messages]
      .reverse()
      .find((entry) => entry.role === 'user' && entry.content.trim())
    return {
      key: lastAssistant.id,
      text: lastAssistant.content,
      userHint: lastUser?.content,
      contextUsed: lastAssistant.contextUsed
    }
  }, [activePanel, activeChat])

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
  const activeWorkspacePanel =
    residentialSurface && isOrbCoreWorkspacePanel(activePanel) ? activePanel : null

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
  const openSettingsPanel = useCallback(
    (section: OrbSettingsSectionId = 'appearance') => {
      setSettingsInitialSection(section)
      openPanel('settings')
    },
    [openPanel]
  )
  const openDocumentsPanel = useCallback(() => openPanel('documents'), [openPanel])
  const openShiftBuilderPanel = useCallback(() => openPanel('shift_builder'), [openPanel])
  const openAgentsPanel = useCallback(() => openPanel('agents'), [openPanel])
  const openKnowledgeLibrary = useCallback(() => openPanel('knowledge'), [openPanel])
  const openReviewPanel = useCallback(() => openPanel('review'), [openPanel])
  const openPracticePanelDirect = useCallback(
    (panel: OrbResidentialPracticePanelId) => openPanel(panel),
    [openPanel]
  )
  const openSkillsPanel = useCallback(() => openPanel('skills'), [openPanel])
  const openTemplatesPanel = useCallback(() => openPanel('templates'), [openPanel])
  const openSavedOutputsPanel = useCallback(() => openPanel('saved_outputs'), [openPanel])
  const openMemoryPanel = useCallback(() => openPanel('memory'), [openPanel])
  const openAccessibilityPanel = useCallback(() => openPanel('accessibility'), [openPanel])
  const openPermissionsPanel = useCallback(() => openPanel('permissions'), [openPanel])
  const openIntelligenceMap = useCallback(() => openPanel('intelligence_map'), [openPanel])
  const openBillingPanel = useCallback(() => openPanel('billing'), [openPanel])
  const openOrbVoicePanel = useCallback(() => openPanel('orb_voice'), [openPanel])
  const openOrbDictatePanel = useCallback(
    (opts?: {
      transcript?: string
      noteType?: OrbDictateNoteType
      studio?: boolean
      studioTemplateId?: string
    }) => {
      setDictateImportTranscript(opts?.transcript)
      setDictateImportNoteType(opts?.noteType)
      setDictateImportStudio(Boolean(opts?.studio || opts?.studioTemplateId))
      setDictateImportStudioTemplateId(opts?.studioTemplateId)
      openPanel('orb_dictate')
    },
    [openPanel]
  )
  const openOrbWritePanel = useCallback(() => openPanel('orb_write'), [openPanel])

  const openOrbWriteWithContent = useCallback(
    (opts: {
      content: string
      source: 'chat' | 'voice' | 'document' | 'saved_output' | 'unknown'
      sourceLabel: string
      recordTypeId?: string
      title?: string
    }) => {
      convergedHandoffToOrbWrite({
        content: opts.content,
        source: opts.source,
        sourceLabel: opts.sourceLabel,
        recordTypeId: opts.recordTypeId,
        title: opts.title
      })
      openPanel('orb_write')
    },
    [openPanel]
  )

  const openChatPanel = useCallback(() => {
    closePanel()
    setSidebarOpen(false)
  }, [closePanel])

  const handleRecordingLibraryAction = useCallback(
    (action: OrbRecordingLibraryAction, recordType: OrbRecordingRecordType) => {
      closePanel()
      if (action === 'dictate') {
        openOrbDictatePanel({
          studio: true,
          studioTemplateId: recordType.studio_template_id ?? 'general',
          noteType: recordType.dictate_note_type
        })
        return
      }
      if (action === 'write') {
        convergedTemplateHandoff(recordType)
        openOrbWritePanel()
        return
      }
      if (action === 'document') {
        setDocumentImportRecordTypeId(recordType.id)
        openDocumentsPanel()
        return
      }
      if (action === 'chat') {
        setMessage(
          `Help me create a ${recordType.label.toLowerCase()} using this structure:\n\n${recordType.purpose}`
        )
        inputRef.current?.focus()
      }
    },
    [closePanel, openDocumentsPanel, openOrbDictatePanel, openOrbWritePanel]
  )

  function openResidentialAccountMenu(anchor?: HTMLElement | null) {
    if (anchor) {
      accountMenuAnchorRef.current = anchor
    }
    if (residentialSurface) {
      setAccountMenuOpen((current) => !current)
    } else {
      setProfileDrawerOpen(true)
    }
  }

  function openResidentialProfile() {
    if (residentialSurface) {
      setAccountMenuOpen(false)
      openPanel('account')
    } else {
      setProfileDrawerOpen(true)
    }
  }

  async function handleResidentialSignOut() {
    setAccountMenuOpen(false)
    setProfileDrawerOpen(false)
    setSidebarOpen(false)
    closePanel()
    try {
      await logout()
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/orb')
      }
    }
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current
      writeOrbSidebarCollapsed(next)
      return next
    })
  }

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
    if (!shouldAllowOrbProductFetch('standalone_config')) return
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
    if (activeWorkspacePanel) return
    const container = scrollContainerRef.current
    resetOrbChatScrollPosition(container, {
      hasMessages: visibleMessages.length > 0,
      endElement: messagesEndRef.current
    })
    isNearBottomRef.current = visibleMessages.length > 0
    setShowScrollFab(false)
  }, [workspace.activeChatId, activeWorkspacePanel, visibleMessages.length])

  useEffect(() => {
    if (activeWorkspacePanel) return
    requestChatScroll(true)
  }, [visibleMessages.length, pending, requestChatScroll, activeWorkspacePanel])

  useEffect(() => {
    if (!streamingTail || activeWorkspacePanel) return
    requestChatScroll(false)
  }, [streamingTail, requestChatScroll, activeWorkspacePanel])

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
      const hasImages = attachments.some((item) => item.kind === 'image')
      const hasDocuments = attachments.some((item) => item.kind === 'document')
      if ((!trimmed && !hasImages && !hasDocuments) || pending || sendInFlightRef.current) {
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
      markOrbUserInitiatedConversationStream()
      if (!options?.retry && !options?.internalRetry) {
        lastSubmitRef.current = { chatId: guardChatId, content: contentKey, at: now }
      }
      if (voice.speaking) voice.cancelSpeaking()

      startOrbChatLatencyTrace(`send-${sendGeneration}-${now}`)
      markOrbChatLatency('send_clicked')

      let targetChatId = options?.chatId || workspace.activeChatId
      let targetChat = targetChatId ? workspace.chats.find((c) => c.id === targetChatId) ?? null : null
      const userMessageId = `u-${now}`
      const thinkingMessageId = `a-thinking-${now}`
      const optimisticUserContent =
        trimmed ||
        (hasImages ? '[Image attachment]' : hasDocuments ? '[Document attachment]' : '')
      const userMessage: StandaloneChatMessage = {
        id: userMessageId,
        role: 'user',
        content: optimisticUserContent,
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
        priorMessages = [...stripTrailingTurnPlaceholders(existingMessages), thinkingMessage]
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
      setPending(true)
      setLastSendStatus('sending')
      setError(null)
      setRetryPayload(null)
      setAnsweringStreamStatus(null)
      markOrbChatLatency('thinking_visible')
      traceOrbSend('pending_state', { sendGeneration, pending: true, early: true })

      const imagePayload = await Promise.all(
        attachments
          .filter((item) => item.kind === 'image')
          .map(async (item) => ({
            data_url: await readComposerFileAsDataUrl(item.file),
            name: item.name
          }))
      )
      if (imagePayload.length > 0) {
        priorMessages = replaceMessageById(priorMessages, userMessageId, {
          ...userMessage,
          content: trimmed || '[Image attachment]',
          imageDataUrls: imagePayload.map((i) => i.data_url)
        })
        commitMessages(priorMessages)
      }

      let composerDocumentSourceId: string | undefined
      let composerDocumentTitle: string | undefined
      const documentAttachment = attachments.find((item) => item.kind === 'document')
      if (documentAttachment) {
        setAttachments((current) =>
          current.map((item) =>
            item.id === documentAttachment.id ? { ...item, status: 'uploading', error: undefined } : item
          )
        )
        try {
          const content_base64 = await readComposerFileAsBase64(documentAttachment.file)
          const uploaded = await uploadOrbComposerDocument({
            title: documentAttachment.name.replace(/\.[^.]+$/, '') || documentAttachment.name,
            content_base64,
            file_name: documentAttachment.name,
            content_type: documentAttachment.mimeType || undefined,
            source_type: 'user_uploaded'
          })
          composerDocumentSourceId = uploaded.source_id
          composerDocumentTitle = uploaded.title
          setAttachments((current) =>
            current.map((item) =>
              item.id === documentAttachment.id ? { ...item, status: 'ready' } : item
            )
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          setAttachments((current) =>
            current.map((item) =>
              item.id === documentAttachment.id ? { ...item, status: 'error', error: message } : item
            )
          )
          setDraftNotice(`Could not upload ${documentAttachment.name}. ${message}`)
          const withoutThinking = stripInFlightAssistantPlaceholders(priorMessages)
          commitMessages(withoutThinking)
          setPending(false)
          sendInFlightRef.current = false
          return
        }
      }
      lastSendHadImagesRef.current = imagePayload.length > 0
      clearComposerAttachments()
      const skipPersonalisation = Boolean(targetChat?.temporary)
      const profileBlock = skipPersonalisation ? '' : buildProfileContextBlock(attachedProfiles)
      const adultBlock =
        skipPersonalisation || !adultProfile ? '' : buildAdultProfilePromptBlock(adultProfile)
      const messageBody = [
        adultBlock,
        profileBlock,
        trimmed || (hasImages ? 'Please look at the image(s) I shared and help me with this.' : hasDocuments ? 'Please review the document I shared and help me with this.' : '')
      ]
        .filter(Boolean)
        .join('\n\n')

      setAnsweringDepthHint(estimateTranscriptExpertDepth(trimmed || messageBody))
      composerUserEditedRef.current = false
      voiceMayFillComposerRef.current = false
      const voiceOriginatedSend =
        options?.source === 'voice' || activePanel === 'orb_voice'
      if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voiceOriginatedSend) {
        voice.markIdle()
      }

      const greetingAnswer =
        imagePayload.length === 0 && !options?.retry ? standaloneGreetingLocalAnswer(trimmed) : null
      if (greetingAnswer) {
        const assistantMessage: StandaloneChatMessage = {
          id: `a-greeting-${Date.now()}`,
          role: 'assistant',
          content: greetingAnswer,
          status: 'complete',
          createdAt: Date.now()
        }
        persistChat(targetChatId!, {
          messages: dedupeOrbMessages(replaceMessageById(priorMessages, thinkingMessageId, assistantMessage))
        })
        setLastSendStatus('success')
        setError(null)
        setRetryPayload(null)
        setPending(false)
        requestAbortRef.current?.abort()
        requestAbortRef.current = null
        streamAbortRef.current?.abort()
        streamAbortRef.current = null
        streamPartialRef.current = ''
        traceOrbSend('local_greeting_response', {
          sendGeneration,
          signedIn: orbSessionReady
        })
        sendInFlightRef.current = false
        return
      }

      setImageUnderstandingNote(null)
      setImageNoteForMessageId(null)

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

      const projectMemory = (activeProject?.memory || activeProject?.description || '').trim()
      const conversationRequest = {
        message: framedMessage,
        mode,
        conversation_id: sessionConversationId,
        history: historyForRequest.slice(0, -1),
        detail: voiceSettings.answerStyle,
        images: imagePayload.length ? imagePayload : undefined,
        document_text: pendingDocument?.text,
        document_source_id: composerDocumentSourceId || pendingDocument?.sourceId || undefined,
        document_title: composerDocumentTitle || pendingDocument?.title,
        ...(projectMemory ? { project_memory: projectMemory } : {})
      }

      const runConversationRequest = async () => {
        if (voiceOriginatedSend) {
          const { patchOrbVoiceBrowserDiagnostics } = await import('@/lib/orb/voice/orb-voice-browser-diagnostics')
          markOrbVoiceClientBrainFetch()
          patchOrbVoiceBrowserDiagnostics({ brainRequestAttempted: true, orbBrainAttempted: true })
        }
        const brainRoutedRequest = buildOrbBrainConversationRequest(conversationRequest, {
          source: voiceOriginatedSend ? 'voice' : 'chat',
          mode
        })
        return queryStandaloneOrbConversation(brainRoutedRequest, requestController.signal)
      }

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
        const resolvedAnswer = resolveOrbStreamedAnswer(
          response.answer,
          streamPartialRef.current,
          {
            errorDetail: response.error_detail,
            answerRepaired:
              response.answer_repaired ??
              response.final_answer_repair_applied ??
              Boolean(
                (response.context_used as Record<string, unknown> | undefined)?.answer_repaired ??
                  (response.context_used as Record<string, unknown> | undefined)
                    ?.final_answer_repair_applied
              )
          }
        )
        const answer =
          resolvedAnswer.trim() ||
          STANDALONE_ORB_EMPTY_ANSWER_MESSAGE
        const streamIncomplete =
          Boolean(response.error_detail) ||
          isOrbFastOpeningOnlyCompletion(answer, {
            errorDetail: response.error_detail,
            streamedPartial: streamPartialRef.current
          })
        const displayAnswer = options?.streamErrorNote
          ? `${answer}\n\n*(${options.streamErrorNote})*`
          : streamIncomplete && !options?.streamErrorNote
            ? `${answer}\n\n*(ORB could not finish the full answer — please try again or ask for the next section.)*`
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
          contextUsed: response.context_used
            ? (response.context_used as unknown as Record<string, unknown>)
            : undefined,
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
        const intelCore = extractIndicareIntelligenceCore(
          response.context_used as unknown as Record<string, unknown> | undefined
        )
        const qualityGate = extractAnswerQualityGate(
          response.context_used as unknown as Record<string, unknown> | undefined
        )
        const speechDecision = resolveOrbVoiceSpeechDecision({
          writtenAnswer: displayAnswer,
          userMessageHint: trimmed,
          voiceRepliesEnabled: voiceSettings.voiceReplies,
          privacyMode: voiceSettings.privacyMode,
          lowSensoryMode: a11yPrefs.lowSensoryMode,
          expertDepth: intelCore?.expert_depth,
          careRelevanceScore: intelCore?.care_relevance_score,
          qualityGate,
          core: intelCore,
          mode,
          urgentSafeguarding: showUrgentSafeguardingBanner,
          spokenAnswerLength: voiceSettings.spokenAnswerLength,
          sensitiveSpokenRepliesEnabled: voiceSettings.sensitiveSpokenReplies
        })
        if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voice.synthesisAvailable && speechDecision.allowAutoSpeak) {
          const spoken = stripMarkdownForSpeech(speechDecision.spokenText || displayAnswer)
          if (spoken.trim()) {
            setSpeakingMessageId(assistantId)
            voice.speak(spoken, () => setSpeakingMessageId(null))
          }
        }
        if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voiceOriginatedSend) {
          voice.clearTranscript()
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

        if (voiceOriginatedSend) {
          const { patchOrbVoiceBrowserDiagnostics } = await import('@/lib/orb/voice/orb-voice-browser-diagnostics')
          markOrbVoiceClientBrainFetch()
          patchOrbVoiceBrowserDiagnostics({ brainRequestAttempted: true, orbBrainAttempted: true })
        }

        const transportResult = await executeOrbConversationTransport({
          request: conversationRequest,
          context: {
            source: voiceOriginatedSend ? 'voice' : 'chat',
            mode
          },
          signal: streamSignal,
          stream: {
            onToken: (_delta, partial) => {
              applyStreamingPartial(partial)
            },
            onStatus: (status) => {
              if (status.expert_depth) {
                setAnsweringDepthHint(status.expert_depth)
              }
              const statusLine = status.message?.trim()
              if (statusLine) {
                setAnsweringStreamStatus(statusLine)
                applyStreamingPartial(streamPartialRef.current, { streamStatus: statusLine })
              }
            },
            onMetadata: (meta) => {
              const responseSources = (
                (meta.citations?.length ? meta.citations : meta.sources) ?? []
              ) as StandaloneOrbSource[]
              const repairedAnswer = (meta.answer || '').trim()
              const answerRepaired =
                meta.answer_repaired ??
                meta.final_answer_repair_applied ??
                Boolean(
                  (meta.context_used as Record<string, unknown> | undefined)?.answer_repaired
                )
              if (repairedAnswer && answerRepaired) {
                streamPartialRef.current = repairedAnswer
              }
              applyStreamingPartial(
                answerRepaired && repairedAnswer ? repairedAnswer : streamPartialRef.current,
                {
                  sources: responseSources.length ? responseSources : undefined,
                  modelRouting: meta.context_used?.model_routing,
                  explainability: buildExplainabilityFromResponse(meta, trimmed || messageBody),
                  contextUsed: meta.context_used
                    ? (meta.context_used as unknown as Record<string, unknown>)
                    : undefined
                }
              )
            }
          },
          runPostFallback: runConversationRequest,
          refreshSession,
          internalRetry: options?.internalRetry
        })
        response = transportResult.response
        if (transportResult.usedPostFallback) {
          traceOrbSend('stream_fallback', { sendGeneration, reason: 'no_tokens' })
        }

        if (!isCurrentSend()) {
          traceOrbSend('request_stale', { sendGeneration })
          return
        }

        if (streamSignal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        traceOrbSend('request_end', { sendGeneration, hasAnswer: Boolean(response.answer) })
        if (voiceOriginatedSend) {
          const { patchOrbVoiceBrowserDiagnostics } = await import('@/lib/orb/voice/orb-voice-browser-diagnostics')
          patchOrbVoiceBrowserDiagnostics({
            orbBrainAttempted: true,
            orbBrainStatus: response.ok === false ? 'failed' : 'success'
          })
        }
        const frontendRequestCompletedAt = Date.now()
        markOrbChatLatency('render_complete')
        logOrbChatLatencySnapshot()
        logOrbTiming('request_end', {
          sendGeneration,
          frontend_request_started_at: frontendRequestStartedAt,
          frontend_request_completed_at: frontendRequestCompletedAt,
          frontend_elapsed_ms: frontendRequestCompletedAt - frontendRequestStartedAt,
          ...(response.context_used?.timing ?? {})
        })

        if (!isCurrentSend() || streamGenerationRef.current !== streamGeneration) return

        setAnsweringStreamStatus(null)
        setAnsweringDepthHint(null)
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
          !parsed.safetyAcceptanceRequired &&
          (isStandaloneOrbSignInPromptMessage(parsed.message) ||
            ((parsed.status === 401 || parsed.status === 403) && !account.hasBackendSession))
        const displayMessage = signInRequired ? parsed.message : parsed.message
        traceOrbSend('request_failed', {
          sendGeneration,
          message: displayMessage,
          status: parsed.status,
          detail: parsed.detail,
          csrfFailed: parsed.csrfFailed
        })
        if (voiceOriginatedSend) {
          const { patchOrbVoiceBrowserDiagnostics } = await import('@/lib/orb/voice/orb-voice-browser-diagnostics')
          markOrbVoiceBrainFetchFailure(displayMessage)
          patchOrbVoiceBrowserDiagnostics({
            orbBrainAttempted: true,
            orbBrainStatus: `failed_${parsed.status ?? 'error'}`
          })
        }
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
          return patchActiveChat(current, chat.id, {
            messages: replaceInFlightWithError(chat.messages, errorMessage)
          })
        })
        requestAbortRef.current?.abort()
        requestAbortRef.current = null
        streamAbortRef.current?.abort()
        streamAbortRef.current = null
        streamPartialRef.current = ''
      } finally {
        if (isCurrentSend()) {
          setPending(false)
          sendInFlightRef.current = false
          traceOrbSend('pending_state', { sendGeneration, pending: false })
        }
        if (!isCurrentSend() || sendGenerationRef.current === sendGeneration) {
          if (requestAbortRef.current?.signal.aborted) requestAbortRef.current = null
          if (streamAbortRef.current?.signal.aborted) streamAbortRef.current = null
        }
      }
    },
    [
      attachments,
      attachedProfiles,
      adultProfile,
      mode,
      account.isSignedIn,
      orbSessionReady,
      pending,
      refreshSession,
      voice,
      voiceSettings.answerStyle,
      voiceSettings.voiceReplies,
      workspace.activeChatId,
      workspace.activeProjectId,
      workspace.chats,
      activePanel
    ]
  )

  useEffect(() => {
    if (!STANDALONE_ORB_VOICE_CAPTURE_ENABLED) return
    if (!voiceSettings.autoSend) return
    if (voice.phase !== 'transcript_ready') return
    const text = (voice.transcript || voice.displayTranscript).trim()
    if (!text || pending || sendInFlightRef.current) return
    if (shouldPauseVoiceAutoSend(text)) return
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    autoSendTimerRef.current = setTimeout(() => {
      void sendMessage(text, { source: 'voice' })
      voiceMayFillComposerRef.current = false
    }, 450)
    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
    }
  }, [
    voice.phase,
    voice.transcript,
    voice.displayTranscript,
    voiceSettings.autoSend,
    pending,
    sendMessage,
    voice.clearTranscript
  ])

  useEffect(() => {
    if (voice.listening || voice.phase === 'transcript_ready') {
      clearComposerSpeechTimeout()
      if (voice.listening) {
        setMicNotice((current) =>
          current && current !== ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE
            ? ORB_COMPOSER_SPEECH_LISTENING_COPY
            : current
        )
      }
    }
  }, [voice.listening, voice.phase])

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
  const orbMicAccess = useMemo(
    () =>
      resolveOrbMicAccessContext({
        subscriptionActive: account.hasConfirmedAccess,
        isAdminUser:
          account.adminBypass || normaliseRole(account.role ?? '') === 'admin',
        developerMode: isOrbDeveloperMode()
      }),
    [account.adminBypass, account.hasConfirmedAccess, account.role]
  )

  useEffect(() => {
    if (!mounted || shouldSkipAuthenticatedOrbFetch()) return
    let cancelled = false
    void isOrbRealtimeVoiceAvailable().then((availability) => {
      if (cancelled) return
      setRealtimeVoiceAvailable(availability.realtimeVoiceAvailable)
    })
    return () => {
      cancelled = true
    }
  }, [mounted])

  const micQueryParam = mounted ? searchParams.get('mic')?.toLowerCase() : null

  const voiceBrowserCapable = voice.recognitionAvailable || voice.synthesisAvailable
  const voiceGenuinelyAvailable =
    orbMicAccess.canUseLiveVoice && (realtimeVoiceAvailable || voiceBrowserCapable)
  const voicePanelUnavailable = !voiceBrowserCapable && !realtimeVoiceAvailable

  const composerMicRoute = useMemo((): 'dictate' | 'voice' => {
    if (micQueryParam === 'dictate') return 'dictate'
    if (micQueryParam === 'voice') return voiceGenuinelyAvailable ? 'voice' : 'dictate'
    return 'dictate'
  }, [micQueryParam, voiceGenuinelyAvailable])

  const composerMicReason = useMemo((): string => {
    if (micQueryParam === 'dictate') return 'forced'
    if (micQueryParam === 'voice') {
      return voiceGenuinelyAvailable ? 'forced' : 'realtime_unavailable'
    }
    if (isSafariBrowser()) return 'safari'
    return 'default'
  }, [micQueryParam, voiceGenuinelyAvailable])

  function handleMicClick() {
    orbMicDevLog('composer mic clicked', `${composerMicRoute}:${composerMicReason}`)
    if (!STANDALONE_ORB_VOICE_CAPTURE_ENABLED || !canUseComposerMic()) {
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

    if (residentialSurface && isMobileViewport) {
      void handleComposerInlineVoice()
      return
    }

    const openVoice = composerMicRoute === 'voice' && voiceGenuinelyAvailable

    if (openVoice) {
      orbMicDevLog('opening voice')
      openOrbVoicePanel()
      return
    }

    emitOrbClientDebug({ area: 'composer', event: 'composer_mic_clicked', detail: { route: composerMicRoute, reason: composerMicReason } })
    orbMicDevLog('opening dictate', composerMicReason)
    openOrbDictatePanel()
    setMicNotice('Dictate is open — tap Start recording when you are ready.')
    window.setTimeout(() => setMicNotice(null), 8000)
  }

  function clearComposerSpeechTimeout() {
    if (composerSpeechTimeoutRef.current) {
      clearTimeout(composerSpeechTimeoutRef.current)
      composerSpeechTimeoutRef.current = null
    }
  }

  function armComposerSpeechTimeout() {
    clearComposerSpeechTimeout()
    composerSpeechTimeoutRef.current = setTimeout(() => {
      if (voice.listening || voice.phase === 'transcript_ready') return
      setMicNotice(ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE)
    }, ORB_COMPOSER_SPEECH_START_TIMEOUT_MS)
  }

  async function handleComposerInlineVoice() {
    if (!STANDALONE_ORB_VOICE_CAPTURE_ENABLED || !canUseComposerMic()) {
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
      clearComposerSpeechTimeout()
      return
    }

    voiceMayFillComposerRef.current = true
    composerUserEditedRef.current = false
    emitOrbClientDebug({ area: 'composer', event: 'composer_inline_voice_start' })

    const preferDictate = shouldComposerPreferDictateFallback({
      safari: isSafariBrowser(),
      recognitionAvailable: voice.recognitionAvailable
    })

    if (!voice.recognitionAvailable) {
      setMicNotice(ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE)
      return
    }

    setMicNotice(
      composerSpeechImmediateStatus({
        recognitionAvailable: voice.recognitionAvailable,
        preferDictate
      })
    )
    armComposerSpeechTimeout()

    const started = await voice.beginUserVoiceCapture({ mode: 'continuous' })
    if (!started) {
      clearComposerSpeechTimeout()
      setMicNotice(orbComposerSpeechFallbackMessage(voice.error))
      return
    }
    clearComposerSpeechTimeout()
    setMicNotice(voice.listening ? ORB_COMPOSER_SPEECH_LISTENING_COPY : null)
  }

  function handleComposerPrimaryAction() {
    if (voice.listening) {
      voice.stopListening()
      clearComposerSpeechTimeout()
      return
    }
    setMicNotice(ORB_COMPOSER_SPEECH_OPENING_MIC_COPY)
    void handleComposerInlineVoice()
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

  function startOrbSkill(skill: OrbSkillDefinition) {
    if (skill.mode) handleModeChange(skill.mode as StandaloneOrbMode)
    setMessage(skill.starterPrompt)
    closePanel()
    inputRef.current?.focus()
  }

  function runQualityReview(payload: { prompt: string }) {
    void sendMessage(payload.prompt)
    inputRef.current?.focus()
  }

  function runPracticeWorkspace(payload: { prompt: string; mode: StandaloneOrbMode }) {
    handleModeChange(payload.mode)
    void sendMessage(payload.prompt)
    inputRef.current?.focus()
  }

  function applyConvergenceRoute(
    panelId: OrbDeprecatedPrimaryNavPanelId,
    opts?: { showRedirectCard?: boolean }
  ) {
    const route = resolveConvergedNavigation(panelId)
    if (opts?.showRedirectCard) {
      setConvergenceRedirectPanel(panelId)
      return
    }
    setConvergenceNotice(route.message)
    const destination = route.destination
    if (destination.kind === 'chat') {
      if (destination.mode) handleModeChange(destination.mode)
      closePanel()
      void sendMessage(destination.prompt)
      inputRef.current?.focus()
      return
    }
    if (route.documentLens) setDocumentImportLens(route.documentLens)
    if (route.templatesSearch) setTemplatesImportSearch(route.templatesSearch)
    if (route.templatesRecordTypeId) setDocumentImportRecordTypeId(route.templatesRecordTypeId)
    switch (destination.station) {
      case 'templates':
        openTemplatesPanel()
        break
      case 'orb_write':
        openOrbWritePanel()
        break
      case 'documents':
        openDocumentsPanel()
        break
      case 'orb_dictate':
        openOrbDictatePanel()
        break
      default:
        break
    }
    setSidebarOpen(false)
  }

  function openResidentialStation(station: OrbResidentialStationId | string) {
    if (residentialSurface && isDeprecatedPrimaryNavPanel(station)) {
      applyConvergenceRoute(station, { showRedirectCard: true })
      return
    }
    switch (station as OrbResidentialStationId) {
      case 'review':
        if (residentialSurface) {
          applyConvergenceRoute('review', { showRedirectCard: true })
          break
        }
        openReviewPanel()
        break
      case 'skills':
        openSkillsPanel()
        break
      case 'templates':
        openTemplatesPanel()
        break
      case 'knowledge':
        if (residentialSurface) {
          applyConvergenceRoute('knowledge', { showRedirectCard: true })
          break
        }
        openKnowledgeLibrary()
        break
      case 'saved':
        openSavedOutputsPanel()
        break
      case 'documents':
        openDocumentsPanel()
        break
      case 'shift_builder':
        if (residentialSurface) {
          applyConvergenceRoute('shift_builder', { showRedirectCard: true })
          break
        }
        openShiftBuilderPanel()
        break
      case 'orb_voice':
        openOrbVoicePanel()
        break
      case 'orb_dictate':
        openOrbDictatePanel()
        break
      case 'orb_write':
        openOrbWritePanel()
        break
      default:
        if (
          residentialSurface &&
          (station === 'inspection_readiness' ||
            station === 'safeguarding_thinking' ||
            station === 'record_properly')
        ) {
          applyConvergenceRoute(station as OrbDeprecatedPrimaryNavPanelId, { showRedirectCard: true })
        }
        break
    }
    setSidebarOpen(false)
  }

  function openPracticePanel(panel: OrbResidentialPracticePanelId) {
    if (residentialSurface) {
      applyConvergenceRoute(practicePanelToDeprecatedId(panel), { showRedirectCard: true })
      return
    }
    openPracticePanelDirect(panel)
  }

  function handleComposerPlusAction(action: OrbComposerPlusAction) {
    switch (action) {
      case 'upload_document':
        openDocumentsPanel()
        break
      case 'attach_image':
      case 'attach_photo':
      case 'photo_library':
      case 'take_photo':
      case 'choose_files':
        break
      case 'review_text':
        setMessage(
          'Review this text for safeguarding, child voice, recording quality and Inspection evidence preparation:\n\n'
        )
        closePanel()
        inputRef.current?.focus()
        break
      case 'use_template':
        if (residentialSurface && isMobileViewport) {
          setComposerRecordTypePickerOpen(true)
          break
        }
        openTemplatesPanel()
        break
      case 'knowledge':
        if (residentialSurface) {
          applyConvergenceRoute('knowledge')
          break
        }
        openKnowledgeLibrary()
        break
      case 'orb_voice':
        openOrbVoicePanel()
        break
      case 'orb_dictate':
        openOrbDictatePanel()
        break
      case 'orb_write':
        openOrbWritePanel()
        break
      case 'privacy_guidance':
        break
      case 'learning_session':
        setMessage('Create a 5-minute staff learning session from this topic with discussion questions:\n\n')
        closePanel()
        void sendMessage(
          'Create a 5-minute staff learning session for residential childcare staff with clear objectives, discussion questions and a short knowledge check.'
        )
        break
      case 'saved_outputs':
        openSavedOutputsPanel()
        break
      default:
        break
    }
  }

  useEffect(() => {
    if (!convergenceNotice) return
    const timer = window.setTimeout(() => setConvergenceNotice(null), 8000)
    return () => window.clearTimeout(timer)
  }, [convergenceNotice])

  useEffect(() => {
    if (!residentialSurface || !mounted) return
    const stationParam = searchParams.get('station')
    const station = (
      stationParam === 'dictate'
        ? 'orb_dictate'
        : stationParam === 'write'
          ? 'orb_write'
          : stationParam
    ) as OrbResidentialStationId | null
    const lens = searchParams.get('lens')
    if (station) openResidentialStation(station)
    else if (lens === 'ofsted' || lens === 'inspection') handleModeChange('Ofsted Lens')
    else if (lens === 'safeguarding') handleModeChange('Safeguarding Thinking')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when URL station/lens changes
  }, [mounted, residentialSurface, searchParams])

  useEffect(() => {
    if (!residentialSurface || !mounted) return
    if (searchParams.get('guided_demo') === '1') {
      const started = startOrbGuidedDemo()
      setGuidedDemoState(started)
      setGuidedDemoPanelOpen(true)
    }
  }, [mounted, residentialSurface, searchParams.get('guided_demo')])

  useEffect(() => {
    if (!residentialSurface || !mounted) return
    setGuidedDemoState(readOrbGuidedDemoState())
  }, [mounted, residentialSurface])

  useEffect(() => {
    if (!residentialSurface || !mounted) return
    const mic = searchParams.get('mic')?.toLowerCase()
    if (mic === 'dictate') {
      openOrbDictatePanel()
    } else if (mic === 'voice') {
      if (realtimeVoiceAvailable && orbMicAccess.canUseLiveVoice) openOrbVoicePanel()
      else openOrbDictatePanel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link once URL mic param is present
  }, [mounted, residentialSurface, searchParams.get('mic')])

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
    clearComposerAttachments()
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
    clearComposerAttachments()
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
    clearComposerAttachments()
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
    const promptText =
      residentialSurface && 'prompt' in entry
        ? residentialStarterPrompt(entry as ResidentialStarter)
        : entry.text
    setMessage(promptText)
    if (entry.mode) handleModeChange(entry.mode)
    inputRef.current?.focus()
    setSidebarOpen(false)
  }

  const handleGuidedDemoStart = useCallback(() => {
    const started = startOrbGuidedDemo()
    setGuidedDemoState(started)
    setGuidedDemoPanelOpen(true)
  }, [])

  const handleGuidedDemoAdvance = useCallback(() => {
    setGuidedDemoState((current) => {
      const next = advanceOrbGuidedDemoStep(current)
      return next
    })
  }, [])

  const handleGuidedDemoExit = useCallback(() => {
    clearOrbGuidedDemoState()
    setGuidedDemoState({ active: false, stepIndex: 0, startedAt: 0 })
    setGuidedDemoPanelOpen(false)
  }, [])

  const handleGuidedDemoPrimaryAction = useCallback(
    (step: OrbGuidedDemoStep) => {
      switch (step.id) {
        case 'chat':
          openChatPanel()
          setMessage(orbGuidedDemoChatPrompt())
          inputRef.current?.focus()
          break
        case 'dictate':
          openOrbDictatePanel({ transcript: orbGuidedDemoDictateNotes(), studio: true })
          break
        case 'write':
          markOrbGuidedDemoSaveHint()
          openOrbWriteWithContent({
            content: orbGuidedDemoWriteSeed(),
            source: 'unknown',
            sourceLabel: 'Guided demo',
            recordTypeId: 'daily_record',
            title: orbGuidedDemoSaveTitle('Daily record draft')
          })
          break
        case 'records':
          markOrbGuidedDemoSaveHint()
          openSavedOutputsPanel()
          break
        case 'request_demo':
          window.open(ORB_REQUEST_DEMO_URL, '_blank', 'noopener,noreferrer')
          handleGuidedDemoExit()
          return
      }
      setGuidedDemoState((current) => advanceOrbGuidedDemoStep(current))
      setGuidedDemoPanelOpen(false)
    },
    [
      handleGuidedDemoExit,
      openChatPanel,
      openOrbDictatePanel,
      openOrbWriteWithContent,
      openSavedOutputsPanel
    ]
  )

  async function handleDraftWording(text: string) {
    await copyToClipboard(text)
    setDraftNotice('Copied as draft wording. Review before using in records.')
    setTimeout(() => setDraftNotice(null), 5000)
  }

  const handleStopGeneration = useCallback(() => {
    if (!pending && !sendInFlightRef.current) return
    traceOrbSend('request_abort', { reason: 'user_stop' })
    requestAbortRef.current?.abort()
    requestAbortRef.current = null
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    streamPartialRef.current = ''
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
      summarise: 'Summarise what you can see in the image(s) I shared. ORB Residential only — no IndiCare OS records.',
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
            'ORB Residential action — based only on provided text, not IndiCare OS records.'
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
      setDraftNotice(`${result.title} — ORB Residential action (not an OS record).`)
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

  const documentPanelLensLabel = useMemo(() => {
    if (!documentPanelResult) return ''
    return (
      RESIDENTIAL_FIRST_CLASS_LENSES.find((item) => item.lens === documentPanelResult.lens)?.label ||
      documentPanelResult.lens.replace(/_/g, ' ')
    )
  }, [documentPanelResult])

  const documentDesktopContextPanel =
    residentialSurface && documentPanelResult && !isMobileViewport ? (
      <OrbDocumentContextPanel
        result={documentPanelResult}
        documentTitle={
          pendingDocument?.title ||
          documentPanelResult.source_document_title ||
          documentPanelResult.title
        }
        lensLabel={documentPanelLensLabel}
        onAskOrb={() => {
          const docTitle =
            pendingDocument?.title ||
            documentPanelResult.source_document_title ||
            documentPanelResult.title
          const displayTitle = documentIntelligenceDisplayTitle(
            documentPanelResult.lens,
            docTitle
          )
          const markdown = formatDocumentIntelligenceMarkdown({
            ...documentPanelResult,
            title: displayTitle
          })
          setMessage(
            `Ask ORB about this document (${documentPanelLensLabel} — ${docTitle}):\n\n${markdown.slice(0, 1200)}`
          )
          closePanel()
          inputRef.current?.focus()
        }}
        onCopy={() => setDraftNotice('Document output copied.')}
        onExport={() => setDraftNotice('Document exported as markdown.')}
      />
    ) : null

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
        lens: lens as import('@/lib/orb/standalone-client').OrbDocumentLens,
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
      const isAction =
        entry.outputKind === 'actions' ||
        entry.outputKind === 'action_plan' ||
        Boolean(entry.feedbackContext?.action_id)
      await createOrbSavedOutput(
        buildSavedOutputCreateBody({
          title: savedTitle,
          type: isAction ? 'action_plan' : 'general_research',
          project_id: workspace.activeProjectId,
          project_name: activeProject?.name,
          summary: entry.content.slice(0, 800),
          content_markdown: entry.content,
          intelligence_output: {
            title: savedTitle,
            summary: entry.content.slice(0, 2000),
            type: entry.outputKind || 'answer'
          },
          sources: entry.sources,
          created_from: isAction ? 'action_engine' : 'chat',
          created_from_id: entry.id,
          extras: {
            source_feature: isAction ? 'action_engine' : 'chat',
            source_text: entry.content,
            action_id: entry.feedbackContext?.action_id,
            lens: entry.feedbackContext?.document_lens
          }
        })
      )
      setSavedOutputMessageIds((current) => new Set(current).add(entry.id))
      setSaveFeedbackByMessageId((current) => ({ ...current, [entry.id]: 'saved' }))
      setDraftNotice('Saved — ORB Residential artefact (not an OS record).')
      const summary = await fetchOrbSavedOutputsSummaryResilient()
      setSavedOutputsCount(summary.total || 0)
    } catch {
      setSaveFeedbackByMessageId((current) => ({ ...current, [entry.id]: 'failed' }))
      await copyToClipboard(entry.content)
      setDraftNotice('Save failed — copied to clipboard instead.')
    }
  }

  function addComposerFiles(files: FileList | File[]) {
    const list = Array.from(files)
    const next: OrbComposerAttachment[] = []
    let imageCount = attachments.filter((item) => item.kind === 'image').length
    let documentCount = attachments.filter((item) => item.kind === 'document').length
    for (const file of list) {
      const attachment = composerAttachmentFromFile(file)
      if (!attachment) {
        setDraftNotice(ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE)
        continue
      }
      if (attachment.kind === 'image') {
        if (imageCount >= MAX_IMAGE_ATTACHMENTS) continue
        imageCount += 1
      }
      if (attachment.kind === 'document') {
        if (documentCount >= ORB_COMPOSER_MAX_DOCUMENT_ATTACHMENTS) {
          setDraftNotice('One document at a time in chat. Remove the current file to add another.')
          revokeComposerAttachmentPreview(attachment)
          continue
        }
        documentCount += 1
      }
      next.push(attachment)
    }
    if (!next.length) return
    setAttachments((current) => [...current, ...next].slice(0, MAX_IMAGE_ATTACHMENTS + ORB_COMPOSER_MAX_DOCUMENT_ATTACHMENTS))
  }

  function clearComposerAttachments() {
    setAttachments((current) => {
      current.forEach((item) => revokeComposerAttachmentPreview(item))
      return []
    })
  }

  function removeComposerAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id)
      if (target) revokeComposerAttachmentPreview(target)
      return current.filter((item) => item.id !== id)
    })
  }

  const attachmentsRef = useRef(attachments)
  attachmentsRef.current = attachments

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => revokeComposerAttachmentPreview(item))
    }
  }, [])

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
      void addComposerFiles(imageFiles)
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer.files?.length) void addComposerFiles(event.dataTransfer.files)
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

  const answeringExpertDepth = useMemo(() => {
    if (isAnswering && answeringDepthHint) return answeringDepthHint
    const modeKey = mode.trim().toLowerCase()
    if (modeKey.includes('safeguarding')) return 'safeguarding_critical'
    if (modeKey.includes('record')) return 'residential_deep'
    if (modeKey.includes('ofsted') || modeKey.includes('manager') || modeKey.includes('staff coach')) {
      return 'residential_light'
    }
    const lastAssistant = [...visibleMessages].reverse().find((m) => m.role === 'assistant' && m.contextUsed)
    const fromCore = lastAssistant?.contextUsed
      ? extractIndicareIntelligenceCore(lastAssistant.contextUsed as Record<string, unknown>)?.expert_depth
      : undefined
    return fromCore || 'general_light'
  }, [mode, visibleMessages, isAnswering, answeringDepthHint])

  const composer = (
    <div
      className={`orb-composer-dock flex-none border-t border-transparent pt-2 ${
        residentialSurface && showEmptyState ? 'orb-composer-dock--empty' : ''
      }`}
      data-orb-composer="main"
      data-orb-composer-mounted="true"
    >
      {documentLensActions.length ? (
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <OrbDocumentContextChips
            actions={documentLensActions}
            onSelect={(lens) => void runDocumentLens(lens as OrbDocumentLens)}
          />
        </div>
      ) : null}
      <OrbIntelligenceMicroStatus
        active={isAnswering}
        expertDepth={answeringExpertDepth}
        backendMessage={answeringStreamStatus}
      />
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
        voiceCaptureEnabled: STANDALONE_ORB_VOICE_CAPTURE_ENABLED,
        mobileInlineVoice: residentialSurface && isMobileViewport
      })}
      transcriptReady={STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voice.phase === 'transcript_ready'}
      displayTranscript={voice.displayTranscript}
      autoSend={
        STANDALONE_ORB_VOICE_CAPTURE_ENABLED &&
        voiceSettings.autoSend &&
        !shouldPauseVoiceAutoSend((voice.transcript || voice.displayTranscript).trim())
      }
      onChange={handleMessageChange}
      onSubmit={handleComposerSubmit}
      composerMicEnabled={canUseComposerMic()}
      composerMicRoute={composerMicRoute}
      composerMicReason={composerMicReason}
      composerMicAriaLabel={
        composerMicRoute === 'voice' ? 'Open ORB Voice' : 'Open ORB Dictate and record'
      }
      composerMicTitle={
        composerMicRoute === 'voice'
          ? 'Open ORB Voice for live conversation'
          : 'Open ORB Dictate and start recording'
      }
      onMicClick={handleMicClick}
      onComposerPrimaryAction={residentialSurface && isMobileViewport ? handleComposerPrimaryAction : undefined}
      composerInlineVoiceEnabled={residentialSurface && isMobileViewport}
      onVoiceClick={residentialSurface ? openOrbVoicePanel : undefined}
      voicePanelUnavailable={residentialSurface ? voicePanelUnavailable : false}
      onCancelListening={voice.cancelListening}
      onStopSpeaking={voice.cancelSpeaking}
      onSendTranscript={() => void sendMessage(voice.transcript || voice.displayTranscript)}
      onRetryTranscript={() => {
        voice.clearTranscript()
        if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED) voice.startListening()
      }}
      onAddFiles={addComposerFiles}
      onRemoveAttachment={removeComposerAttachment}
      onUnsupportedFile={() => setDraftNotice(ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE)}
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
      agentLabel={residentialSurface ? undefined : activeAgent?.title ?? 'Ask ORB'}
      onAgentSelectorClick={residentialSurface ? undefined : () => setAgentsPanelOpen(true)}
      answering={isAnswering}
      onStopGenerating={isAnswering ? handleStopGeneration : undefined}
      residentialSurface={residentialSurface}
      mobileViewport={isMobileViewport}
      chatHasMessages={visibleMessages.length > 0}
      onPlusMenuAction={residentialSurface ? handleComposerPlusAction : undefined}
      onOpenDictateFallback={
        residentialSurface && isMobileViewport
          ? () => {
              setMicNotice(null)
              openOrbDictatePanel()
            }
          : undefined
      }
      inlineVoiceShowDictateFallback={Boolean(residentialSurface && isMobileViewport && micNotice)}
      composerPlaceholder={
        residentialSurface
          ? showEmptyState
            ? ORB_COMPOSER_V2_PLACEHOLDER_HOME
            : ORB_COMPOSER_V2_PLACEHOLDER_CHAT
          : undefined
      }
    />
    {residentialSurface && showEmptyState && !isMobileViewport ? (
      <div className="orb-workspace-starters" data-orb-workspace-starters>
        {ORB_RESIDENTIAL_EMPTY_STARTERS.map((starter) => (
          <button
            key={starter.text}
            type="button"
            onClick={() => applyPrompt(starter)}
            className="orb-workspace-starter"
            data-orb-starter-card
            data-orb-starter-suggestion-card="true"
          >
            {starter.text}
          </button>
        ))}
      </div>
    ) : null}
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
    if (residentialSurface) {
      const starters = isMobileViewport
        ? ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTERS
        : ORB_RESIDENTIAL_EMPTY_STARTERS
      return isMobileViewport
        ? starters
        : starters.slice(0, ORB_RESIDENTIAL_PRIMARY_STARTER_COUNT)
    }
    if (adultProfile?.name || adultProfile?.role !== 'residential_support_worker') {
      return roleBasedEmptyStarters(adultProfile ?? readAdultProfile()).map((text) => ({ text }))
    }
    return PRIMARY_EMPTY_STARTERS
  }, [adultProfile, isMobileViewport, residentialSurface])

  const emptyWelcome = useMemo(() => {
    const profile = adultProfile ?? readAdultProfile()
    return personalisedWelcomeMessage(profile, { temporary: Boolean(activeChat?.temporary) })
  }, [adultProfile, activeChat?.temporary])

  const emptyHeadingMobile = useMemo(() => {
    if (residentialSurface) {
      return isMobileViewport
        ? ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING
        : personalisedEmptyHeading(adultProfile ?? readAdultProfile())
    }
    return emptyWelcome.heading || (adultProfile ? personalisedEmptyHeading(adultProfile) : 'Ready when you are.')
  }, [adultProfile, emptyWelcome.heading, isMobileViewport, residentialSurface])

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
  const effectiveTheme = residentialSurface ? 'light' : resolvedTheme
  const themeClass = effectiveTheme === 'light' ? 'orb-theme-light' : 'orb-theme-dark'

  const renderResidentialCorePanels = () => (
    <>
      <OrbKnowledgeLibraryPanel
        open={activePanel === 'knowledge'}
        onClose={closePanel}
        residentialSurface={residentialSurface}
        sessionReady={orbSessionReady}
        onAskOrb={(prompt) => {
          setMessage(prompt)
          closePanel()
          inputRef.current?.focus()
        }}
      />
      <OrbTemplatesPanel
        open={activePanel === 'templates'}
        onClose={() => {
          setTemplatesImportSearch('')
          closePanel()
        }}
        initialSearch={templatesImportSearch}
        residentialSurface={residentialSurface}
        sessionReady={orbSessionReady}
        onUseTemplate={(prompt) => {
          closePanel()
          void sendMessage(prompt)
        }}
        onRecordingAction={handleRecordingLibraryAction}
      />
      <OrbSavedOutputsPanel
        open={activePanel === 'saved_outputs'}
        onClose={closePanel}
        residentialSurface={residentialSurface}
        sessionReady={orbSessionReady}
        workspace={workspace}
        onReuseInChat={(prompt) => {
          setMessage(prompt)
          closePanel()
          inputRef.current?.focus()
        }}
        onAskOrb={(prompt) => {
          setMessage(prompt)
          closePanel()
          inputRef.current?.focus()
        }}
        onSendToDictate={(text) => {
          openOrbDictatePanel({ transcript: text })
        }}
        onStartInOrbWrite={() => {
          closePanel()
          openOrbWritePanel()
        }}
        onOpenSavedOutputInOrbWrite={(record) => {
          handoffSavedOutputToOrbWrite(record)
          closePanel()
          openOrbWritePanel()
        }}
        onStartInDictate={() => {
          closePanel()
          openOrbDictatePanel()
        }}
        onStartInChat={() => {
          closePanel()
          openChatPanel()
        }}
        onStartInDocuments={() => {
          closePanel()
          openDocumentsPanel()
        }}
        guidedDemoActive={residentialSurface && guidedDemoState.active}
        onOpenGuidedDemo={() => {
          closePanel()
          setGuidedDemoPanelOpen(true)
        }}
        onUseInShiftBuilder={(notes, focus) => {
          setShiftImportNotes(notes)
          setShiftImportFocus(
            focus as import('@/lib/orb/shift-builder').OrbShiftBuilderFocus | undefined
          )
          openShiftBuilderPanel()
        }}
        onRerun={(state: OrbSavedOutputRerunState) => {
          if (!state.available) return
          if (state.kind === 'document_lens' || state.kind === 'policy_card') {
            setDocumentImportText(state.sourceText)
            setDocumentImportLens(state.lens as OrbDocumentLens)
            openDocumentsPanel()
            return
          }
          if (state.kind === 'shift_focus') {
            setShiftImportNotes(state.sourceText)
            setShiftImportFocus(state.focus)
            openShiftBuilderPanel()
            return
          }
          if (state.kind === 'action_engine' && state.actionId && state.sourceText) {
            void runBackendOrbAction(state.actionId, state.sourceText, undefined, state.actionId)
            closePanel()
          }
        }}
      />
      <OrbReviewPanel
        open={activePanel === 'review'}
        onClose={closePanel}
        onRunReview={runQualityReview}
        residentialSurface={residentialSurface}
      />
      <OrbInspectionReadinessPanel
        open={activePanel === 'inspection_readiness'}
        onClose={closePanel}
        onRun={runPracticeWorkspace}
        residentialSurface={residentialSurface}
      />
      <OrbSafeguardingThinkingPanel
        open={activePanel === 'safeguarding_thinking'}
        onClose={closePanel}
        onRun={runPracticeWorkspace}
        residentialSurface={residentialSurface}
      />
      <OrbRecordProperlyPanel
        open={activePanel === 'record_properly'}
        onClose={closePanel}
        onRun={runPracticeWorkspace}
        residentialSurface={residentialSurface}
      />
      <OrbSkillsPanel
        open={activePanel === 'skills'}
        onClose={closePanel}
        onStartSkill={startOrbSkill}
        residentialSurface={residentialSurface}
      />
      <OrbDocumentPanel
        open={activePanel === 'documents'}
        onClose={() => {
          setDocumentImportRecordTypeId(undefined)
          setDocumentImportLens(undefined)
          closePanel()
        }}
        residentialSurface={residentialSurface}
        initialText={documentImportText}
        initialLens={documentImportLens}
        initialRecordTypeId={documentImportRecordTypeId}
        onOpenOrbWrite={(handoff) => {
          if (handoff?.content) {
            convergedHandoffToOrbWrite({
              content: handoff.content,
              source: 'document',
              sourceLabel: `Documents & Guidance — ${handoff.outputType.replace(/_/g, ' ')}`,
              title: handoff.title,
              recordTypeId: handoff.recordTypeId,
              suggestedOutputType: handoff.outputType
            })
          }
          openOrbWritePanel()
        }}
        onOpenTemplates={openTemplatesPanel}
        projects={workspace.projects}
        activeProjectId={workspace.activeProjectId}
        activeProjectName={activeProject?.name}
        onIntelligenceResult={setDocumentPanelResult}
        onReuseInChat={(prompt) => {
          setMessage(prompt)
          closePanel()
        }}
        onInsertIntoChat={(text) => {
          setMessage(text)
          closePanel()
        }}
        onAskOrbAboutDocument={({ markdown, title }) => {
          setMessage(`Ask ORB about this document (${title}):\n\n${markdown.slice(0, 1200)}`)
          closePanel()
          inputRef.current?.focus()
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
      <OrbShiftBuilderPanel
        open={activePanel === 'shift_builder'}
        onClose={closePanel}
        residentialSurface={residentialSurface}
        initialNotes={shiftImportNotes}
        initialFocus={shiftImportFocus}
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
        onAskOrbImprove={(markdown, title) => {
          setMessage(`Ask ORB to improve this shift plan (${title}):\n\n${markdown.slice(0, 2000)}`)
          closePanel()
          inputRef.current?.focus()
        }}
        onOpenDictate={(transcript) => openOrbDictatePanel({ transcript })}
        onOpenSavedOutputs={openSavedOutputsPanel}
      />
      <OrbVoiceStation
        open={activePanel === 'orb_voice'}
        onClose={closePanel}
        voice={voice}
        pending={pending}
        subscriptionActive={account.hasConfirmedAccess}
        isSignedIn={account.hasBackendSession}
        isAdminUser={account.adminBypass || normaliseRole(account.role ?? '') === 'admin'}
        assistantReply={voiceStationAssistant?.text ?? null}
        assistantReplyKey={voiceStationAssistant?.key ?? null}
        assistantReplyUserHint={voiceStationAssistant?.userHint ?? null}
        assistantReplyContext={voiceStationAssistant?.contextUsed ?? null}
        onSendToOrb={(text) => void sendMessage(text, { source: 'voice' })}
        onSignIn={() => {
          window.location.href = account.signInUrl
        }}
        onTypeInstead={() => {
          closePanel()
          inputRef.current?.focus()
        }}
        onOpenDictate={(transcript, noteType, opts) =>
          openOrbDictatePanel({
            transcript,
            noteType,
            studio: opts?.studio
          })
        }
        onOpenWrite={(content, opts) =>
          openOrbWriteWithContent({
            content,
            source: 'voice',
            sourceLabel: opts?.title ?? 'ORB Voice conversation',
            title: opts?.title ?? 'ORB Voice conversation',
            recordTypeId: opts?.recordTypeId
          })
        }
        onOpenVoiceSettings={openVoiceSettings}
      />
      <OrbDictateStation
        open={activePanel === 'orb_dictate'}
        onClose={() => {
          setDictateImportTranscript(undefined)
          setDictateImportNoteType(undefined)
          setDictateImportStudio(false)
          setDictateImportStudioTemplateId(undefined)
          closePanel()
        }}
        voice={voice}
        initialTranscript={dictateImportTranscript}
        initialNoteType={dictateImportNoteType}
        initialStudio={dictateImportStudio}
        initialStudioTemplateId={dictateImportStudioTemplateId}
        onSendToChat={(text) => void sendMessage(text)}
        onOpenOrbVoice={openOrbVoicePanel}
        onOpenTemplates={residentialSurface && isMobileViewport ? undefined : openTemplatesPanel}
      />
      <OrbWriteStandalonePanel
        open={activePanel === 'orb_write'}
        onClose={closePanel}
        onOpenTemplates={openTemplatesPanel}
        onOpenDictate={() => openOrbDictatePanel()}
        onOpenSavedOutputs={openSavedOutputsPanel}
      />
      <OrbWriteTemplatePicker
        open={composerRecordTypePickerOpen}
        currentRecordTypeId="general_dictation"
        hasExistingContent={false}
        onClose={() => setComposerRecordTypePickerOpen(false)}
        onApply={({
          recordType,
          mode
        }: {
          recordType: OrbRecordingRecordType
          mode: OrbWriteTemplateApplyMode
        }) => {
          if (mode === 'style_guidance') {
            setComposerRecordTypePickerOpen(false)
            return
          }
          convergedTemplateHandoff(recordType, {
            structuredBody: buildOrbWriteTemplateSectionBody(recordType)
          })
          setComposerRecordTypePickerOpen(false)
          openOrbWritePanel()
        }}
      />
    </>
  )

  return (
    <main
      className={`orb-app-shell orb-chat-layout relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden ${layoutA11yClass} ${atmosphereClass} ${themeClass} ${isAnswering ? 'orb-response-active' : ''} ${residentialSurface ? 'orb-chat-layout--residential' : ''} ${isMobileViewport ? ORB_MOBILE_SHELL_CLASS : ''}`}
      data-orb-shell={residentialSurface ? 'residential' : undefined}
      data-orb-companion-root="true"
      data-orb-theme={effectiveTheme}
      data-orb-appearance={appearanceMode}
      {...(residentialSurface ? { 'data-orb-residential': 'true' as const } : {})}
      data-orb-residential-surface={residentialSurface ? 'true' : undefined}
      data-orb-home-empty={residentialSurface && showEmptyState ? 'true' : undefined}
      data-orb-light-ui-build={ORB_LIGHT_UI_BUILD}
      data-orb-appearance-mode={appearanceMode}
      data-orb-system-theme={effectiveTheme}
      data-orb-mobile-shell={isMobileViewport ? 'true' : undefined}
      data-orb-mobile-surface={isMobileViewport && residentialSurface ? 'true' : undefined}
      data-orb-chat-layout={isMobileViewport ? 'mobile' : 'desktop'}
      data-orb-active-panel={activePanel || 'none'}
      data-orb-close-all-panels
      data-orb-text-first-chat="true"
      data-orb-agent={activeAgent?.id ?? 'ask_orb'}
      data-orb-cognition-state={cognitionAmbientState}
    >
      <span className="sr-only">{ORB_PRODUCT_NAME} — {ORB_DATA_BOUNDARY}</span>
      <OrbUiAuditBootstrap />
      <OrbAmbientCognition
        state={cognitionAmbientState}
        agentAtmosphere={atmosphereClass}
        reducedMotion={a11yPrefs.reducedMotion}
      />
      {effectiveTheme === 'dark' ? (
        <div className="pointer-events-none fixed inset-0 orb-cinematic-light-field opacity-35" aria-hidden />
      ) : null}

      <OrbBillingModal
        open={activePanel === 'billing'}
        onClose={closePanel}
        userName={account.userName}
        userEmail={account.userEmail}
        avatarUrl={account.avatarUrl}
      />
      {convergenceRedirectPanel ? (
        <OrbConvergedPanelRedirect
          panelId={convergenceRedirectPanel}
          onContinue={() => {
            const panel = convergenceRedirectPanel
            setConvergenceRedirectPanel(null)
            applyConvergenceRoute(panel)
          }}
          onDismiss={() => setConvergenceRedirectPanel(null)}
        />
      ) : null}
      {!residentialSurface ? renderResidentialCorePanels() : null}
      <OrbStandaloneSettingsPanel
        open={activePanel === 'settings'}
        initialSection={settingsInitialSection}
        residentialSurface={residentialSurface}
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
        onVoiceInputChange={(enabled) => {
          if (enabled && voice.recognitionAvailable) {
            setMicNotice(null)
          } else if (enabled) {
            setMicNotice(VOICE_MODE_COMING_SOON)
          }
        }}
        voiceRepliesEnabled={voiceSettings.voiceReplies}
        onVoiceRepliesChange={(enabled) => voice.setVoiceReplies(enabled)}
        onOpenVoiceSettings={openVoiceSettings}
        onOpenOrbVoice={residentialSurface ? openOrbVoicePanel : undefined}
        onOpenProfile={openResidentialProfile}
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
        userName={account.userName}
        userEmail={account.userEmail}
        avatarUrl={account.avatarUrl}
      />
      <OrbHelpPanel open={activePanel === 'help'} onClose={closePanel} />
      {residentialSurface && guidedDemoPanelOpen && guidedDemoState.active ? (
        <OrbGuidedDemoPanel
          stepIndex={guidedDemoState.stepIndex}
          onPrimaryAction={handleGuidedDemoPrimaryAction}
          onAdvance={handleGuidedDemoAdvance}
          onClose={() => setGuidedDemoPanelOpen(false)}
          onExit={handleGuidedDemoExit}
        />
      ) : null}
      <OrbVoiceSettingsPanel
        open={activePanel === 'voice'}
        onClose={closePanel}
        onOpenOrbVoice={residentialSurface ? openOrbVoicePanel : undefined}
      />
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

      <OrbLayout
        residentialSurface={residentialSurface}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onCloseSidebarOverlay={() => setSidebarOpen(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        guidedDemoActive={residentialSurface && guidedDemoState.active}
        sidebar={
          residentialSurface ? (
            <OrbResidentialSidebar
              workspace={workspace}
              chatSearch={chatSearch}
              onChatSearchChange={setChatSearch}
              onSelectChat={selectChat}
              onNewChat={(projectId) => startNewChat(projectId)}
              onSelectProject={(projectId) =>
                setWorkspace((current) => ({ ...current, activeProjectId: projectId }))
              }
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapsed}
              onWorkspaceChange={setWorkspace}
              onOpenStation={openResidentialStation}
              onOpenChat={openChatPanel}
              onOpenHome={openChatPanel}
              onOpenHelp={() => {
                openHelpPanel()
                setSidebarOpen(false)
              }}
              onOpenSettings={() => {
                openSettingsPanel()
                setSidebarOpen(false)
              }}
              onOpenSavedOutputs={() => {
                openSavedOutputsPanel()
                setSidebarOpen(false)
              }}
              onOpenProfile={(anchor) => {
                openResidentialAccountMenu(anchor)
                setSidebarOpen(false)
              }}
              onOpenBilling={() => {
                openBillingPanel()
                setSidebarOpen(false)
              }}
              onSelectMode={(next) => {
                handleModeChange(next)
                setSidebarOpen(false)
                inputRef.current?.focus()
              }}
              onOpenPracticePanel={(panel) => {
                openPracticePanel(panel)
                setSidebarOpen(false)
              }}
              activeMode={mode}
              adultProfile={adultProfile}
              savedOutputsCount={savedOutputsCount}
              userName={account.userName}
              userEmail={account.userEmail}
              avatarUrl={account.avatarUrl}
              subscriptionStatusLabel={subscriptionStatusLabel}
              onClose={() => setSidebarOpen(false)}
            />
          ) : (
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
              profileDisplayMode={account.profileDisplayMode}
              cognitionStatusLabel={cognitionStatusLabel}
              cognitionModeLabel={activeAgent?.cognitionLabel}
              savedOutputsCount={savedOutputsCount}
              onClose={() => setSidebarOpen(false)}
            />
          )
        }
        mobileHeader={
          residentialSurface && !activeWorkspacePanel ? (
            <OrbMobileChatHeader
              onOpenMenu={() => setSidebarOpen(true)}
              onOpenAccount={(anchor) => {
                openResidentialAccountMenu(anchor)
                setSidebarOpen(false)
              }}
              showTagline={false}
              accountUsesSettingsIcon
            />
          ) : undefined
        }
        header={
          <header
            className={`orb-chat-header relative z-10 flex shrink-0 items-center gap-2 px-3 py-2.5 backdrop-blur-sm md:px-5 ${
              residentialSurface ? 'hidden' : ''
            } ${
              residentialSurface
                ? 'border-b border-[var(--orb-line)]/40 bg-[var(--orb-bg-deep)]/90'
                : 'border-b border-[var(--orb-line)] bg-[var(--orb-bg-deep)]/90'
            }`}
          >
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
            ) : !residentialSurface ? (
              <span
                className="hidden shrink-0 rounded-full border border-[#93C5FD] bg-[#F0F9FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#0369A1] sm:inline"
                data-orb-header-privacy
                title={ORB_DATA_BOUNDARY}
              >
                {ORB_DATA_BOUNDARY_SHORT}
              </span>
            ) : null}
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
              {residentialSurface ? (
                <button
                  type="button"
                  onClick={() => {
                    openSavedOutputsPanel()
                    setSidebarOpen(false)
                  }}
                  className="rounded-lg p-2 text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50 lg:hidden"
                  aria-label="Saved outputs and stations"
                  data-orb-header-stations
                >
                  <Save className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  openResidentialAccountMenu(event.currentTarget)
                  setSidebarOpen(false)
                }}
                className="rounded-lg p-2 text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[#0077FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50"
                aria-label="Account"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                data-orb-header-profile
                data-orb-account-menu-trigger
              >
                <User className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void exportConversation()}
                disabled={visibleMessages.length === 0}
                className="hidden rounded-lg p-2 text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00B8FF]/50 disabled:opacity-40 sm:inline-flex"
                aria-label="Copy chat"
                data-orb-header-export
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </header>
        }
        preThread={
          activeWorkspacePanel ? undefined : (
          <>
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
            <p className={ORB_DRAFT_NOTICE_CLASS} role="status" data-orb-draft-notice="true">
              {draftNotice}
            </p>
          ) : null}

          {convergenceNotice ? (
            <p
              className="mx-3 mt-3 rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm text-[var(--orb-foreground)] md:mx-5"
              role="status"
              data-orb-convergence-notice
            >
              {convergenceNotice}
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

          {residentialSurface && guidedDemoState.active ? (
            <p
              className="orb-guided-demo-active-marker"
              role="status"
              data-orb-guided-demo-active-marker
            >
              {ORB_GUIDED_DEMO_ACTIVE_MARKER}
            </p>
          ) : null}
          </>
          )
        }
        thread={
          activeWorkspacePanel ? (
            renderResidentialCorePanels()
          ) : (
            <div
              ref={scrollContainerRef}
              className={`orb-chat-thread flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 md:px-6 ${residentialSurface ? 'pb-4' : 'pb-32'}`}
              role="log"
              aria-label="ORB conversation"
              data-orb-chat-scroll-container
            >
              <div className={`mx-auto w-full ${residentialSurface ? 'orb-chat-column' : 'max-w-[var(--orb-chat-column-max,50rem)]'}`}>
                {showEmptyState ? (
                  <div
                    className={`flex min-h-0 flex-col items-center justify-start px-2 py-3 text-center md:min-h-[min(56vh,28rem)] md:justify-center md:py-10 ${residentialSurface ? 'orb-residential-empty orb-residential-empty--desktop orb-workspace--home' : ''}`}
                    data-orb-empty-state
                    {...(residentialSurface ? { 'data-orb-residential-empty': true, 'data-orb-workspace-home': true } : {})}
                  >
                    {residentialSurface ? <div className="orb-v2-atmosphere" aria-hidden /> : null}
                    <div
                      className={residentialSurface ? 'orb-workspace-home-grid w-full' : 'w-full'}
                      {...(residentialSurface ? { 'data-orb-workspace-home-grid': true } : {})}
                    >
                      <div
                        className={residentialSurface ? 'orb-workspace-home-main w-full' : 'w-full'}
                        {...(residentialSurface ? { 'data-orb-workspace-home-main': true } : {})}
                      >
                    <div className="orb-workspace-hero" data-orb-workspace-hero>
                    <div
                      className="relative flex shrink-0 justify-center"
                      data-orb-empty-sphere
                      data-orb-presence-slot="hero"
                    >
                      {residentialSurface ? (
                        <GlassOrbMark
                          variant={isMobileViewport ? 'compact' : 'hero'}
                          pulse
                          state="idle"
                          data-orb-empty-sphere-mark
                        />
                      ) : null}
                      {!residentialSurface ? (
                        <OrbGlow state="idle" interactive={false} size="dock" compactLabels />
                      ) : null}
                    </div>
                    {residentialSurface ? (
                      <>
                        <p
                          className="mt-2 hidden text-[11px] font-semibold tracking-[0.04em] text-[var(--orb-res-text-soft,var(--orb-muted))] md:block"
                          data-orb-brand-emotional-line
                          data-orb-empty-emotional-line
                          data-orb-empty-brand-line
                        >
                          {ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="orb-empty-title-wrap hidden md:block" data-orb-empty-title-wrap>
                          <p className="orb-empty-brand-title orb-hue-text" data-orb-brand-name data-orb-empty-title>
                            ORB Residential
                          </p>
                        </div>
                        <p className="orb-empty-brand-powered mt-1.5 hidden md:block" data-orb-brand-powered>
                          Powered by IndiCare
                        </p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-500/70 md:hidden" data-orb-empty-brand-small>
                          ORB Residential
                        </p>
                      </>
                    )}
                    {residentialSurface ? (
                      <>
                        <h2
                          className="orb-workspace-headline mt-4 hidden text-xl font-semibold tracking-tight text-slate-900 md:mt-6 md:block md:text-[1.5rem]"
                          data-orb-empty-heading
                          data-orb-empty-heading-desktop
                          data-orb-workspace-headline
                        >
                          {ORB_RESIDENTIAL_EMPTY_HEADING_DESKTOP}
                        </h2>
                        <h2
                          className="mt-2 text-xl font-semibold tracking-tight text-slate-900 md:hidden"
                          data-orb-empty-heading
                          data-orb-empty-heading-mobile
                        >
                          {emptyHeadingMobile}
                        </h2>
                        {isMobileViewport ? (
                          <p
                            className="mt-1.5 max-w-xs text-xs leading-snug text-[var(--orb-muted)] md:hidden"
                            data-orb-empty-subline
                            data-orb-empty-subline-mobile
                          >
                            {ORB_RESIDENTIAL_MOBILE_EMPTY_SUBLINE}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <h2
                        className="mt-4 text-xl font-semibold tracking-tight text-slate-900 md:mt-6 md:text-[1.35rem]"
                        data-orb-empty-heading
                      >
                        {emptyHeadingMobile}
                      </h2>
                    )}
                    {residentialSurface ? (
                      <p
                        className="orb-workspace-subline mt-2 hidden max-w-lg text-sm leading-relaxed text-[var(--orb-muted)] md:block"
                        data-orb-empty-subline
                        data-orb-workspace-subline
                      >
                        {ORB_RESIDENTIAL_EMPTY_SUBLINE}
                      </p>
                    ) : (emptyWelcome.subline || ORB_RESIDENTIAL_EMPTY_SUBLINE) ? (
                      <p className="mt-2 max-w-lg text-sm leading-7 text-slate-600" data-orb-empty-subline>
                        {emptyWelcome.subline || ORB_RESIDENTIAL_EMPTY_SUBLINE}
                      </p>
                    ) : null}
                    {emptyWelcome.temporaryNote ? (
                      <p
                        className="mt-2 max-w-lg text-xs font-medium leading-5 text-amber-800"
                        data-orb-empty-temporary-note
                      >
                        {emptyWelcome.temporaryNote}
                      </p>
                    ) : null}
                    {!residentialSurface ? (
                      <p className="mt-3 hidden max-w-md text-xs leading-5 text-slate-500 md:block" data-orb-empty-hint>
                        Pick a starter, choose a mode, or type in the composer below.
                      </p>
                    ) : null}
                    </div>
                    </div>
                    {residentialSurface ? (
                      <aside className="orb-workspace-home-rail w-full" data-orb-workspace-home-rail>
                          <ul className="orb-workspace-rail-trust" data-orb-workspace-rail-trust>
                            {ORB_HOME_RAIL_TRUST_ITEMS.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          {guidedDemoState.active && !guidedDemoPanelOpen ? (
                            <div className="w-full" data-orb-guided-demo-resume>
                              <button
                                type="button"
                                onClick={() => setGuidedDemoPanelOpen(true)}
                                className="orb-guided-demo-continue-card orb-guided-demo-continue-card--flagship w-full rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5 text-left text-sm font-semibold text-slate-900 shadow-sm"
                                data-orb-guided-demo-continue
                              >
                                Continue Guided Demo — step {guidedDemoState.stepIndex + 1} of 5
                              </button>
                            </div>
                          ) : !guidedDemoState.active ? (
                            <OrbGuidedDemoEntry onStart={handleGuidedDemoStart} />
                          ) : null}
                      </aside>
                    ) : null}
                    </div>
                    {residentialSurface && isMobileViewport ? (
                      <>
                        <div
                          className="orb-workspace-starter-grid mt-3 w-full"
                          data-orb-starter-cards
                          data-orb-empty-starter-chips
                          data-orb-starter-pills-grid
                          data-orb-starter-count={ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTERS.length}
                        >
                          {ORB_RESIDENTIAL_MOBILE_PRIMARY_STARTERS.map((starter) => (
                            <button
                              key={starter.text}
                              type="button"
                              onClick={() => applyPrompt(starter)}
                              className="orb-starter-card text-left text-[13px] leading-snug"
                              data-orb-starter-card
                              data-orb-starter-suggestion-card="true"
                            >
                              {starter.text}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPromptDrawerOpen(true)}
                          className="mt-2 inline-flex min-h-0 items-center justify-center rounded-full border border-[var(--orb-line)]/35 bg-transparent px-2.5 py-0.5 text-[11px] font-medium text-[var(--orb-muted)]"
                          data-orb-more-examples
                        >
                          More
                        </button>
                      </>
                    ) : null}
                    {residentialSurface && !isMobileViewport ? (
                        <button
                          type="button"
                          onClick={() => setMoreExamplesExpanded((open) => !open)}
                          className="mt-3 text-xs font-medium text-[var(--orb-muted)] underline-offset-4 transition hover:text-[var(--orb-foreground)] hover:underline"
                          data-orb-more-examples
                          aria-expanded={moreExamplesExpanded}
                        >
                          {moreExamplesExpanded ? 'Fewer examples' : 'More examples'}
                        </button>
                    ) : null}
                    {residentialSurface && !isMobileViewport && moreExamplesExpanded ? (
                      <div
                        className="mt-4 w-full space-y-3 text-left"
                        data-orb-starter-groups
                        data-orb-starter-expanded-groups
                      >
                        {ORB_RESIDENTIAL_STARTER_GROUPS.map((group) => (
                          <section key={group.id} data-orb-starter-group={group.id}>
                            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
                              {group.label}
                            </h3>
                            <div className="orb-workspace-starter-grid" data-orb-starter-pills>
                              {group.starters.map((starter) => (
                                <button
                                  key={starter.text}
                                  type="button"
                                  onClick={() => applyPrompt(starter)}
                                  className="orb-starter-card text-left text-[12px] leading-snug"
                                  data-orb-starter-card
                                  data-orb-starter-suggestion-card="true"
                                >
                                  {starter.text}
                                </button>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : null}
                    {!residentialSurface ? (
                      <div
                        className="mt-5 flex w-full max-w-2xl flex-wrap justify-center gap-2 lg:max-w-3xl"
                        data-orb-starter-cards
                        data-orb-starter-pills
                        data-orb-empty-starter-chips
                        data-orb-starter-count={emptyStarters.length}
                      >
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
                    ) : null}
                    {!residentialSurface ? (
                      <button
                        type="button"
                        onClick={() => setPromptDrawerOpen(true)}
                        className="mt-3 text-xs font-medium text-[var(--orb-muted)] underline-offset-4 transition hover:text-[var(--orb-foreground)] hover:underline"
                        data-orb-more-examples
                      >
                        More examples
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className={`space-y-6 pb-6 ${residentialSurface ? 'orb-chat-column-inner' : ''}`} data-orb-chat-column-inner={residentialSurface ? true : undefined}>
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
                              className="orb-message-error-card orb-message-assistant px-4 py-3"
                              data-testid="orb-message-error"
                              role="alert"
                            >
                              <p className="orb-message-error-card__title mb-2 text-xs font-semibold">ORB</p>
                              <p className="orb-message-error-card__body text-sm">{entry.content}</p>
                              {orbErrorCallToAction(entry.content)}
                              {!isStandaloneOrbSignInPromptMessage(entry.content) &&
                              !isStandaloneOrbSafetyAcceptanceMessage(entry.content) &&
                              retryPayload &&
                              index === visibleMessages.length - 1 ? (
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
                                  className="orb-message-error-card__retry mt-3 inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold disabled:opacity-40"
                                >
                                  Retry
                                </button>
                              ) : null}
                            </article>
                          ) : (
                          <>
                          {(() => {
                            const messageHint = precedingUserMessageHint(visibleMessages, index)
                            const minimalTurn = isOrbMinimalTurn({
                              userMessage: messageHint,
                              assistantContent: entry.content
                            })
                            return (
                              <>
                          <OrbAssistantMessageBody
                            content={entry.content}
                            sources={minimalTurn ? [] : entry.sources}
                            mode={mode}
                            streaming={entry.status === 'streaming'}
                            streamStatus={entry.streamStatus}
                            explainability={entry.explainability}
                            modelRouting={entry.modelRouting}
                            messageHint={messageHint}
                            showCognitionLabels={
                              !residentialSurface && !minimalTurn && chatUiSettings.showCognitionLabels
                            }
                            showExplainability={!minimalTurn && entry.status !== 'streaming'}
                            residentialSurface={residentialSurface}
                            heading={entry.outputTitle}
                            userRole={adultProfile?.role ?? account.role ?? undefined}
                            onRecordProperly={() => handleModeChange('Record This Properly')}
                            onManagerOversight={() => handleModeChange('Manager Copilot')}
                            cognitionContext={{
                              context_used: {
                                ...(entry.contextUsed ?? {}),
                                cognition_display_labels: entry.explainability?.cognition_display_labels,
                                active_brains: entry.explainability?.active_brains,
                                depth_topic: entry.explainability?.depth_topic
                              }
                            }}
                          />
                            {orbErrorCallToAction(entry.content, '')}
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
                                  minimal={minimalTurn}
                                  residentialSurface={residentialSurface}
                                  isLatest={index === visibleMessages.length - 1}
                                  speaking={speakingMessageId === entry.id}
                                  synthesisAvailable={voice.synthesisAvailable}
                                  saveFeedback={saveFeedbackByMessageId[entry.id] || 'idle'}
                                  onRegenerate={
                                    !minimalTurn && index === visibleMessages.length - 1
                                      ? handleRegenerate
                                      : undefined
                                  }
                                  onSpeak={() => speakMessageContent(entry.id, entry.content)}
                                  onStop={voice.cancelSpeaking}
                                  onNewQuestion={() => {
                                    setMessage('')
                                    inputRef.current?.focus()
                                  }}
                                  onDraft={() => void handleDraftWording(entry.content)}
                                  onSave={minimalTurn ? undefined : () => void saveChatNote(entry)}
                                  onSaveToProject={minimalTurn ? undefined : () => void saveChatNote(entry)}
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
                                  onOpenInOrbWrite={
                                    minimalTurn
                                      ? undefined
                                      : () => {
                                          openOrbWriteWithContent({
                                            content: entry.content,
                                            source: 'chat',
                                            sourceLabel: 'From chat'
                                          })
                                        }
                                  }
                                  onUseAsTemplate={
                                    minimalTurn
                                      ? undefined
                                      : () => {
                                          setMessage(
                                            `Use this as a template structure:\n\n${entry.content.slice(0, 2000)}`
                                          )
                                          inputRef.current?.focus()
                                        }
                                  }
                                  onExport={
                                    minimalTurn
                                      ? undefined
                                      : () => {
                                          const blob = new Blob([entry.content], { type: 'text/markdown;charset=utf-8' })
                                          const url = URL.createObjectURL(blob)
                                          const anchor = document.createElement('a')
                                          anchor.href = url
                                          anchor.download = 'orb-response.md'
                                          anchor.click()
                                          URL.revokeObjectURL(url)
                                        }
                                  }
                                  exportEnabled={!minimalTurn}
                                  onEdit={
                                    minimalTurn
                                      ? undefined
                                      : () => {
                                          setMessage(entry.content)
                                          inputRef.current?.focus()
                                        }
                                  }
                                  onOrbFollowUp={
                                    minimalTurn
                                      ? undefined
                                      : (action, content) => void handleOrbFollowUp(action, content, index)
                                  }
                                />
                                {!minimalTurn ? (
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
                                ) : null}
                                {!minimalTurn &&
                                entry.status === 'complete' &&
                                index === visibleMessages.length - 1 ? (
                                  <OrbSuggestedReplyChips
                                    suggestions={
                                      entry.outputKind
                                        ? contextualSuggestedRepliesForOutput({
                                            outputKind: entry.outputKind,
                                            content: entry.content,
                                            mode,
                                            messageHint
                                          })
                                        : contextualSuggestedReplies({
                                            mode,
                                            messageHint,
                                            content: entry.content,
                                            contextUsed: entry.contextUsed as Record<string, unknown> | undefined
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
                          })()}
                          </>
                          )
                        ) : (
                          <>
                          <OrbUserMessageBubble
                            entry={entry}
                            userInitials={userDisplayInitials}
                            onEditSubmit={handleEditAndResubmit}
                            onResend={(content) => void sendMessage(content, { retry: true })}
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
                        className="orb-message-error-card px-4 py-3 text-sm"
                        role="alert"
                        data-testid="orb-send-error"
                      >
                        <p className="orb-message-error-card__body">{error}</p>
                        {orbErrorCallToAction(error)}
                        {!isStandaloneOrbSignInPromptMessage(error) &&
                        !isStandaloneOrbSafetyAcceptanceMessage(error) &&
                        retryPayload ? (
                          <button
                            type="button"
                            data-testid="orb-message-retry"
                            onClick={() => void sendMessage(retryPayload.text, { retry: true, chatId: retryPayload.chatId })}
                            disabled={pending}
                            className="orb-message-error-card__retry mt-3 inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold disabled:opacity-40"
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
          )
        }
        scrollFab={
          activeWorkspacePanel ? undefined : (
          <OrbScrollToBottomFab
            visible={showScrollFab}
            streaming={threadIsStreaming}
            reducedMotion={a11yPrefs.reducedMotion}
            onClick={() => requestChatScroll(true)}
          />
          )
        }
        composer={activeWorkspacePanel ? null : composer}
        rightPanel={documentDesktopContextPanel}
      />

      {promptDrawerOpen ? (
        <OrbPromptDrawer
          groups={
            residentialSurface
              ? ORB_RESIDENTIAL_STARTER_GROUPS.map((group) => ({
                  title: group.label,
                  prompts: group.starters
                }))
              : SUGGESTED_PROMPT_GROUPS
          }
          moreStarters={residentialSurface ? [] : ORB_RESIDENTIAL_MORE_STARTERS}
          moreExpanded={moreExamplesExpanded}
          onToggleMore={() => setMoreExamplesExpanded((o) => !o)}
          onApply={(entry) => {
            applyPrompt(entry)
            setPromptDrawerOpen(false)
          }}
          onClose={() => setPromptDrawerOpen(false)}
          residentialSurface={residentialSurface}
        />
      ) : null}

      {adultProfile && residentialSurface ? (
        <OrbAccountMenu
          open={accountMenuOpen}
          onClose={() => setAccountMenuOpen(false)}
          anchorRef={accountMenuAnchorRef}
          preferAbove={sidebarCollapsed}
          profile={adultProfile}
          userEmail={account.userEmail}
          userName={account.userName}
          avatarUrl={account.avatarUrl}
          planLabel={account.planName}
          subscriptionActive={account.hasConfirmedAccess}
          access={account.access}
          accessStatus={account.accessStatus}
          savedOutputsCount={savedOutputsCount}
          role={account.role}
          passkeyEnabled={account.hasPasskeys}
          realtimeVoiceEnabled={realtimeVoiceAvailable}
          onOpenProfile={openResidentialProfile}
          onOpenSettings={(section) => {
            setAccountMenuOpen(false)
            openSettingsPanel(section ?? 'appearance')
          }}
          onOpenBilling={() => {
            setAccountMenuOpen(false)
            openBillingPanel()
          }}
          onOpenVoiceSettings={() => {
            setAccountMenuOpen(false)
            openVoiceSettings()
          }}
          onOpenSavedOutputs={() => {
            setAccountMenuOpen(false)
            openSavedOutputsPanel()
          }}
          onSignOut={handleResidentialSignOut}
        />
      ) : null}
      {adultProfile && residentialSurface ? (
        <OrbAccountModal
          open={activePanel === 'account'}
          onClose={closePanel}
          profile={adultProfile}
          userEmail={account.userEmail}
          avatarUrl={account.avatarUrl}
          onOpenSettings={() => {
            closePanel()
            openSettingsPanel()
          }}
          onOpenBilling={() => {
            closePanel()
            openBillingPanel()
          }}
          onOpenVoiceSettings={() => {
            closePanel()
            openVoiceSettings()
          }}
          passkeyEnabled={account.hasPasskeys}
          projectCount={workspace.projects?.length ?? 0}
          savedOutputsCount={savedOutputsCount}
          localContentMode={
            sessionGate.backendSyncState === 'offline' || sessionGate.backendSyncState === 'degraded'
          }
          subscriptionActive={account.hasConfirmedAccess}
          adminBypass={account.adminBypass}
          realtimeVoiceEnabled={realtimeVoiceAvailable}
          safetyAccepted={account.safetyAccepted}
          role={account.role}
          onOpenSavedOutputs={() => {
            closePanel()
            openSavedOutputsPanel()
          }}
          onLogOut={account.isSignedIn ? handleResidentialSignOut : undefined}
        />
      ) : null}
      {adultProfile && !residentialSurface ? (
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
  onClose,
  residentialSurface = false
}: {
  groups: Array<{ title: string; prompts: PromptEntry[] }>
  moreStarters: PromptEntry[]
  moreExpanded: boolean
  onToggleMore: () => void
  onApply: (entry: PromptEntry) => void
  onClose: () => void
  residentialSurface?: boolean
}) {
  const safeGroups = Array.isArray(groups) ? groups : []
  const safeMoreStarters = Array.isArray(moreStarters) ? moreStarters : []

  return (
    <div
      className="fixed inset-0 z-[68] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-label="Example prompts"
      data-orb-more-examples-sheet
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-4 text-[var(--orb-foreground)] shadow-2xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--orb-foreground)]">
            {residentialSurface ? 'More examples' : 'Example prompts'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {safeGroups.map((group) => (
          <div key={group.title} className="mb-4" data-orb-starter-group={group.title.toLowerCase()}>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">{group.title}</p>
            <ul className="space-y-1">
              {(Array.isArray(group.prompts) ? group.prompts : []).map((prompt) => (
                <li key={prompt.text}>
                  <button
                    type="button"
                    onClick={() => onApply(prompt)}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                    data-orb-starter-drawer-item
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
            {safeMoreStarters.map((prompt) => (
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
        {!residentialSurface ? (
          <button type="button" onClick={onToggleMore} className="text-xs text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]">
            {moreExpanded ? 'Fewer examples' : 'More examples'}
          </button>
        ) : null}
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
        <p className="mt-1 text-[10px] text-slate-600">ORB Residential — no OS records accessed</p>
      ) : null}
    </div>
  )
}

function OrbUserMessageBubble({
  entry,
  userInitials,
  onEditSubmit,
  onResend,
  disabled
}: {
  entry: StandaloneChatMessage
  userInitials: string
  onEditSubmit: (messageId: string, content: string) => void
  onResend?: (content: string) => void
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
      <div className="orb-message-bubble min-w-0 max-w-[82%]" data-orb-user-message-bubble>
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
            <div
              className="orb-user-message-actions mt-1.5 flex items-center justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              data-orb-user-message-actions
            >
              <button
                type="button"
                onClick={() => void copyTextToClipboard(entry.content)}
                className="orb-action-chip orb-action-chip--icon-only inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border px-2 py-1"
                data-orb-user-action-copy
                aria-label="Copy"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={disabled}
                className="orb-action-chip orb-action-chip--icon-only inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border px-2 py-1"
                data-orb-user-action-edit
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Edit</span>
              </button>
              {onResend ? (
                <button
                  type="button"
                  onClick={() => onResend(entry.content)}
                  disabled={disabled}
                  className="orb-action-chip orb-action-chip--icon-only inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border px-2 py-1"
                  data-orb-user-action-resend
                  aria-label="Resend"
                  title="Resend"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">Resend</span>
                </button>
              ) : null}
              {timeLabel ? <span className="ml-1 text-[10px] text-[#64748B]">{timeLabel}</span> : null}
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
