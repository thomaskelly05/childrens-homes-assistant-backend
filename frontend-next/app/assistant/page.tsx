'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  ChevronDown,
  Database,
  FileAudio,
  FileText,
  FolderKanban,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Radio,
  Send,
  Settings,
  ShieldAlert,
  Users,
  Video,
  Volume2,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AssistantStatusBar } from '@/components/assistant/assistant-status-bar'
import { AssistantWaveform } from '@/components/assistant/assistant-waveform'
import { OrbButton } from '@/components/indicare/orb/orb-button'
import { SourceCitationChip } from '@/components/indicare/citations/source-citation-chip'

import { assistantWorkspaceAdapters } from '@/lib/assistant-workspace/adapters'
import type {
  AssistantAppId,
  CallSession,
  MagicNote,
  ProductivityTask,
  VoiceSession
} from '@/lib/assistant-workspace/types'
import {
  assistantRuntime,
  AssistantMessage,
  RuntimeState
} from '@/lib/realtime/assistant-runtime'
import { useAssistantConversations } from '@/hooks/use-assistant-conversations'
import { useAuth } from '@/contexts/auth-context'
import { citationHref } from '@/lib/assistant-core/citations'
import { assistantErrorMessage, buildStandaloneAssistantContext, queryAssistant } from '@/lib/assistant-core/client'
import { suggestedPromptsForWorkspace } from '@/lib/assistant-core/retrieval'
import type { AssistantMode, AssistantQueryData } from '@/lib/assistant-core/types'

type WorkspaceSection = AssistantAppId | 'adults' | 'settings'

const appIconMap: Record<AssistantAppId, LucideIcon> = {
  chat: Bot,
  chronology: CalendarDays,
  reports: FileText,
  reg44: ClipboardList,
  reg45: BriefcaseBusiness,
  lac_review: Users,
  ofsted: ShieldAlert,
  actions: CheckSquare,
  evidence: Database,
  documents: FileText,
  projects: FolderKanban,
  notes: FileAudio,
  voice: Radio,
  calls: Phone
}

const sidebarItems: Array<{
  id: WorkspaceSection
  label: string
  icon: LucideIcon
}> = [
  { id: 'chat', label: 'New chat', icon: Plus },
  { id: 'chat', label: 'Conversations', icon: Bot },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'notes', label: 'Magic Notes', icon: FileAudio },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'adults', label: 'Adults / Staff profiles', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings }
]

