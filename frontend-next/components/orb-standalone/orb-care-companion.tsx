'use client'

import { FormEvent, useRef, useState, type DragEvent } from 'react'
import { Copy, Menu, User } from 'lucide-react'

import {
  OrbStandaloneComposer,
  type PendingImageAttachment
} from '@/components/orb-standalone/orb-standalone-composer'
import { OrbStandaloneSidebar } from '@/components/orb-standalone/orb-standalone-sidebar'
import { OrbStandaloneSettingsPanel } from '@/components/orb-standalone/orb-standalone-settings-panel'
import { OrbHelpPanel } from '@/components/orb-standalone/orb-help-panel'
import { OrbToolsPanel } from '@/components/orb-standalone/orb-tools-panel'
import { OrbDocumentPanel } from '@/components/orb-standalone/orb-document-panel'
import { OrbResidentialAgentsPanel } from '@/components/orb-standalone/orb-residential-agents-panel'
import { OrbAdultProfileDrawer } from '@/components/orb-standalone/orb-adult-profile-drawer'
import { OrbAssistantMessageBody } from '@/components/orb-standalone/orb-assistant-message'
import { OrbAmbientCognition } from '@/components/orb-standalone/orb-ambient-cognition'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { AuthApiError } from '@/lib/auth/api'
import {
  createStandaloneChat,
  exportStandaloneWorkspaceJson,
  readStandaloneWorkspace,
  writeStandaloneWorkspace,
  type StandaloneChatMessage,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'
import {
  queryStandaloneOrbConversation,
  type StandaloneOrbMode
} from '@/lib/orb/standalone-client'
import { readAdultProfile, type AdultProfile } from '@/lib/orb/adult-profile-store'
import {
  defaultStandaloneOrbAccessibility,
  saveStandaloneOrbAccessibility,
  type StandaloneOrbAccessibilityPreferences
} from '@/lib/orb/standalone-accessibility'

const STANDALONE_ORB_VOICE_CAPTURE_ENABLED = true

type Panel = null | 'settings' | 'help' | 'tools' | 'documents'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

function makeMessage(role: 'user' | 'assistant', content: string, status: StandaloneChatMessage['status'] = 'sent'): StandaloneChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    status,
    createdAt: Date.now()
  }
}

function localFastAnswer(text: string): string | null {
  const normalised = text.trim().toLowerCase().replace(/[.!?\s]+$/g, '')
  if (['hi', 'hello', 'hey', 'hiya', 'morning', 'good morning', 'good afternoon', 'good evening'].includes(normalised)) {
    return 'Hello — I’m ready when you are.'
  }
  if (['thanks', 'thank you', 'cheers'].includes(normalised)) {
    return 'You’re welcome.'
  }
  return null
}

function friendlyOrbError(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.status === 402) {
      return 'Your ORB access is not active yet. Please start your trial or manage your subscription from /orb/access.'
    }
    if (error.status === 403) {
      return error.message && error.message !== 'ORB could not finish that response. Please try again.'
        ? error.message
        : 'ORB needs the safety statement accepted before it can answer. Please open /orb/onboarding or refresh and try again.'
    }
    if (error.status === 401) {
      return 'Please sign in again to use ORB.'
    }
    if (error.message) return error.message
  }
  return error instanceof Error ? error.message : 'ORB could not respond. Please try again.'
}

