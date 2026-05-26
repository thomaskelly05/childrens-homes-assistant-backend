'use client'

import { FormEvent, useRef, useState } from 'react'
import { Send } from 'lucide-react'

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

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function OrbMinimalChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<OrbMessage[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        mode: 'Ask ORB',
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

  return (
    <main className="flex min-h-screen flex-col bg-[#05070d] text-slate-100">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">ORB powered by IndiCare</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Minimal chat baseline</h1>
          </div>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">Text only</span>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="flex-1 space-y-4 pb-32">
          {messages.length === 0 ? (
            <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-sm font-bold text-cyan-200">Start with one message.</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Ask ORB a question.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">This baseline removes panels, voice and extra runtime code so we can prove chat works.</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-[1.75rem] px-5 py-4 text-sm leading-7 ${
                message.role === 'user'
                  ? 'ml-auto max-w-[85%] bg-cyan-100 text-slate-950'
                  : message.status === 'error'
                    ? 'mr-auto max-w-[92%] border border-red-400/30 bg-red-500/10 text-red-100'
                    : 'mr-auto max-w-[92%] border border-white/10 bg-white/[0.06] text-slate-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.citations?.length ? (
                <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs text-slate-300">
                  <p className="font-black uppercase tracking-[0.18em] text-cyan-200">Sources</p>
                  {message.citations.slice(0, 5).map((source, index) => (
                    <div key={`${source.label}-${index}`} className="rounded-2xl bg-black/20 px-3 py-2">
                      {source.label || source.type || 'Source'}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {error ? <p className="fixed inset-x-4 bottom-28 mx-auto max-w-4xl rounded-2xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm text-red-100">{error}</p> : null}

        <form onSubmit={handleSubmit} className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#05070d]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-3">
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
              placeholder="Message ORB..."
              className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 text-base font-semibold text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