const suggestedPrompts = suggestedPromptsForWorkspace('standalone_assistant', 'standalone')

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function sectionLabel(section: WorkspaceSection) {
  if (section === 'adults') return 'Adults / Staff'
  if (section === 'settings') return 'Settings'
  if (section === 'lac_review') return 'LAC Review'
  return section.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function messageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function modeForSection(section: WorkspaceSection): AssistantMode {
  if (section === 'chronology') return 'chronology_qna'
  if (section === 'actions') return 'shift_operations'
  if (section === 'reg44') return 'reg44_action_plan'
  if (section === 'reg45') return 'reg45_writer'
  if (section === 'lac_review') return 'lac_review_writer'
  if (section === 'ofsted') return 'ofsted_evidence_pack'
  if (section === 'reports') return 'report_writer'
  if (section === 'evidence' || section === 'documents') return 'regulatory_readiness'
  return 'standalone'
}

export default function AssistantPage() {
  const { status, user } = useAuth()
  const workspace = useMemo(() => assistantWorkspaceAdapters.getWorkspaceData(), [])
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('chat')
  const [magicNote, setMagicNote] = useState<MagicNote>(workspace.magicNotes[0])
  const [voiceSession, setVoiceSession] = useState<VoiceSession>(workspace.voiceSession)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    connected: false,
    listening: false,
    speaking: false,
    streaming: false,
    wakeWordEnabled: false,
    realtimeVoiceConnected: false
  })
  const [lastAssistantData, setLastAssistantData] = useState<AssistantQueryData | null>(null)
  const [assistantError, setAssistantError] = useState<string | null>(null)

  const [input, setInput] = useState('')

  const {
    conversations,
    activeConversation,
    activeConversationId,
    loading,
    error,
    createConversation,
    selectConversation,
    saveConversation
  } = useAssistantConversations()

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    assistantRuntime.connect()

    const unsubscribeState = assistantRuntime.onState(setRuntimeState)

    const unsubscribeMessages = assistantRuntime.onMessages((nextMessages) => {
      setMessages(nextMessages)

      if (activeConversationId) {
        void saveConversation(activeConversationId, nextMessages).catch(() => undefined)
      }
    })

    return () => {
      unsubscribeState()
      unsubscribeMessages()
    }
  }, [activeConversationId, saveConversation])

  useEffect(() => {
    if (activeConversation?.messages?.length) {
      setMessages(activeConversation.messages)
      assistantRuntime.loadMessages(activeConversation.messages)
    }
  }, [activeConversation])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(messageOverride?: string) {
    const value = (messageOverride || input).trim()

    if (!value || runtimeState.streaming) return
    if (status === 'loading') {
      setAssistantError('Your session is still loading. Please try again in a moment.')
      return
    }
    if (status === 'unauthenticated') {
      setAssistantError('Your session has expired. Please sign in again before using the assistant.')
      return
    }

    setInput('')
    setAssistantError(null)

    const userMessage: AssistantMessage = {
      id: messageId(),
      role: 'user',
      content: value,
      createdAt: new Date().toISOString()
    }
    const assistantMessage: AssistantMessage = {
      id: messageId(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true
    }
    const pendingMessages = [...messages, userMessage, assistantMessage]
    setMessages(pendingMessages)
    setRuntimeState((current) => ({ ...current, streaming: true, speaking: true, error: undefined }))

    try {
      const mode = modeForSection(activeSection)
      const data = await queryAssistant({
        message: value,
        mode,
        context: buildStandaloneAssistantContext({
          activeSection,
          conversationId: activeConversationId
        }),
        conversation_id: activeConversationId || undefined
      })
      setLastAssistantData(data)
      const nextMessages = pendingMessages.map((message) => (
        message.id === assistantMessage.id
          ? { ...message, content: data.answer, streaming: false }
          : message
      ))
      setMessages(nextMessages)
      if (activeConversationId) {
        await saveConversation(activeConversationId, nextMessages)
      }
    } catch (error) {
      const message = assistantErrorMessage(error)
      setAssistantError(message)
      const nextMessages = pendingMessages.map((item) => (
        item.id === assistantMessage.id
          ? {
              ...item,
              content: `The live assistant endpoint is unavailable or returned an error: ${message}\n\nNo record-specific answer has been generated. Try again after checking your connection or permissions.`,
              streaming: false
            }
          : item
      ))
      setMessages(nextMessages)
      if (activeConversationId) {
        await saveConversation(activeConversationId, nextMessages)
      }
    } finally {
      setRuntimeState((current) => ({ ...current, streaming: false, speaking: false }))
    }
  }

  async function handleCreateConversation() {
    await createConversation()
    setMessages([])
    setLastAssistantData(null)
    setAssistantError(null)
    assistantRuntime.resetConversation()
    setActiveSection('chat')
  }

  async function handleMagicRecording() {
    setMagicNote(await assistantWorkspaceAdapters.magicNotes.createFromRecording())
    setActiveSection('notes')
  }

  async function handleMagicUpload() {
    setMagicNote(await assistantWorkspaceAdapters.magicNotes.createFromUpload('uploaded-care-audio.wav'))
    setActiveSection('notes')
  }

  async function handleStartVoice() {
    setVoiceSession(await assistantWorkspaceAdapters.voiceSessions.startListening())
    assistantRuntime.toggleListening()
    setActiveSection('voice')
  }

  async function handleCancelVoice() {
    setVoiceSession(await assistantWorkspaceAdapters.voiceSessions.cancel())
    assistantRuntime.interrupt()
  }

  const orbAssistantContext = buildStandaloneAssistantContext({
    activeSection,
    conversationId: activeConversationId
  })

  return (
    <main className="flex min-h-screen overflow-hidden bg-[#070b16] text-white">
      <StandaloneSidebar
        activeSection={activeSection}
        conversations={conversations}
        loading={loading}
        onCreateConversation={handleCreateConversation}
        onSelectConversation={(id) => {
          selectConversation(id)
          setActiveSection('chat')
        }}
        onSelectSection={setActiveSection}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 bg-[#0b1020]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-slate-200 transition hover:bg-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 text-xs text-slate-950">IC</span>
              IndiCare OS
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-black tracking-[-0.05em]">IndiCare Assistant</h1>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Standalone workspace
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">ChatGPT-style assistant for children&apos;s homes, separate from the compact OS right-hand assistant.</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {(runtimeState.listening || runtimeState.speaking) ? <AssistantWaveform active /> : null}
              <AssistantStatusBar
                connected={runtimeState.connected}
                listening={runtimeState.listening}
                speaking={runtimeState.speaking}
                streaming={runtimeState.streaming}
                error={runtimeState.error}
              />
              <button className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200 xl:inline-flex">
                Oak House
                <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <nav aria-label="Assistant apps" className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {workspace.apps.map((app) => {
              const Icon = appIconMap[app.id]
              const active = activeSection === app.id

              return (
                <button
                  key={app.id}
                  onClick={() => setActiveSection(app.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    active
                      ? 'border-emerald-300/60 bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.28)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {app.label}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${active ? 'bg-slate-950/10 text-slate-800' : 'bg-white/10 text-slate-400'}`}>
                    {app.status}
                  </span>
                </button>
              )
            })}
          </nav>
        </header>

        <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <WorkspaceHero activeSection={activeSection} />

                {activeSection === 'chat' ? (
                  <ChatWorkspace
                    messages={messages}
                    runtimeState={runtimeState}
                    suggestedPrompts={suggestedPrompts}
                    assistantData={lastAssistantData}
                    assistantError={assistantError}
                    onPromptSelect={sendMessage}
                    endRef={endRef}
                  />
                ) : null}

                {activeSection === 'projects' ? (
                  <ProjectsWorkspace projects={workspace.projects} />
                ) : null}

                {activeSection === 'notes' ? (
                  <MagicNotesWorkspace
                    magicNote={magicNote}
                    onStartRecording={handleMagicRecording}
                    onUploadAudio={handleMagicUpload}
                  />
                ) : null}

                {activeSection === 'voice' ? (
                  <VoiceWorkspace
                    voiceSession={voiceSession}
                    runtimeState={runtimeState}
                    onStartListening={handleStartVoice}
                    onCancel={handleCancelVoice}
                  />
                ) : null}

                {activeSection === 'calls' ? (
                  <CallsWorkspace calls={workspace.calls} />
                ) : null}

                {['chronology', 'reports', 'reg44', 'reg45', 'lac_review', 'ofsted', 'actions', 'evidence', 'documents'].includes(activeSection) ? (
                  <ProductivityWorkspace tasks={workspace.productivityTasks} activeSection={activeSection} />
                ) : null}

                {activeSection === 'adults' ? (
                  <AdultProfilesWorkspace profiles={workspace.adultProfiles} />
                ) : null}

                {activeSection === 'settings' ? (
                  <SettingsWorkspace />
                ) : null}

                {error ? (
                  <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
                    Conversation persistence warning: {error}
                  </div>
                ) : null}
              </div>
            </div>

            <Composer
              input={input}
              runtimeState={runtimeState}
              onInput={setInput}
              onSend={() => sendMessage()}
              onVoice={handleStartVoice}
              onInterrupt={() => assistantRuntime.interrupt()}
            />
          </section>

          <ContextPanel
            context={workspace.careContext}
            magicNote={magicNote}
            activeSection={activeSection}
            assistantData={lastAssistantData}
            assistantError={assistantError}
          />
        </div>
      </section>
      <OrbButton
        context={{
          route: '/assistant',
          workspace: activeSection,
          page_title: 'IndiCare Assistant',
          assistant_context: orbAssistantContext
        }}
        role={user?.role}
      />
    </main>
  )
}

function StandaloneSidebar({
  activeSection,
  conversations,
  loading,
  onCreateConversation,
  onSelectConversation,
  onSelectSection
}: {
  activeSection: WorkspaceSection
  conversations: Array<{ id: string; title: string; updatedAt?: string }>
  loading: boolean
  onCreateConversation: () => void
  onSelectConversation: (id: string) => void
  onSelectSection: (section: WorkspaceSection) => void
}) {
  return (
    <aside className="hidden w-[310px] shrink-0 border-r border-white/10 bg-[#090e1b] p-4 lg:flex lg:flex-col">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-slate-950">AI</div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Product switcher</p>
            <h2 className="text-lg font-black tracking-[-0.04em]">Assistant</h2>
          </div>
        </div>

        <button
          onClick={onCreateConversation}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.26)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New chat
        </button>
      </div>

      <nav aria-label="Assistant workspace navigation" className="mt-4 space-y-1">
        {sidebarItems.map((item, index) => {
          const Icon = item.icon
          const active = activeSection === item.id

          return (
            <button
              key={`${item.label}-${index}`}
              onClick={() => item.label === 'New chat' ? onCreateConversation() : onSelectSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                active ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Conversations</p>
          {loading ? <span className="text-[11px] text-slate-500">Loading</span> : null}
        </div>

        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-slate-300 transition hover:border-white/10 hover:bg-white/10 hover:text-white"
            >
              <p className="truncate text-sm font-black">{conversation.title}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                {conversation.updatedAt ? formatDateLabel(conversation.updatedAt) : 'Not saved yet'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

function WorkspaceHero({ activeSection }: { activeSection: WorkspaceSection }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.10] to-white/[0.03] p-6 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">IndiCare Assistant</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.06em]">ChatGPT for children&apos;s homes</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
            Standalone assistant workspace for conversations, projects, Magic Notes, voice foundations, calls, productivity and care-specific workflows.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-300/20 bg-blue-300/10 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">Current app</p>
          <p className="mt-1 text-lg font-black">{sectionLabel(activeSection)}</p>
        </div>
      </div>
    </section>
  )
}

function ChatWorkspace({
  messages,
  runtimeState,
  suggestedPrompts,
  assistantData,
  assistantError,
  onPromptSelect,
  endRef
}: {
  messages: AssistantMessage[]
  runtimeState: RuntimeState
  suggestedPrompts: string[]
  assistantData: AssistantQueryData | null
  assistantError: string | null
  onPromptSelect: (prompt: string) => void
  endRef: RefObject<HTMLDivElement | null>
}) {
  const visibleMessages = messages.length ? messages : [
    {
      id: 'empty-assistant-welcome',
      role: 'assistant' as const,
      content: 'Hello. I am the standalone IndiCare Assistant. Ask about care records, shift handovers, risks, reports, projects or Magic Notes foundations.',
      createdAt: new Date().toISOString()
    }
  ]

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#0d1324] p-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Chat</p>
          <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Conversation thread</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-slate-300">
          Model: IndiCare OS assistant core · {runtimeState.streaming ? 'retrieving OS evidence' : 'ready'}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[88%] rounded-[28px] px-6 py-5 text-[15px] leading-8 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${
              message.role === 'assistant' ? 'bg-white/[0.08] text-white' : 'ml-auto bg-emerald-300 text-slate-950'
            }`}
          >
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] opacity-60">
              {message.role === 'assistant' ? 'IndiCare' : 'You'}
            </div>
            <div className="whitespace-pre-wrap">
              {message.content}
              {message.streaming ? <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-full bg-emerald-300 align-middle" /> : null}
            </div>
          </div>
        ))}

        {runtimeState.listening ? (
          <div className="max-w-[320px] rounded-[28px] border border-emerald-400/30 bg-emerald-400/10 px-6 py-5 text-sm text-emerald-200">
            Listening placeholder is active. Browser speech support may vary; live clinical voice is not claimed in this foundation.
          </div>
        ) : null}

        {assistantError ? (
          <div className="rounded-[24px] border border-red-300/30 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-100">
            {assistantError}
          </div>
        ) : null}

        {assistantData?.review_required ? (
          <div className="rounded-[24px] border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm leading-6 text-amber-100">
            Review required: assistant outputs are draft operational support and must be checked by an adult/manager before use.
          </div>
        ) : null}

        {assistantData?.citations?.length ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Citations used</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {assistantData.citations.map((citation, index) => (
                <SourceCitationChip
                  key={`${citation.source_type}-${citation.source_id}-${index}`}
                  label={citation.label}
                  href={citationHref(citation)}
                  sourceType={citation.source_type}
                  sourceId={citation.source_id}
                  sourceDate={citation.date || undefined}
                  staffName={citation.staff_name || undefined}
                  youngPersonName={citation.young_person_name || undefined}
                  confidence={citation.confidence}
                  excerpt={citation.excerpt}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptSelect(prompt)}
            className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm font-bold leading-6 text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  )
}

function Composer({
  input,
  runtimeState,
  onInput,
  onSend,
  onVoice,
  onInterrupt
}: {
  input: string
  runtimeState: RuntimeState
  onInput: (value: string) => void
  onSend: () => void
  onVoice: () => void
  onInterrupt: () => void
}) {
  return (
    <footer className="border-t border-white/10 bg-[#090e1b]/95 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-end gap-3 rounded-[30px] border border-white/10 bg-[#121a2f] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          disabled
          title="File attachments are coming soon. Use the Documents workspace for uploads."
          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-500 opacity-70"
          aria-label="File attachments coming soon"
        >
          <Paperclip className="h-5 w-5" aria-hidden />
        </button>
        <textarea
          value={input}
          disabled={runtimeState.streaming}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSend()
            }
          }}
          placeholder="Message IndiCare, attach care context, or ask for a draft..."
          className="max-h-48 min-h-[58px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-7 outline-none placeholder:text-slate-500"
        />
        <button
          onClick={onVoice}
          className={`rounded-2xl px-4 py-3 text-sm font-black transition ${runtimeState.listening ? 'bg-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.5)]' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
        >
          <Mic className="mr-2 inline h-4 w-4" aria-hidden />
          {runtimeState.listening ? 'Stop' : 'Voice'}
        </button>
        {runtimeState.streaming ? (
          <button onClick={onInterrupt} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">
            Interrupt
          </button>
        ) : (
          <button onClick={onSend} className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)]">
            <Send className="mr-2 inline h-4 w-4" aria-hidden />
            Send
          </button>
        )}
      </div>
    </footer>
  )
}

function ProjectsWorkspace({ projects }: { projects: ReturnType<typeof assistantWorkspaceAdapters.getWorkspaceData>['projects'] }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {projects.map((project) => (
        <article key={project.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Project</p>
          <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">{project.name}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">{project.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {project.appIds.map((appId) => (
              <span key={appId} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">{appId}</span>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}

function MagicNotesWorkspace({
  magicNote,
  onStartRecording,
  onUploadAudio
}: {
  magicNote: MagicNote
  onStartRecording: () => void
  onUploadAudio: () => void
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Magic Notes</p>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">Recording and transcription foundation</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">Deterministic placeholder workflow for recording, audio upload, transcript, summary, care note draft, actions, flags and exports.</p>
        <div className="mt-5 space-y-3">
          <button onClick={onStartRecording} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950">
            <Mic className="h-4 w-4" aria-hidden />
            Start recording placeholder
          </button>
          <button onClick={onUploadAudio} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200">
            <FileAudio className="h-4 w-4" aria-hidden />
            Upload audio placeholder
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
          No speech backend is connected here. The transcript and AI outputs are deterministic demo data.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MagicNoteCard title="Transcript panel" content={magicNote.transcript} />
        <MagicNoteCard title="AI summary" content={magicNote.aiSummary} />
        <MagicNoteCard title="Care note draft" content={magicNote.careNoteDraft} />
        <ListCard title="Actions extracted" items={magicNote.actionsExtracted} />
        <ListCard title="Safeguarding / risk flags" items={magicNote.safeguardingRiskFlags} tone="risk" />
        <ListCard title="Export destinations" items={magicNote.exportTargets.map((target) => target.replace('-', ' '))} />
      </div>
    </section>
  )
}

function VoiceWorkspace({
  voiceSession,
  runtimeState,
  onStartListening,
  onCancel
}: {
  voiceSession: VoiceSession
  runtimeState: RuntimeState
  onStartListening: () => void
  onCancel: () => void
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Voice mode</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.05em]">&quot;Hey IndiCare&quot;</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Visible voice assistant concept with listening, speaking, interruption and transcript placeholders. Realtime clinical voice is not implemented in this foundation.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-300">
            {runtimeState.listening || voiceSession.mode === 'listening' ? 'Listening placeholder' : voiceSession.mode}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={onStartListening} className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950">
            <Mic className="mr-2 inline h-4 w-4" aria-hidden />
            Start listening placeholder
          </button>
          <button
            type="button"
            disabled
            title="Speaking state preview is coming soon. Use Start listening or the Orb button."
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-slate-400 opacity-70"
          >
            <Volume2 className="mr-2 inline h-4 w-4" aria-hidden />
            Speaking preview coming soon
          </button>
          <button onClick={onCancel} className="rounded-2xl border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-black text-red-100">
            <X className="mr-2 inline h-4 w-4" aria-hidden />
            Interrupt / cancel
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-[#0d1324] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Transcript stream placeholder</p>
          <div className="mt-4 space-y-3">
            {voiceSession.transcriptStream.map((line) => (
              <div key={line} className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">{line}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Adapter readiness</p>
        <ListCard title="Voice adapters" items={[
          `Speech-to-text: ${voiceSession.adapters.speechToText}`,
          `Text-to-speech: ${voiceSession.adapters.textToSpeech}`,
          `Realtime voice: ${voiceSession.adapters.realtimeVoice}`,
          `Wake word: ${voiceSession.adapters.wakeWord}`
        ]} />
      </div>
    </section>
  )
}

function CallsWorkspace({ calls }: { calls: CallSession[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {calls.map((call) => (
        <article key={call.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">{call.callType.replace('-', ' ')}</p>
            {call.videoEnabled ? <Video className="h-5 w-5 text-blue-300" aria-hidden /> : <Phone className="h-5 w-5 text-slate-400" aria-hidden />}
          </div>
          <h3 className="mt-3 text-xl font-black tracking-[-0.04em]">{call.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">Video call placeholder, meeting notes integration and action extraction foundation.</p>
          <ListCard title="Participants" items={call.participants} />
          <ListCard title="Actions extracted" items={call.actionsExtracted} />
        </article>
      ))}
    </section>
  )
}

function ProductivityWorkspace({
  tasks,
  activeSection
}: {
  tasks: ProductivityTask[]
  activeSection: WorkspaceSection
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/5 p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Productivity foundation</p>
      <h3 className="mt-3 text-3xl font-black tracking-[-0.05em]">{sectionLabel(activeSection)} workspace</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">Teams and Outlook-style concepts for messages, calendar, tasks, meetings, contacts, documents and care records.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-2xl border border-white/10 bg-[#0d1324] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">{task.title}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">{task.area} · {task.dueLabel}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">{task.status}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Owner: {task.owner}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function AdultProfilesWorkspace({
  profiles
}: {
  profiles: ReturnType<typeof assistantWorkspaceAdapters.getWorkspaceData>['adultProfiles']
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {profiles.map((profile) => (
        <article key={profile.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">{profile.profileType}</p>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">{profile.name}</h3>
          <p className="mt-2 text-sm font-bold text-slate-300">{profile.role}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ListCard title="Permissions" items={profile.permissions} />
            <ListCard title="Conversations" items={profile.conversations} />
            <ListCard title="Notes" items={profile.notes} />
            <ListCard title="Tasks" items={profile.tasks} />
            <ListCard title="Meetings" items={profile.meetings} />
            <ListCard title="Documents" items={profile.documents} />
          </div>
          <ListCard title="Audit / activity" items={profile.auditActivity} />
        </article>
      ))}
    </section>
  )
}

function SettingsWorkspace() {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/5 p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Assistant settings</p>
      <h3 className="mt-3 text-3xl font-black tracking-[-0.05em]">Adapter and product settings foundation</h3>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {['Conversations adapter', 'Projects adapter', 'Magic Notes adapter', 'Voice sessions adapter', 'Calls adapter', 'Wake word adapter'].map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-[#0d1324] p-4">
            <p className="text-sm font-black">{item}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Mock boundary ready for a backend implementation.</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ContextPanel({
  context,
  magicNote,
  activeSection,
  assistantData,
  assistantError
}: {
  context: ReturnType<typeof assistantWorkspaceAdapters.getWorkspaceData>['careContext']
  magicNote: MagicNote
  activeSection: WorkspaceSection
  assistantData: AssistantQueryData | null
  assistantError: string | null
}) {
  return (
    <aside className="hidden border-l border-white/10 bg-[#090e1b] p-5 xl:block">
      <div className="sticky top-5 space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Care context</p>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">{context.selectedHome}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">{context.currentContext}</p>
          <div className="mt-5 space-y-3 text-sm">
            <ContextLine label="Young person" value={context.linkedYoungPerson} />
            <ContextLine label="Adult / staff" value={context.linkedAdultProfile} />
            <ContextLine label="Active app" value={sectionLabel(activeSection)} />
          </div>
        </div>

        <ListCard title="Recent notes" items={context.recentNotes} />
        <ListCard title="Safety / compliance reminders" items={context.safetyReminders} tone="risk" />

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Citations panel</p>
          {assistantData?.citations?.length ? (
            <div className="mt-3 space-y-3">
              {assistantData.citations.slice(0, 6).map((citation, index) => (
                <SourceCitationChip
                  key={`${citation.source_type}-${citation.source_id}-${index}`}
                  label={citation.label}
                  href={citationHref(citation)}
                  sourceType={citation.source_type}
                  sourceId={citation.source_id}
                  sourceDate={citation.date || undefined}
                  staffName={citation.staff_name || undefined}
                  youngPersonName={citation.young_person_name || undefined}
                  confidence={citation.confidence}
                  excerpt={citation.excerpt}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {assistantError ? 'Citations unavailable while the backend is unavailable.' : 'Ask a record-specific question to populate citations.'}
            </p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Related records</p>
          {assistantData?.related_records?.length ? (
            <div className="mt-3 space-y-2">
              {assistantData.related_records.slice(0, 6).map((record) => (
                <Link key={`${record.source_type}-${record.source_id}`} href={record.route || '/assistant'} className="block rounded-2xl bg-[#0d1324] px-4 py-3 text-sm font-bold text-slate-200">
                  {record.title || `${record.source_type} ${record.source_id}`}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-400">No related records loaded yet.</p>
          )}
        </div>

        {assistantData?.suggested_actions?.length ? (
          <ListCard title="Suggested actions" items={assistantData.suggested_actions.slice(0, 6).map((action) => action.title)} />
        ) : null}

        {assistantData?.evidence_gaps?.length ? (
          <ListCard title="Evidence gaps" items={assistantData.evidence_gaps.slice(0, 6).map((gap) => gap.gap)} tone="risk" />
        ) : null}

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Linked Magic Note</p>
          <h4 className="mt-2 text-lg font-black">{magicNote.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">{magicNote.aiSummary}</p>
        </div>
      </div>
    </aside>
  )
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1324] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 font-bold leading-6 text-slate-200">{value}</p>
    </div>
  )
}

function MagicNoteCard({ title, content }: { title: string; content: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-[#0d1324] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{content}</p>
    </article>
  )
}

function ListCard({
  title,
  items,
  tone = 'default'
}: {
  title: string
  items: string[]
  tone?: 'default' | 'risk'
}) {
  return (
    <article className={`mt-4 rounded-[24px] border p-5 ${tone === 'risk' ? 'border-amber-300/20 bg-amber-300/10' : 'border-white/10 bg-white/5'}`}>
      <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${tone === 'risk' ? 'text-amber-200' : 'text-slate-500'}`}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
            {tone === 'risk' ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden /> : <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />}
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  )
}