export function OrbCareCompanion() {
  const { resolvedTheme, appearanceMode, setAppearanceMode } = useOrbAppearance()
  const voice = useStandaloneOrbVoice()
  const [workspace, setWorkspace] = useState<StandaloneWorkspace>(() => {
    const existing = readStandaloneWorkspace()
    if (existing.activeChatId) return existing
    const chat = createStandaloneChat(existing.activeProjectId, 'Ask ORB')
    return { ...existing, activeChatId: chat.id, chats: [chat, ...existing.chats] }
  })
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<PendingImageAttachment[]>([])
  const [pending, setPending] = useState(false)
  const [mode, setMode] = useState<StandaloneOrbMode>('Ask ORB')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adultProfile, setAdultProfile] = useState<AdultProfile | null>(() => readAdultProfile())
  const [a11yPrefs, setA11yPrefs] = useState<StandaloneOrbAccessibilityPreferences>(defaultStandaloneOrbAccessibility)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const activeChat = workspace.chats.find((chat) => chat.id === workspace.activeChatId) ?? workspace.chats[0]
  const visibleMessages = activeChat?.messages ?? []
  const showEmptyState = visibleMessages.length === 0

  function persistMessages(messages: StandaloneChatMessage[]) {
    if (!activeChat) return
    const nextWorkspace = {
      ...workspace,
      chats: workspace.chats.map((chat) =>
        chat.id === activeChat.id ? { ...chat, messages, updatedAt: Date.now(), mode } : chat
      )
    }
    setWorkspace(nextWorkspace)
    writeStandaloneWorkspace(nextWorkspace)
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = message.trim()
    if (!text || pending) return

    const userMessage = makeMessage('user', text)
    const thinkingMessage = makeMessage('assistant', 'ORB is thinking…', 'thinking')
    const baseMessages = [...visibleMessages, userMessage, thinkingMessage]
    persistMessages(baseMessages)
    setMessage('')
    setPending(true)

    const localAnswer = localFastAnswer(text)
    if (localAnswer) {
      const assistantMessage: StandaloneChatMessage = {
        ...thinkingMessage,
        content: localAnswer,
        status: 'complete'
      }
      persistMessages(baseMessages.map((entry) => (entry.id === thinkingMessage.id ? assistantMessage : entry)))
      setPending(false)
      return
    }

    try {
      const response = await queryStandaloneOrbConversation({
        message: text,
        mode,
        conversation_id: activeChat?.conversationId || 'standalone-session',
        history: visibleMessages.map((entry) => ({ role: entry.role, content: entry.content }))
      })
      const assistantMessage: StandaloneChatMessage = {
        ...thinkingMessage,
        content: response.answer || 'I could not generate an answer. Please try again.',
        status: 'complete',
        sources: response.sources || response.citations,
        explainability: response.context_used?.explainability
      }
      persistMessages(baseMessages.map((entry) => (entry.id === thinkingMessage.id ? assistantMessage : entry)))
    } catch (error) {
      const assistantMessage: StandaloneChatMessage = {
        ...thinkingMessage,
        content: friendlyOrbError(error),
        status: 'error'
      }
      persistMessages(baseMessages.map((entry) => (entry.id === thinkingMessage.id ? assistantMessage : entry)))
    } finally {
      setPending(false)
    }
  }

  function startNewChat() {
    const chat = createStandaloneChat(workspace.activeProjectId, mode)
    const nextWorkspace = { ...workspace, activeChatId: chat.id, chats: [chat, ...workspace.chats] }
    setWorkspace(nextWorkspace)
    writeStandaloneWorkspace(nextWorkspace)
    setMessage('')
    setSidebarOpen(false)
  }

  function selectChat(chatId: string) {
    const next = { ...workspace, activeChatId: chatId }
    setWorkspace(next)
    writeStandaloneWorkspace(next)
    setMessage('')
    setSidebarOpen(false)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
  }

  return (
    <main
      className="orb-chat-layout relative flex min-h-[100dvh] flex-col overflow-hidden"
      data-orb-theme={resolvedTheme}
      data-orb-appearance-mode={appearanceMode}
      data-orb-agent="ask_orb"
      data-orb-cognition-state={pending ? 'thinking' : 'idle'}
    >
      <OrbAmbientCognition state={pending ? 'thinking' : 'idle'} reducedMotion={a11yPrefs.reducedMotion} />

      <OrbStandaloneSettingsPanel
        open={activePanel === 'settings'}
        onClose={() => setActivePanel(null)}
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
        voiceInputEnabled={voice.recognitionAvailable}
        onVoiceInputChange={() => undefined}
        voiceRepliesEnabled={voice.settings.voiceReplies}
        onVoiceRepliesChange={(enabled) => voice.setVoiceReplies(enabled)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenHelp={() => setActivePanel('help')}
        onExportWorkspace={() => {
          const blob = new Blob([exportStandaloneWorkspaceJson(workspace)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `orb-workspace-${Date.now()}.json`
          anchor.click()
          URL.revokeObjectURL(url)
        }}
      />
      <OrbHelpPanel open={activePanel === 'help'} onClose={() => setActivePanel(null)} />
      <OrbToolsPanel
        open={activePanel === 'tools'}
        onClose={() => setActivePanel(null)}
        onOpenDocuments={() => setActivePanel('documents')}
        onOpenAgents={() => setAgentsOpen(true)}
        onAskOrb={() => {
          setActivePanel(null)
          inputRef.current?.focus()
        }}
        onComposerPrefill={(text) => {
          setMessage(text)
          setActivePanel(null)
          inputRef.current?.focus()
        }}
      />
      <OrbDocumentPanel
        open={activePanel === 'documents'}
        onClose={() => setActivePanel(null)}
        projects={workspace.projects}
        activeProjectId={workspace.activeProjectId}
        onReuseInChat={(text) => setMessage(text)}
        onInsertIntoChat={(text) => setMessage(text)}
        onDocumentContext={(ctx) => setMessage(`Review this document: ${ctx.title}\n\n${ctx.text}`)}
      />
      <OrbResidentialAgentsPanel
        open={agentsOpen}
        activeMode={mode}
        onClose={() => setAgentsOpen(false)}
        onSelect={(agent) => {
          setMode(agent.mode)
          setAgentsOpen(false)
          inputRef.current?.focus()
        }}
      />
      {adultProfile ? (
        <OrbAdultProfileDrawer
          open={profileOpen}
          profile={adultProfile}
          onClose={() => setProfileOpen(false)}
          onSave={setAdultProfile}
        />
      ) : null}

      {sidebarOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <aside className={`orb-chat-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--orb-line)] transition-transform lg:static lg:z-auto lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <OrbStandaloneSidebar
            workspace={workspace}
            chatSearch=""
            onChatSearchChange={() => undefined}
            onSelectChat={selectChat}
            onNewChat={startNewChat}
            onSelectProject={(projectId) => setWorkspace((current) => ({ ...current, activeProjectId: projectId }))}
            onWorkspaceChange={setWorkspace}
            onOpenSettings={() => setActivePanel('settings')}
            onOpenHelp={() => setActivePanel('help')}
            onOpenTools={() => setActivePanel('tools')}
            onOpenAgents={() => setAgentsOpen(true)}
            onOpenAdultProfile={() => setProfileOpen(true)}
            adultProfile={adultProfile}
            cognitionStatusLabel={pending ? 'Thinking' : 'Ready'}
            cognitionModeLabel="ORB"
            savedOutputsCount={0}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        <div className="orb-chat-main flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="orb-chat-header relative z-10 flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)] px-3 py-2.5 md:px-5">
            <button type="button" className="rounded-lg p-2 text-[var(--orb-muted)] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--orb-foreground)] md:text-base">ORB</h1>
            <button type="button" className="rounded-lg p-2 text-[var(--orb-muted)]" onClick={() => setProfileOpen(true)} aria-label="Profile">
              <User className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-lg p-2 text-[var(--orb-muted)]" onClick={() => navigator.clipboard?.writeText(visibleMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n'))} aria-label="Copy chat">
              <Copy className="h-4 w-4" />
            </button>
          </header>

          <section className="flex min-h-0 flex-1 flex-col" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <div className="orb-chat-thread flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 pb-32 md:px-6" role="log" aria-label="ORB conversation">
              <div className="mx-auto w-full max-w-[var(--orb-chat-column-max,50rem)]">
                {showEmptyState ? (
                  <div className="flex min-h-[min(52vh,24rem)] flex-col items-center justify-center px-2 py-6 text-center md:py-8" data-orb-empty-state>
                    <p className="orb-empty-brand-title orb-hue-text" data-orb-empty-title>ORB</p>
                    <p className="orb-empty-brand-powered mt-1.5" data-orb-brand-powered>Powered by IndiCare</p>
                    <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900 md:text-[1.35rem]" data-orb-empty-heading>{greeting()}</h2>
                    <p className="mt-2 max-w-lg text-sm leading-7 text-slate-600" data-orb-empty-subline>Ready when you are.</p>
                  </div>
                ) : (
                  <div className="space-y-6 pb-6">
                    {visibleMessages.map((entry) => (
                      <article key={entry.id} className={entry.role === 'user' ? 'orb-message-user flex justify-end' : 'orb-message-assistant'}>
                        {entry.role === 'assistant' ? (
                          <OrbAssistantMessageBody content={entry.content} sources={entry.sources} mode={mode} streaming={entry.status === 'thinking'} />
                        ) : (
                          <div className="orb-message-bubble rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-4 py-3 text-[var(--orb-foreground)]">
                            <p className="whitespace-pre-wrap text-[15px] leading-7">{entry.content}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="orb-composer-dock border-t border-transparent pt-2">
              <OrbStandaloneComposer
                value={message}
                pending={pending}
                mode={mode}
                attachments={attachments}
                voiceListening={voice.listening}
                voiceSpeaking={voice.speaking}
                voiceRecognitionAvailable={voice.recognitionAvailable}
                voiceCaptureEnabled={STANDALONE_ORB_VOICE_CAPTURE_ENABLED}
                voiceStatusText={pending ? 'Thinking…' : ''}
                transcriptReady={false}
                displayTranscript=""
                autoSend={false}
                onChange={setMessage}
                onSubmit={handleSubmit}
                onMicClick={() => undefined}
                onCancelListening={voice.cancelListening}
                onStopSpeaking={voice.cancelSpeaking}
                onSendTranscript={() => undefined}
                onRetryTranscript={() => undefined}
                onAddFiles={() => undefined}
                onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
                onPaste={() => undefined}
                onDrop={handleDrop}
                inputRef={inputRef}
                onAttachDocumentClick={() => setActivePanel('documents')}
                onToolsClick={() => setActivePanel('tools')}
                agentLabel="Ask ORB"
                onAgentSelectorClick={() => setAgentsOpen(true)}
                answering={pending}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
