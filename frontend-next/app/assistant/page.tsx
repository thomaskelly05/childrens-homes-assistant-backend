'use client'

import { useEffect, useRef, useState } from 'react'

export default function AssistantPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello. I am IndiCare Intelligence. How can I help today?'
    }
  ])

  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/assistant/realtime/health`)
      .then(() => setConnected(true))
      .catch(() => setConnected(false))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return

    const next = input

    setMessages((current) => [
      ...current,
      { role: 'user', content: next }
    ])

    setInput('')
    setSpeaking(true)

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'The unified realtime assistant runtime is now connected and ready for operational intelligence integration.'
        }
      ])

      setSpeaking(false)
    }, 900)
  }

  async function toggleVoice() {
    setListening((value) => !value)
  }

  return (
    <main className="flex h-screen flex-col bg-[#0f172a] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-2xl font-black">IndiCare Intelligence</h1>
          <p className="text-sm text-slate-400">
            Unified conversational assistant runtime
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {connected ? 'Realtime connected' : 'Realtime unavailable'}
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-3xl px-5 py-4 text-[15px] leading-7 ${message.role === 'assistant' ? 'bg-slate-800 text-white' : 'ml-auto bg-emerald-500 text-slate-950'}`}
            >
              {message.content}
            </div>
          ))}

          {speaking ? (
            <div className="max-w-[160px] rounded-3xl bg-slate-800 px-5 py-4 text-sm text-slate-300">
              IndiCare is responding...
            </div>
          ) : null}

          <div ref={endRef} />
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-3xl border border-white/10 bg-slate-900 p-4">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message IndiCare..."
            className="max-h-40 min-h-[56px] flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-slate-500"
          />

          <button
            onClick={toggleVoice}
            className={`rounded-2xl px-4 py-3 text-sm font-black ${listening ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200'}`}
          >
            {listening ? 'Stop voice' : 'Voice'}
          </button>

          <button
            onClick={sendMessage}
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950"
          >
            Send
          </button>
        </div>
      </footer>
    </main>
  )
}
