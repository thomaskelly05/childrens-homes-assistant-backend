'use client'

import { FormEvent, useRef, useState } from 'react'
import {
  BookOpen,
  Brain,
  ChevronDown,
  Clock3,
  Folder,
  Mic,
  PanelLeft,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

import {
  parseStandaloneOrbSendError,
  queryStandaloneOrbConversation,
  type StandaloneOrbCitation
} from '@/lib/orb/standalone-client'

type OrbMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: 'sending' | 'complete' | 'error'
  citations?: StandaloneOrbCitation[]
}

const modeChips = ['Ask ORB', 'Reflect', 'Ofsted Lens', 'Record properly', 'Safeguarding']
const starterPrompts = [
  'Help me think through an allegation safely',
  'Rewrite this record in child-centred language',
  'What would Ofsted look for in this evidence?',
  'Help me reflect after a difficult shift'
]
const sidebarItems = [
  { label: 'Today', icon: Clock3 },
  { label: 'Residential guidance', icon: BookOpen },
  { label: 'Ofsted preparation', icon: ShieldCheck },
  { label: 'Reflective practice', icon: Brain },
  { label: 'Projects & folders', icon: Folder }
]

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function OrbMinimalChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<OrbMessage[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState('Ask ORB')
  const conversationIdRef = useRef<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || pending) return

    setInput('')
    setPending(true)
    setError(null)

    const userMessage: OrbMessage = { id: createId('user'), role: 'user', content: text, status: 'complete' }
    const assistantId = createId('assistant')
    const thinkingMessage: OrbMessage = { id: assistantId, role: 'assistant', content: 'ORB is thinking...', status: 'sending' }
    const history = messages
      .filter((message) => message.status !== 'sending' && message.status !== 'error')
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }))

    setMessages((current) => [...current, userMessage, thinkingMessage])

    try {
      console.info('[orb-minimal-chat] sending conversation request')
      const response = await queryStandaloneOrbConversation({
        message: text,
        mode: activeMode,
        conversation_id: conversationIdRef.current,
        history,
        detail: 'balanced'
      })
      conversationIdRef.current = response.conversation_id || conversationIdRef.current
      const citations = response.citations?.length ? response.citations : response.sources
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { id: assistantId, role: 'assistant', content: response.answer?.trim() || 'ORB returned an empty response.', status: 'complete', citations }
            : message
        )
      )
    } catch (caught) {
      const parsed = parseStandaloneOrbSendError(caught)
      setError(parsed.message)
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { id: assistantId, role: 'assistant', content: parsed.message, status: 'error' }
            : message
        )
      )
    } finally {
      setPending(false)
    }
  }

  function usePrompt(prompt: string) {
    setInput(prompt)
  }

  return (
    <main className="flex min-h-screen bg-[#05060b] text-slate-100">
      <aside className="hidden w-[292px] shrink-0 flex-col border-r border-white/10 bg-[#090b12]/95 p-3 lg:flex">
        <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(103,232,249,0.38)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">ORB</p>
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">Powered by IndiCare</p>
          </div>
        </div>

        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.1]">
          <Plus className="h-4 w-4" aria-hidden />
          New chat
        </button>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-slate-300">
          <Search className="h-4 w-4 text-slate-500" aria-hidden />
          <span>Search conversations</span>
        </div>

        <nav className="mt-5 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.label} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
                <Icon className="h-4 w-4 text-cyan-200/70" aria-hidden />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Residential brain</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">General ChatGPT-style intelligence with safeguarding, therapeutic and Ofsted cognition when needed.</p>
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#05060b]/85 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] lg:hidden" aria-label="Open sidebar">
                <PanelLeft className="h-5 w-5" aria-hidden />
              </button>
              <div>
                <button className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
                  ORB Standalone
                  <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
                </button>
                <p className="hidden text-xs font-semibold text-slate-400 sm:block">Residential children’s homes copilot · text-first · no passive microphone</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200 sm:inline-flex">Chat ready</span>
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]" aria-label="Settings">
                <Settings className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_55%)]" />

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-36 pt-6 sm:px-6">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {modeChips.map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                  activeMode === mode
                    ? 'border-cyan-300/40 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.28)]'
                    : 'border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-5">
            {messages.length === 0 ? (
              <div className="mx-auto mt-8 max-w-3xl text-center sm:mt-16">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-cyan-300 text-slate-950 shadow-[0_0_50px_rgba(103,232,249,0.38)]">
                  <Sparkles className="h-8 w-8" aria-hidden />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Quiet until needed. Bold when it matters.</p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">How can ORB help?</h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">Ask anything, or switch into a specialist residential mode for safeguarding, Ofsted, recording, reflection or therapeutic guidance.</p>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => usePrompt(prompt)}
                      className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 text-left text-sm font-bold leading-6 text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.08]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] rounded-[1.75rem] px-5 py-4 text-sm leading-7 shadow-sm sm:max-w-[82%] ${
                    message.role === 'user'
                      ? 'bg-cyan-200 text-slate-950'
                      : message.status === 'error'
                        ? 'border border-red-400/30 bg-red-500/10 text-red-100'
                        : 'border border-white/10 bg-white/[0.065] text-slate-100'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
                    {message.role === 'user' ? 'You' : 'ORB'}
                    {message.status === 'sending' ? <span className="text-cyan-200">thinking</span> : null}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.citations?.length ? (
                    <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs text-slate-300">
                      <p className="font-black uppercase tracking-[0.18em] text-cyan-200">Sources / basis</p>
                      {message.citations.slice(0, 5).map((source, index) => (
                        <div key={`${source.label}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                          {source.label || source.type || 'Source'}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        {error ? <p className="fixed inset-x-4 bottom-28 z-30 mx-auto max-w-4xl rounded-2xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-2xl">{error}</p> : null}

        <form onSubmit={handleSubmit} className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#05060b]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:left-[292px]">
          <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-2 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-end gap-2">
              <button type="button" disabled className="hidden h-11 w-11 items-center justify-center rounded-2xl text-slate-500 sm:flex" aria-label="Attach files coming soon">
                <Paperclip className="h-5 w-5" aria-hidden />
              </button>
              <label htmlFor="orb-minimal-message" className="sr-only">Message ORB</label>
              <textarea
                id="orb-minimal-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                rows={1}
                placeholder={`Message ORB in ${activeMode}...`}
                className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-base font-semibold text-white outline-none placeholder:text-slate-500"
              />
              <button type="button" disabled className="hidden h-11 w-11 items-center justify-center rounded-2xl text-slate-500 sm:flex" aria-label="Voice is push-to-talk only and coming later">
                <Mic className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-bold text-slate-500">
              <span>Shift+Enter for a new line</span>
              <span>No passive listening · text-first runtime</span>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}
