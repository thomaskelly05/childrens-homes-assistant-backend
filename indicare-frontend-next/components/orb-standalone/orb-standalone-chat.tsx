'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

import { assistantErrorMessage, buildStandaloneAssistantContext, queryAssistant } from '@/lib/assistant-core/client'
import { safeOrbFailureCopy } from '@/lib/orb/errors/failure-copy'

type Message = { role: 'user' | 'assistant'; content: string }

export function OrbStandaloneChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setError(null)
    setMessages((current) => [...current, { role: 'user', content: text }])
    try {
      const data = await queryAssistant({
        message: text,
        mode: 'standalone',
        context: buildStandaloneAssistantContext({ conversationId: 'orb-standalone', activeSection: 'general_assistant' }),
        conversation_id: 'orb-standalone',
        project_id: 'orb-standalone'
      })
      setMessages((current) => [...current, { role: 'assistant', content: data.answer }])
    } catch (caught) {
      setError(assistantErrorMessage(caught))
      setMessages((current) => [...current, { role: 'assistant', content: safeOrbFailureCopy('ai_unavailable') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex min-h-[620px] flex-col rounded-[38px] border border-white/10 bg-white/8 text-white backdrop-blur">
      <div className="border-b border-white/10 p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Standalone, no OS access</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">ORB powered by IndiCare.</h2>
        {error ? <p className="mt-3 rounded-2xl bg-amber-200/10 px-4 py-3 text-sm text-amber-50">{error}</p> : null}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-5">
        {messages.length ? messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`max-w-[82%] rounded-[28px] px-5 py-4 text-sm leading-7 ${message.role === 'user' ? 'ml-auto bg-cyan-200 text-slate-950' : 'bg-white/10 text-slate-100'}`}>
            {message.content}
          </div>
        )) : <p className="text-sm leading-7 text-slate-400">Ask ORB about practice, policy, writing or planning.</p>}
      </div>
      <form className="p-4" onSubmit={(event) => { event.preventDefault(); void send() }}>
        <div className="flex gap-3 rounded-full border border-white/10 bg-black/20 p-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} className="min-h-12 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-500" placeholder="Message ORB..." />
          <button type="submit" disabled={loading} className="rounded-full bg-cyan-200 px-5 text-sm font-black text-slate-950 disabled:opacity-60">
            <Send className="mr-2 inline h-4 w-4" aria-hidden />
            {loading ? 'Sending' : 'Send'}
          </button>
        </div>
      </form>
    </section>
  )
}

